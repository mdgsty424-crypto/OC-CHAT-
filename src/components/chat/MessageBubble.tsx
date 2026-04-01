import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../../types';
import { cn } from '../../lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { 
  Check, 
  CheckCheck, 
  Paperclip, 
  Smile, 
  Reply, 
  Play, 
  Pause, 
  MoreVertical, 
  MapPin, 
  UserPlus, 
  BarChart2, 
  Languages, 
  Timer, 
  FileText, 
  Phone, 
  Video, 
  Loader2, 
  Clock 
} from 'lucide-react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onCall?: (type: 'audio' | 'video') => void | Promise<void>;
}

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, onReply, onForward, onCall }) => {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showV2T, setShowV2T] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const timestamp = new Date(message.timestamp);
  const timeStr = !isNaN(timestamp.getTime()) ? format(timestamp, 'HH:mm') : '';
  
  const getFullTimestamp = (date: Date) => {
    if (isNaN(date.getTime())) return '';
    const day = format(date, 'EEE').toUpperCase();
    const time = format(date, 'HH:mm');
    return `${day} ${time}`;
  };

  const formatDuration = (seconds: number | undefined) => {
    if (seconds === undefined || isNaN(seconds)) return 'Tap to call again';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins} min${mins > 1 ? 's' : ''}`;
  };

  const formatVoiceTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Swipe logic
  const x = useMotionValue(0);
  const swipeThreshold = 50;
  const opacity = useTransform(x, [0, swipeThreshold], [0, 1]);
  const scale = useTransform(x, [0, swipeThreshold], [0.5, 1]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x >= swipeThreshold && onReply) {
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

  // 1. Call History Rendering (Messenger Style)
  if (message.type === 'call_history' || message.messageType === 'call_history') {
    return (
      <div className="flex flex-col items-center w-full my-6">
        {/* Centered Timestamp */}
        <span className="text-[10px] font-bold text-gray-400 mb-3 tracking-wider uppercase">
          {getFullTimestamp(timestamp)}
        </span>
        
        {/* Pill Bubble */}
        <div className="bg-[#f0f2f5] px-6 py-2 rounded-full border border-gray-100 flex items-center gap-3 shadow-sm hover:bg-gray-200 transition-colors cursor-pointer active:scale-95">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
            {message.callType === 'video' ? <Video size={18} /> : <Phone size={18} />}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-800">
              {message.callType === 'video' ? 'Video chat' : 'Audio call'}
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              {formatDuration(message.duration)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Regular Message Rendering
  return (
    <div className={cn(
      "flex flex-col max-w-[85%] gap-1 group relative mb-1",
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
        dragConstraints={{ left: 0, right: swipeThreshold }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative rounded-[20px] overflow-visible transition-all",
          message.type === 'voice' || message.messageType === 'voice' ? "bg-transparent p-0" : (
            isMe 
              ? "bg-[#0084ff] text-white rounded-tr-[4px]" 
              : "bg-[#e4e6eb] text-black rounded-tl-[4px]"
          ),
          (message.type === 'text' || message.type === 'contact') && "px-4 py-2.5 shadow-sm"
        )}
      >
        {/* Self-destruct Indicator */}
        {message.isSelfDestruct && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm">
            <Timer size={10} />
          </div>
        )}

        {/* Reply Context */}
        {message.replyTo && (
          <div className={cn(
            "mb-2 p-2 rounded-xl text-[10px] border-l-4",
            isMe ? "bg-white/10 border-white/30" : "bg-black/5 border-primary/30"
          )}>
            <p className="font-bold opacity-70">Replying to message</p>
            <p className="truncate opacity-90 italic">Original message...</p>
          </div>
        )}

        {/* Text Message */}
        {message.type === 'text' && (
          <div className="space-y-1">
            <p className="text-[14px] leading-tight font-normal">
              {showTranslation ? message.translatedText : message.text}
            </p>
            {message.translatedText && (
              <button 
                onClick={() => setShowTranslation(!showTranslation)}
                className={cn("text-[10px] font-bold flex items-center gap-1 mt-1", isMe ? "text-white/70" : "text-primary")}
              >
                <Languages size={12} />
                {showTranslation ? "Original" : "Translate"}
              </button>
            )}
          </div>
        )}
        
        {/* Image Message */}
        {(message.type === 'image' || message.fileType === 'image') && (
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <img 
              src={message.fileUrl || message.mediaUrl} 
              alt="Sent image" 
              className="w-full h-auto object-cover max-h-80"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Voice Message */}
        {(message.type === 'voice' || message.messageType === 'voice') && (
          <div className={cn(
            "w-[240px] p-3 rounded-[24px] shadow-sm",
            isMe ? "bg-[#0084ff] text-white" : "bg-[#e4e6eb] text-black"
          )}>
            {message.status === 'uploading' ? (
              <div className="flex items-center justify-center h-10">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    if (isPlaying) {
                      audioRef.current?.pause();
                      setIsPlaying(false);
                    } else {
                      if (!audioRef.current) {
                        audioRef.current = new Audio(message.audioUrl);
                        audioRef.current.onended = () => setIsPlaying(false);
                      }
                      audioRef.current.play();
                      setIsPlaying(true);
                    }
                  }}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-full transition-transform active:scale-90",
                    isMe ? "bg-white text-[#0084ff]" : "bg-[#0084ff] text-white"
                  )}
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                </button>
                <div className="flex-1 flex items-center h-8">
                  <div className="w-full h-1 bg-current opacity-20 rounded-full relative">
                    <div className="absolute inset-0 bg-current rounded-full w-1/3"></div>
                  </div>
                </div>
                <span className="text-[10px] font-bold opacity-70">
                  {message.audioDuration ? formatVoiceTime(message.audioDuration) : '0:00'}
                </span>
              </div>
            )}
            {message.voiceToText && (
              <div className="mt-2 pt-2 border-t border-current/10">
                <button 
                  onClick={() => setShowV2T(!showV2T)}
                  className="text-[10px] font-bold flex items-center gap-1 mb-1 opacity-70"
                >
                  <FileText size={12} />
                  {showV2T ? "Hide text" : "Show text"}
                </button>
                {showV2T && <p className="text-[11px] italic opacity-90">{message.voiceToText}</p>}
              </div>
            )}
          </div>
        )}

        {/* Location Message */}
        {message.type === 'location' && message.location && (
          <div className="space-y-2 min-w-[200px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 text-green-500 rounded-xl flex items-center justify-center">
                <MapPin size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold">Location</span>
                <span className="text-[10px] opacity-70">Shared via GPS</span>
              </div>
            </div>
            <a 
              href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 bg-green-500 text-white text-center rounded-xl text-[10px] font-bold hover:bg-green-600 transition-colors"
            >
              View on Maps
            </a>
          </div>
        )}

        {/* Poll Message */}
        {message.type === 'poll' && message.poll && (
          <div className="space-y-3 min-w-[220px]">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className={isMe ? "text-white" : "text-primary"} />
              <h4 className="text-[13px] font-bold">{message.poll.question}</h4>
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
                    className={cn(
                      "w-full text-left relative p-2 rounded-xl transition-all overflow-hidden border",
                      isMe ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"
                    )}
                  >
                    <div 
                      className="absolute inset-0 bg-primary/20 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                    <div className="relative flex justify-between items-center text-[11px]">
                      <span className={cn("font-semibold", hasVoted && "text-primary")}>{opt.text}</span>
                      <span className="opacity-70">{opt.votes.length}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact Message */}
        {message.type === 'contact' && message.contact && (
          <div className="flex items-center gap-3 min-w-[180px]">
            <div className="w-10 h-10 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold">{message.contact.name}</span>
              <span className="text-[10px] opacity-70">{message.contact.phone}</span>
            </div>
          </div>
        )}

        {/* File Message */}
        {message.type === 'file' && message.fileType !== 'image' && (
          <a 
            href={message.fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-colors",
              isMe ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10"
            )}
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Paperclip size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold truncate max-w-[120px]">Attachment</span>
              <span className="text-[10px] opacity-70 uppercase">{message.fileType || 'File'}</span>
            </div>
          </a>
        )}

        {/* Reactions Display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={cn(
            "absolute -bottom-4 flex gap-1",
            isMe ? "right-2" : "left-2"
          )}>
            {Object.entries(message.reactions).map(([emoji, users]) => {
              const userList = users as string[];
              return userList.length > 0 && (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="bg-white border border-gray-100 rounded-full px-2 py-0.5 text-[10px] shadow-sm hover:scale-110 transition-transform flex items-center gap-1"
                >
                  <span>{emoji}</span>
                  <span className="font-bold text-gray-500">{userList.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Status & Time */}
      <div className={cn(
        "flex items-center gap-1 mt-1 px-1",
        isMe ? "justify-end" : "justify-start"
      )}>
        <span className="text-[9px] font-medium text-gray-400 uppercase">{timeStr}</span>
        {isMe && (
          <div className="flex items-center">
            {message.status === 'seen' ? (
              <CheckCheck size={12} className="text-[#0084ff]" />
            ) : message.status === 'delivered' ? (
              <CheckCheck size={12} className="text-gray-300" />
            ) : message.status === 'pending' ? (
              <Clock size={10} className="text-gray-300 animate-pulse" />
            ) : (
              <Check size={12} className="text-gray-300" />
            )}
          </div>
        )}
      </div>

      {/* Reaction Picker Trigger */}
      <button 
        onClick={() => setShowReactions(!showReactions)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 p-1.5 bg-white border border-gray-100 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10",
          isMe ? "-left-10" : "-right-10"
        )}
      >
        <Smile size={14} className="text-gray-400" />
      </button>

      {/* Reaction Picker */}
      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className={cn(
              "absolute -top-12 z-20 bg-white border border-gray-100 rounded-full p-1.5 flex gap-1 shadow-lg",
              isMe ? "right-0" : "left-0"
            )}
          >
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className="hover:scale-125 transition-transform p-1 text-lg"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageBubble;
