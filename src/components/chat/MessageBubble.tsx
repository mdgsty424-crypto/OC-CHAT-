import React, { useState, useEffect } from 'react';
import { Message } from '../../types';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { Check, CheckCheck, Paperclip, Smile, Reply, Play, MoreVertical, Trash2, MapPin, UserPlus, BarChart2, Languages, Timer, FileText, Phone, Video } from 'lucide-react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onReply?: (message: Message) => void;
  onCall?: (type: 'audio' | 'video') => void;
  key?: string | number;
}

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function MessageBubble({ message, isMe, onReply, onCall }: MessageBubbleProps) {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showV2T, setShowV2T] = useState(false);
  const time = format(new Date(message.timestamp), 'HH:mm');

  // Self-destruct logic
  useEffect(() => {
    if (message.isSelfDestruct && message.destructTime) {
      const timer = setTimeout(async () => {
        try {
          await deleteDoc(doc(db, 'chats', message.chatId, 'messages', message.id));
        } catch (error) {
          console.error("Error self-destructing message:", error);
        }
      }, message.destructTime * 1000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Swipe to reply logic
  const x = useMotionValue(0);
  const swipeThreshold = 50;
  const opacity = useTransform(x, [0, swipeThreshold], [0, 1]);
  const scale = useTransform(x, [0, swipeThreshold], [0.5, 1]);

  const handleDragEnd = () => {
    if (x.get() >= swipeThreshold && onReply) {
      onReply(message);
    }
    x.set(0);
  };

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    const messageRef = doc(db, 'chats', message.chatId, 'messages', message.id);
    const hasReacted = message.reactions?.[emoji]?.includes(user.uid);

    try {
      await updateDoc(messageRef, {
        [`reactions.${emoji}`]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
      setShowReactions(false);
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  const handleVote = async (optionIndex: number) => {
    if (!user || !message.poll) return;
    const messageRef = doc(db, 'chats', message.chatId, 'messages', message.id);
    const newOptions = [...message.poll.options];
    const hasVoted = newOptions[optionIndex].votes.includes(user.uid);

    if (hasVoted) {
      newOptions[optionIndex].votes = newOptions[optionIndex].votes.filter(id => id !== user.uid);
    } else {
      newOptions[optionIndex].votes.push(user.uid);
    }

    try {
      await updateDoc(messageRef, { 'poll.options': newOptions });
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  return (
    <div className={cn(
      "flex flex-col max-w-[92%] gap-1 group relative",
      isMe ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      {/* Swipe to Reply Indicator */}
      {!isMe && onReply && (
        <motion.div 
          style={{ opacity, scale }}
          className="absolute -left-10 top-1/2 -translate-y-1/2 text-primary"
        >
          <Reply size={20} />
        </motion.div>
      )}

      <motion.div
        drag={!isMe ? "x" : false}
        dragConstraints={{ left: 0, right: swipeThreshold + 20 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className={cn(
          "px-4 py-2.5 rounded-xl relative overflow-hidden",
          isMe 
            ? "bg-primary text-white rounded-tr-none" 
            : "bg-gray-100 text-text rounded-tl-none"
        )}
      >
        {/* Self-destruct Indicator */}
        {message.isSelfDestruct && (
          <div className="absolute top-1 right-2 opacity-50">
            <Timer size={10} />
          </div>
        )}

        {/* Reply Context */}
        {message.replyTo && (
          <div className={cn(
            "mb-2 p-2 rounded-lg text-[10px] border-l-4",
            isMe ? "bg-primary/20 border-white/30" : "bg-gray-200 border-primary/30"
          )}>
            <p className="font-bold opacity-70">Replying to message</p>
            <p className="truncate opacity-90">Original message content...</p>
          </div>
        )}

        {message.type === 'call' && message.call && (
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className={cn(
              "p-2 rounded-full",
              isMe ? "bg-white/20" : "bg-primary/20"
            )}>
              {message.call.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">
                {message.call.type === 'video' ? 'Video' : 'Audio'} call {message.call.status}
              </p>
              {message.call.duration !== undefined && (
                <p className="text-[10px] opacity-70">
                  Duration: {Math.floor(message.call.duration / 60)}:{(message.call.duration % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>
            {onCall && (
              <button 
                onClick={() => onCall(message.call!.type)}
                className={cn(
                  "p-2 rounded-full",
                  isMe ? "bg-white text-primary" : "bg-primary text-white"
                )}
              >
                <Phone size={16} />
              </button>
            )}
          </div>
        )}

        {message.type === 'text' && (
          <div className="space-y-2">
            <p className="text-sm leading-relaxed">{showTranslation ? message.translatedText : message.text}</p>
            {message.translatedText && (
              <button 
                onClick={() => setShowTranslation(!showTranslation)}
                className={cn("text-[10px] font-bold flex items-center gap-1", isMe ? "text-white/70" : "text-primary")}
              >
                <Languages size={12} />
                {showTranslation ? "Show Original" : "Translate to Bengali"}
              </button>
            )}
          </div>
        )}
        
        {(message.type === 'image' || message.fileType === 'image') && (
          <img 
            src={message.fileUrl || message.mediaUrl} 
            alt="Sent image" 
            className="w-full h-auto rounded-xl object-cover max-h-60"
            referrerPolicy="no-referrer"
          />
        )}

        {message.type === 'voice' && (
          <div className="space-y-2 min-w-[200px]">
            <div className="flex items-center gap-3">
              <button className={cn(
                "p-2 rounded-full",
                isMe ? "bg-white text-primary" : "bg-primary text-white"
              )}>
                <Play size={16} fill="currentColor" />
              </button>
              <div className="flex-1 flex items-end gap-[1px] h-6">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-[2px] rounded-full",
                      isMe ? "bg-white/40" : "bg-primary/20"
                    )}
                    style={{ height: `${Math.random() * 100}%` }}
                  ></div>
                ))}
              </div>
              <span className="text-[10px] opacity-70">0:12</span>
            </div>
            {message.voiceToText && (
              <div className="mt-2">
                <button 
                  onClick={() => setShowV2T(!showV2T)}
                  className={cn("text-[10px] font-bold flex items-center gap-1 mb-1", isMe ? "text-white/70" : "text-primary")}
                >
                  <FileText size={12} />
                  {showV2T ? "Hide Transcription" : "Show Transcription"}
                </button>
                {showV2T && <p className="text-[11px] italic opacity-80 border-t border-white/10 pt-1">{message.voiceToText}</p>}
              </div>
            )}
          </div>
        )}

        {message.type === 'location' && message.location && (
          <div className="space-y-2 min-w-[200px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 text-green-500 rounded-lg flex items-center justify-center">
                <MapPin size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold">Current Location</span>
                <span className="text-[10px] opacity-70">Shared via GPS</span>
              </div>
            </div>
            <a 
              href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 bg-green-500 text-white text-center rounded-lg text-[10px] font-bold"
            >
              Open in Maps
            </a>
          </div>
        )}

        {message.type === 'poll' && message.poll && (
          <div className="space-y-3 min-w-[220px]">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-primary" />
              <h4 className="text-xs font-black uppercase tracking-wider">{message.poll.question}</h4>
            </div>
            <div className="space-y-2">
              {message.poll.options.map((opt, i) => {
                const totalVotes = message.poll?.options.reduce((acc, curr) => acc + curr.votes.length, 0) || 1;
                const percentage = (opt.votes.length / totalVotes) * 100;
                const hasVoted = opt.votes.includes(user?.uid || '');
                return (
                  <button 
                    key={i}
                    onClick={() => handleVote(i)}
                    className="w-full text-left relative p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-all overflow-hidden"
                  >
                    <div 
                      className="absolute inset-0 bg-primary/20 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                    <div className="relative flex justify-between items-center text-[11px]">
                      <span className={cn("font-bold", hasVoted && "text-primary")}>{opt.text}</span>
                      <span className="opacity-70">{opt.votes.length}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {message.type === 'contact' && message.contact && (
          <div className="flex items-center gap-3 min-w-[180px]">
            <div className="w-10 h-10 bg-blue-500/20 text-blue-500 rounded-lg flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold">{message.contact.name}</span>
              <span className="text-[10px] opacity-70">{message.contact.phone}</span>
            </div>
          </div>
        )}

        {message.type === 'file' && message.fileType !== 'image' && (
          <a 
            href={message.fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-black/5 rounded-lg hover:bg-black/10 transition-colors"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Paperclip size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold truncate max-w-[120px]">Attachment</span>
              <span className="text-[10px] opacity-70 uppercase">{message.fileType || 'File'}</span>
            </div>
          </a>
        )}
        
        {/* Status & Time */}
        <div className={cn(
          "flex items-center gap-1 mt-1 text-[10px]",
          isMe ? "text-white/70" : "text-muted"
        )}>
          <span>{time}</span>
          {isMe && (
            message.status === 'seen' 
              ? <CheckCheck size={12} className="text-secondary" />
              : <Check size={12} />
          )}
        </div>

        {/* Reactions Display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={cn(
            "absolute -bottom-3 flex gap-1",
            isMe ? "right-0" : "left-0"
          )}>
            {Object.entries(message.reactions).map(([emoji, users]) => (
              users.length > 0 && (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="bg-white border border-border rounded-full px-1.5 py-0.5 text-[10px] hover:scale-110 transition-transform flex items-center gap-1"
                >
                  <span>{emoji}</span>
                  <span className="font-bold text-muted">{users.length}</span>
                </button>
              )
            ))}
          </div>
        )}

        {/* Reaction Picker Trigger */}
        <button 
          onClick={() => setShowReactions(!showReactions)}
          className={cn(
            "absolute top-0 p-1 bg-white border border-border rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
            isMe ? "-left-8" : "-right-8"
          )}
        >
          <Smile size={14} className="text-muted" />
        </button>

        {/* Reaction Picker */}
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className={cn(
                "absolute -top-10 z-10 bg-white border border-border rounded-full p-1 flex gap-1",
                isMe ? "right-0" : "left-0"
              )}
            >
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
