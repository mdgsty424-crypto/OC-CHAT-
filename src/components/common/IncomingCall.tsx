import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video, MessageSquare, Clock } from 'lucide-react';
import { useZegoStore } from '../../hooks/useZegoStore';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { useAppAssets } from '../../hooks/useAppAssets';
import { cn } from '../../lib/utils';

export default function IncomingCall() {
  const { incomingCall } = useZegoStore();
  const { user: currentUser } = useAuth();
  const { isMuted } = useSettings();
  const assets = useAppAssets();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (incomingCall) {
      // 1. Initialize Audio
      const audio = new Audio(assets.ringtone || 'https://res.cloudinary.com/demo/video/upload/v1626343568/sample_audio.mp3');
      audio.loop = true;
      audio.volume = 1.0;
      audioRef.current = audio;

      // 2. iOS Vibration Pattern (Long pulses)
      if ('vibrate' in navigator) {
        navigator.vibrate([1000, 500, 1000, 500, 1000, 500, 1000, 500]);
      }

      // 3. Play
      if (!isMuted) {
        audio.play().catch(() => {
          // Auto-Unlock Audio on first interaction
          const unlockAudio = () => {
            if (audioRef.current && !isMuted) {
              audioRef.current.play().catch(console.error);
            }
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
          };
          window.addEventListener('click', unlockAudio);
          window.addEventListener('touchstart', unlockAudio);
        });
      }

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        if ('vibrate' in navigator) navigator.vibrate(0);
      };
    }
  }, [incomingCall, isMuted, assets.ringtone]);

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] bg-black flex flex-col items-center justify-between py-24 overflow-hidden"
      >
        {/* Subtle Dark Gradient Background */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-gray-900 via-black to-gray-900 opacity-80" />
        
        {/* Caller Info (Top) */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-6"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${incomingCall.caller.userID}`}
                alt={incomingCall.caller.userName}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
          
          <h1 className="text-4xl font-medium text-white mb-2 tracking-tight">
            {incomingCall.caller.userName || 'Unknown Caller'}
          </h1>
          <p className="text-white/60 text-lg font-light tracking-wide animate-pulse">
            {isVideo ? 'OC-CHAT Video...' : 'OC-CHAT Audio...'}
          </p>
        </div>

        {/* Middle Icons (Remind/Message) */}
        <div className="relative z-10 flex justify-center gap-24 w-full px-12 mb-12">
          <div className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-12 h-12 flex items-center justify-center text-white/80 group-active:scale-90 transition-transform">
              <Clock size={24} />
            </div>
            <span className="text-[10px] text-white/60 font-medium uppercase tracking-widest">Remind Me</span>
          </div>
          <div className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-12 h-12 flex items-center justify-center text-white/80 group-active:scale-90 transition-transform">
              <MessageSquare size={24} />
            </div>
            <span className="text-[10px] text-white/60 font-medium uppercase tracking-widest">Message</span>
          </div>
        </div>

        {/* Actions (Bottom) */}
        <div className="relative z-10 w-full px-12 flex flex-col items-center gap-12">
          <div className="flex justify-between w-full max-w-sm">
            {/* Decline */}
            <div className="flex flex-col items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={incomingCall.refuse}
                className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl"
              >
                <PhoneOff size={32} fill="currentColor" />
              </motion.button>
              <span className="text-xs text-white font-medium">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={incomingCall.accept}
                className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center shadow-xl"
              >
                <Phone size={32} fill="currentColor" />
              </motion.button>
              <span className="text-xs text-white font-medium">Accept</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
