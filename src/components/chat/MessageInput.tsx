import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Camera, Mic, Send, Loader2, X, Play, Pause } from 'lucide-react';
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const data = await response.json();
      
      const messageData = {
        chatId,
        senderId: user.uid,
        type: 'voice',
        fileUrl: data.url,
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

    const messageData: any = {
      chatId,
      senderId: user.uid,
      text: text.trim(),
      type: 'text',
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    if (replyingTo) {
      messageData.replyTo = replyingTo.id;
      onCancelReply?.();
    }

    setText('');

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

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white/90 backdrop-blur-lg border-t border-border z-50">
      <AnimatePresence>
        {replyingTo && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-between bg-background p-3 rounded-t-2xl border-x border-t border-border mb-[-1px]"
          >
            <div className="flex items-center gap-3 border-l-4 border-primary pl-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Replying to</span>
                <p className="text-xs text-muted truncate max-w-[200px]">{replyingTo.text || 'Media'}</p>
              </div>
            </div>
            <button onClick={onCancelReply} className="p-1 hover:bg-border rounded-full">
              <X size={16} className="text-muted" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept="image/*,video/*,application/pdf"
        />
        
        {!isRecording && !audioBlob && (
          <div className="flex items-center gap-2">
            <button className="p-2 text-muted hover:text-primary transition-colors">
              <Smile size={22} />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-muted hover:text-primary transition-colors"
            >
              <Paperclip size={22} />
            </button>
          </div>
        )}

        <div className="flex-1 relative">
          {isRecording ? (
            <div className="flex items-center gap-2 bg-background border border-border rounded-2xl py-3 px-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <div className="flex-1 flex items-end gap-[2px] h-6">
                {waveforms.map((h, i) => (
                  <div 
                    key={i} 
                    className="w-[2px] bg-primary rounded-full" 
                    style={{ height: `${Math.max(10, (h / 255) * 100)}%` }}
                  ></div>
                ))}
              </div>
              <span className="text-xs font-mono text-muted">Recording...</span>
            </div>
          ) : audioBlob ? (
            <div className="flex items-center gap-3 bg-background border border-border rounded-2xl py-2 px-4">
              <button className="p-2 bg-primary text-white rounded-full">
                <Play size={16} fill="white" />
              </button>
              <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                <div className="w-1/2 h-full bg-primary"></div>
              </div>
              <button onClick={() => setAudioBlob(null)} className="p-1 text-muted">
                <X size={16} />
              </button>
            </div>
          ) : (
            <input
              type="text"
              value={text}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={text.startsWith('@ai') ? "Ask AI anything..." : "Type a message..."}
              className="w-full bg-background border border-border rounded-2xl py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          )}
        </div>

        {text.trim() || audioBlob ? (
          <button
            onClick={audioBlob ? handleSendVoice : handleSend}
            disabled={isUploading}
            className="p-3 bg-primary text-white rounded-full shadow-lg shadow-primary/30 hover:opacity-90 transition-all active:scale-90 disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        ) : (
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={cn(
              "p-3 rounded-full shadow-lg transition-all active:scale-90",
              isRecording ? "bg-red-500 text-white scale-125" : "bg-primary text-white shadow-primary/30"
            )}
          >
            <Mic size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
