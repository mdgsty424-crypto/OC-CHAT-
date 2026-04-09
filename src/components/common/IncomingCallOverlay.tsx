import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, X, Video } from 'lucide-react';
import { User } from '../../types';
import { VerifiedBadge } from './VerifiedBadge';
import { cn } from '../../lib/utils';

interface IncomingCallOverlayProps {
  caller: User;
  type: 'audio' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallOverlay({ caller, type, onAccept, onDecline }: IncomingCallOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -100 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md"
    >
      <div className="bg-[#1f2c34]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={caller.photoURL || `https://ui-avatars.com/api/?name=${caller.displayName}`}
              alt={caller.displayName}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-primary/20"
              referrerPolicy="no-referrer"
            />
            <div className={cn(
              "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#1f2c34]",
              type === 'video' ? "bg-secondary" : "bg-primary"
            )}>
              {type === 'video' ? <Video size={12} className="text-white" /> : <Phone size={12} className="text-white" />}
            </div>
          </div>
          <div>
            <h3 className="text-white font-black text-sm flex items-center gap-1">
              {caller.displayName}
              {caller.verified && <VerifiedBadge size={14} className="animate-pulse" />}
            </h3>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
              Incoming {type} call...
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onDecline}
            className="p-4 bg-red-500/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
          >
            <X size={20} />
          </button>
          <button
            onClick={onAccept}
            className="p-4 bg-green-500 text-white rounded-2xl hover:bg-green-600 shadow-lg shadow-green-500/20 transition-all active:scale-90 animate-bounce"
          >
            <Phone size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
