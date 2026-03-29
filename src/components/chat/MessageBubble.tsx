import React from 'react';
import { Message } from '../../types';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { Check, CheckCheck, Paperclip } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  key?: any;
}

export default function MessageBubble({ message, isMe }: MessageBubbleProps) {
  const time = format(new Date(message.timestamp), 'HH:mm');

  return (
    <div className={cn(
      "flex flex-col max-w-[80%] gap-1",
      isMe ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      <div className={cn(
        "px-4 py-3 rounded-2xl shadow-sm relative group",
        isMe 
          ? "bg-primary text-white rounded-tr-none" 
          : "bg-white text-text rounded-tl-none border border-border"
      )}>
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
      </div>
    </div>
  );
}
