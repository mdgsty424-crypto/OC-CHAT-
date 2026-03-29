import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Camera, Mic, Send, Loader2, X, Play, Pause, Languages, Timer, BarChart2, MapPin, UserPlus, MoreHorizontal, Wallet, Bot } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Message } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

interface MessageInputProps {
  chatId: string;
  participants: string[];
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export default function MessageInput({ chatId, participants, replyingTo, onCancelReply }: MessageInputProps) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveforms, setWaveforms] = useState<number[]>([]);
  
  // Advanced Features State
  const [showMore, setShowMore] = useState(false);
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const [selfDestructTime, setSelfDestructTime] = useState<number | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showMoneyModal, setShowMoneyModal] = useState(false);
  const [moneyAmount, setMoneyAmount] = useState('');

  const sendMoney = async () => {
    if (!moneyAmount || isNaN(Number(moneyAmount))) return;
    
    const messageData: any = {
      chatId,
      senderId: user?.uid,
      text: `Sent ৳${moneyAmount}`,
      type: 'text', // For now, just send as text with a special prefix or we could add a 'payment' type
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      setShowMoneyModal(false);
      setMoneyAmount('');
      setShowMore(false);
    } catch (error) {
      console.error("Error sending money:", error);
    }
  };
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!user || !chatId) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [`typing.${user.uid}`]: isTyping
      });
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    updateTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000);
  };

  // AI Bot Logic
  const handleAIResponse = async (prompt: string) => {
    if (!process.env.GEMINI_API_KEY) return;
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are OC Chat AI, a professional and helpful assistant. Keep responses concise and friendly."
        }
      });

      if (response.text) {
        const aiMessage = {
          chatId,
          senderId: 'ai-bot',
          text: response.text,
          type: 'text',
          timestamp: new Date().toISOString(),
          status: 'sent'
        };
        await addDoc(collection(db, 'chats', chatId, 'messages'), aiMessage);
      }
    } catch (error) {
      console.error("AI Error:", error);
    }
  };

  // Voice Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      const updateWaveform = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setWaveforms(prev => [...prev.slice(-40), average]);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

    } catch (error) {
      console.error("Recording error:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleSendVoice = async () => {
    if (!audioBlob || !user) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice.webm');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload failed with status:", response.status, errorText);
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Simulated Voice-to-Text using Gemini
      let v2t = "";
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const aiRes = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: "Transcribe this voice message accurately.",
          config: { systemInstruction: "Transcribe only. No extra text." }
        });
        v2t = aiRes.text || "";
      }

      const messageData = {
        chatId,
        senderId: user.uid,
        type: 'voice',
        fileUrl: data.url,
        voiceToText: v2t,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      setAudioBlob(null);
      setWaveforms([]);
    } catch (error) {
      console.error("Voice upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      
      const messageData = {
        chatId,
        senderId: user.uid,
        text: '',
        fileUrl: data.url,
        fileType: data.resource_type,
        type: data.resource_type === 'image' ? 'image' : 'file',
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      const unreadUpdates: Record<string, any> = {
        lastMessage: data.resource_type === 'image' ? '📷 Photo' : '📁 File',
        lastMessageTime: new Date().toISOString()
      };

      const { increment } = await import('firebase/firestore');
      participants.forEach(pid => {
        if (pid !== user.uid) {
          unreadUpdates[`unreadCount.${pid}`] = increment(1);
        }
      });

      await updateDoc(doc(db, 'chats', chatId), unreadUpdates);

    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !user) return;

    const isAICommand = text.startsWith('@ai ');
    const prompt = isAICommand ? text.slice(4) : null;

    // Simulated Translation using Gemini
    let translated = "";
    if (isTranslationEnabled && process.env.GEMINI_API_KEY) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const aiRes = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate this to Bengali: ${text}`,
        config: { systemInstruction: "Translate only. No extra text." }
      });
      translated = aiRes.text || "";
    }

    const messageData: any = {
      chatId,
      senderId: user.uid,
      text: text.trim(),
      type: 'text',
      timestamp: new Date().toISOString(),
      status: 'sent',
      translatedText: translated,
      isSelfDestruct: selfDestructTime !== null,
      destructTime: selfDestructTime
    };

    if (replyingTo) {
      messageData.replyTo = replyingTo.id;
      onCancelReply?.();
    }

    setText('');
    setSelfDestructTime(null);

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      const unreadUpdates: Record<string, any> = {
        lastMessage: text.trim(),
        lastMessageTime: new Date().toISOString()
      };

      const { increment } = await import('firebase/firestore');
      participants.forEach(pid => {
        if (pid !== user.uid) {
          unreadUpdates[`unreadCount.${pid}`] = increment(1);
        }
      });

      await updateDoc(doc(db, 'chats', chatId), unreadUpdates);

      if (isAICommand && prompt) {
        handleAIResponse(prompt);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSendLocation = () => {
    if (!navigator.geolocation || !user) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const messageData = {
        chatId,
        senderId: user.uid,
        type: 'location',
        location: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          address: "Current Location"
        },
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      setShowMore(false);
    });
  };

  const handleSendPoll = async () => {
    if (!pollQuestion.trim() || !user) return;
    const messageData = {
      chatId,
      senderId: user.uid,
      type: 'poll',
      poll: {
        question: pollQuestion,
        options: pollOptions.filter(o => o.trim() !== '').map(o => ({ text: o, votes: [] })),
        multipleChoice: false
      },
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setShowMore(false);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 w-full p-3 bg-white border-t border-gray-100 z-50">
      <AnimatePresence>
        {replyingTo && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-between bg-gray-50 p-3 border-b border-gray-100 mb-2"
          >
            <div className="flex items-center gap-3 border-l-4 border-primary pl-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Replying to</span>
                <p className="text-xs text-muted truncate max-w-[200px]">{replyingTo.text || 'Media'}</p>
              </div>
            </div>
            <button onClick={onCancelReply} className="p-1.5 hover:bg-border/50 rounded-full transition-colors">
              <X size={16} className="text-muted" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Features Bar */}
      <AnimatePresence>
        {showMore && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="grid grid-cols-4 gap-4 p-4 bg-white border-b border-gray-100"
          >
            <button onClick={handleSendLocation} className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <MapPin size={22} />
              </div>
              <span className="text-[10px] font-bold text-muted uppercase">Location</span>
            </button>
            <button onClick={() => setShowPollModal(true)} className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart2 size={22} />
              </div>
              <span className="text-[10px] font-bold text-muted uppercase">Poll</span>
            </button>
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserPlus size={22} />
              </div>
              <span className="text-[10px] font-bold text-muted uppercase">Contact</span>
            </button>
            <button 
              onClick={() => setIsTranslationEnabled(!isTranslationEnabled)}
              className={cn("flex flex-col items-center gap-2 group", isTranslationEnabled && "text-primary")}
            >
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform", isTranslationEnabled ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
                <Languages size={22} />
              </div>
              <span className="text-[10px] font-bold text-muted uppercase">Translate</span>
            </button>
            <button 
              onClick={() => setShowMoneyModal(true)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet size={22} />
              </div>
              <span className="text-[10px] font-bold text-muted uppercase">Pay</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept="image/*,video/*,application/pdf"
        />
        
        {!isRecording && !audioBlob && text.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 mb-1"
          >
            <button 
              onClick={() => setShowMore(!showMore)}
              className={cn("p-2 rounded-full transition-all active:scale-90", showMore ? "bg-primary text-white" : "text-primary hover:bg-primary/10")}
            >
              <MoreHorizontal size={22} />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-primary hover:bg-primary/10 rounded-full transition-all active:scale-90"
            >
              <Camera size={22} />
            </button>
          </motion.div>
        )}

        <div className="flex-1 relative mb-1">
          {isRecording ? (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl py-2.5 px-4">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
              <div className="flex-1 flex items-end gap-[2px] h-6">
                {waveforms.map((h, i) => (
                  <div 
                    key={i} 
                    className="w-[2px] bg-primary rounded-full" 
                    style={{ height: `${Math.max(10, (h / 255) * 100)}%` }}
                  ></div>
                ))}
              </div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Recording</span>
            </div>
          ) : audioBlob ? (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl py-2 px-4">
              <button className="p-2 bg-primary text-white rounded-full">
                <Play size={16} fill="white" />
              </button>
              <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                <div className="w-1/2 h-full bg-primary"></div>
              </div>
              <button onClick={() => setAudioBlob(null)} className="p-1.5 text-muted hover:bg-border/50 rounded-full">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative flex items-center">
              <button 
                onClick={() => setSelfDestructTime(selfDestructTime === null ? 30 : null)}
                className={cn("absolute left-2 p-1.5 transition-colors", selfDestructTime !== null ? "text-primary" : "text-muted hover:text-primary")}
              >
                <Timer size={20} />
              </button>
              <textarea
                rows={1}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                  handleInputChange(e);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={text.startsWith('@ai') ? "Ask AI anything..." : "Type a message..."}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none max-h-32 text-sm leading-relaxed"
              />
            </div>
          )}
        </div>

        <div className="mb-1">
          {text.trim() || audioBlob ? (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={audioBlob ? handleSendVoice : handleSend}
              disabled={isUploading}
              className="p-3 bg-primary text-white rounded-full hover:opacity-90 transition-all active:scale-90 disabled:opacity-50 flex items-center justify-center ripple"
            >
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </motion.button>
          ) : (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={cn(
                "p-3 rounded-full transition-all active:scale-90 flex items-center justify-center",
                isRecording ? "bg-red-500 text-white scale-125" : "bg-primary text-white ripple"
              )}
            >
              <Mic size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Poll Modal */}
      <AnimatePresence>
        {showPollModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-xs border border-gray-100"
            >
              <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                <BarChart2 className="text-primary" />
                Create Poll
              </h3>
              <input 
                type="text" 
                placeholder="Question" 
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full bg-background border border-border rounded-2xl py-3 px-4 mb-4 font-bold"
              />
              <div className="space-y-3 mb-6">
                {pollOptions.map((opt, i) => (
                  <input 
                    key={i}
                    type="text" 
                    placeholder={`Option ${i + 1}`} 
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[i] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    className="w-full bg-background border border-border rounded-xl py-2 px-4 text-sm"
                  />
                ))}
                <button 
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  + Add Option
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPollModal(false)} className="flex-1 py-3 bg-border text-text rounded-2xl font-bold">Cancel</button>
                <button onClick={handleSendPoll} className="flex-1 py-3 bg-primary text-white rounded-2xl font-bold">Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Money Modal */}
      <AnimatePresence>
        {showMoneyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-sm border border-gray-100"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet size={32} />
                </div>
                <h3 className="text-xl font-black">SEND MONEY</h3>
                <p className="text-xs text-muted">Transfer funds instantly to this chat</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-2xl">৳</span>
                  <input 
                    type="number"
                    value={moneyAmount}
                    onChange={(e) => setMoneyAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-4 bg-background rounded-2xl text-2xl font-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowMoneyModal(false)}
                    className="flex-1 py-4 bg-background text-muted rounded-2xl font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={sendMoney}
                    className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black"
                  >
                    SEND NOW
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
