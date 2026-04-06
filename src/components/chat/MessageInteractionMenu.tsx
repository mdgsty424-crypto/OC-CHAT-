import React from 'react';
import { motion } from 'motion/react';
import { Pin, Forward, Copy, Heart, Reply, Trash2 } from 'lucide-react';

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

interface Props {
  onClose: () => void;
  onEmojiClick: (emoji: string) => void;
  onAction: (action: string) => void;
}

export default function MessageInteractionMenu({ onClose, onEmojiClick, onAction }: Props) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="absolute z-[60] -top-28 left-1/2 -translate-x-1/2 bg-black/20 backdrop-blur-2xl border border-white/10 p-3 rounded-full shadow-2xl flex flex-col gap-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex gap-2 px-1">
        {EMOJIS.map(emoji => (
          <button 
            key={emoji} 
            onClick={() => onEmojiClick(emoji)} 
            className="text-xl hover:scale-125 transition-transform p-1"
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="flex gap-4 px-3 border-t border-white/10 pt-2 text-white">
        <Pin size={18} onClick={() => onAction('pin')} className="cursor-pointer hover:text-primary transition-colors" />
        <Forward size={18} onClick={() => onAction('forward')} className="cursor-pointer hover:text-primary transition-colors" />
        <Copy size={18} onClick={() => onAction('copy')} className="cursor-pointer hover:text-primary transition-colors" />
        <Heart size={18} onClick={() => onAction('favorite')} className="cursor-pointer hover:text-primary transition-colors" />
        <Reply size={18} onClick={() => onAction('reply')} className="cursor-pointer hover:text-primary transition-colors" />
        <Trash2 size={18} onClick={() => onAction('delete')} className="cursor-pointer hover:text-red-400 transition-colors" />
      </div>
    </motion.div>
  );
}
