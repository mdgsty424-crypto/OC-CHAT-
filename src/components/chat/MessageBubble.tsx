import React, { useState } from 'react';
import { Message } from '../../types';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { Check, CheckCheck, Paperclip, Smile, Reply, Play, MoreVertical, Trash2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onReply?: (message: Message) => void;
  key?: string | number;
}

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function MessageBubble({ message, isMe, onReply }: MessageBubbleProps) {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const time = format(new Date(message.timestamp), 'HH:mm');

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

  return (
    <div className={cn(
      "flex flex-col max-w-[85%] gap-1 group relative",
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
          "px-4 py-3 rounded-2xl shadow-sm relative",
          isMe 
            ? "bg-primary text-white rounded-tr-none" 
            : "bg-white text-text rounded-tl-none border border-border"
        )}
      >
        {/* Reply Context */}
        {message.replyTo && (
          <div className={cn(
            "mb-2 p-2 rounded-lg text-[10px] border-l-4",
            isMe ? "bg-white/10 border-white/30" : "bg-background border-primary/30"
          )}>
            <p className="font-bold opacity-70">Replying to message</p>
            <p className="truncate opacity-90">Original message content...</p>
          </div>
        )}

        {message.type === 'text' && (
          <p className="text-sm leading-relaxed">{message.text}</p>
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
          <div className="flex items-center gap-3 min-w-[200px]">
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
                  className="bg-white border border-border rounded-full px-1.5 py-0.5 text-[10px] shadow-sm hover:scale-110 transition-transform flex items-center gap-1"
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
            "absolute top-0 p-1 bg-white border border-border rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity",
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
                "absolute -top-10 z-10 bg-white border border-border rounded-full p-1 shadow-xl flex gap-1",
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
