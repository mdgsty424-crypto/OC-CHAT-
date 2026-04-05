import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useZegoStore } from '../../hooks/useZegoStore';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { useAppAssets } from '../../hooks/useAppAssets';
import { cn } from '../../lib/utils';

export default function ZegoIncomingCallUI() {
  const { incomingCall, isAudioUnlocked } = useZegoStore();
  const { user: currentUser } = useAuth();
  const { isMuted } = useSettings();
  const assets = useAppAssets();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioBlocked, setAudioBlocked] = React.useState(false);

  const startAudio = () => {
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = 1.0;
      audioRef.current.loop = true;
      audioRef.current.play()
        .then(() => {
          console.log("Incoming call ringtone playing successfully");
          setAudioBlocked(false);
        })
        .catch(err => {
          console.error("Force play failed:", err);
          setAudioBlocked(true);
        });
    }
  };

  useEffect(() => {
    if (incomingCall) {
      console.log("Incoming call UI triggered. Initializing audio...");
      
      // 1. Initialize Audio Object
      const audio = new Audio(assets.ringtone);
      audio.loop = true;
      audio.volume = 1.0;
      audioRef.current = audio;

      // 2. Strong Vibration Pattern [1000ms on, 500ms off]
      if ('vibrate' in navigator) {
        navigator.vibrate([1000, 500, 1000, 500, 1000, 500, 1000, 500]);
      }

      // 3. Attempt to play immediately
      if (!isMuted) {
        audio.play()
          .then(() => {
            console.log("Ringtone started automatically");
            setAudioBlocked(false);
          })
          .catch(e => {
            console.warn("Autoplay blocked ringtone. Waiting for user interaction.", e);
            setAudioBlocked(true);
          });
      }

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        if ('vibrate' in navigator) {
          navigator.vibrate(0);
        }
      };
    }
  }, [incomingCall, isMuted, assets.ringtone]);

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 1; // 1 is VideoCall, 0 is VoiceCall in Zego

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={audioBlocked ? startAudio : undefined}
        className="fixed inset-0 z-[1000] flex flex-col items-center justify-between py-20 bg-black overflow-hidden cursor-pointer"
      >
        {/* Audio Blocked Overlay */}
        {audioBlocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[1100] bg-black/80 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Phone size={40} className="text-primary" />
            </div>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Incoming Call</h3>
            <p className="text-sm text-muted-foreground font-bold mb-8">Tap anywhere to enable audio & ringtone</p>
            <button 
              onClick={(e) => { e.stopPropagation(); startAudio(); }}
              className="px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/40 animate-bounce"
            >
              Enable Sound
            </button>
          </motion.div>
        )}
        {/* Blurred Background (Receiver's Profile Pic) */}
        <div className="absolute inset-0 z-0">
          <img
            src={currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.uid}`}
            alt="Background"
            className="w-full h-full object-cover blur-3xl opacity-40 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        </div>

        {/* Caller Info */}
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative mb-8"
          >
            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-secondary animate-spin-slow">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${incomingCall.caller.userID}`}
                alt={incomingCall.caller.userName}
                className="w-full h-full rounded-full object-cover border-4 border-black"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center border-4 border-black shadow-lg">
              {isVideo ? <Video size={20} /> : <Phone size={20} />}
            </div>
          </motion.div>

          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-black text-white mb-2 tracking-tight"
          >
            {incomingCall.caller.userName}
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-primary font-bold uppercase tracking-[0.3em] text-xs animate-pulse"
          >
            Incoming {isVideo ? 'Video' : 'Audio'} Call
          </motion.p>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex items-center gap-12 sm:gap-20">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={incomingCall.refuse}
              className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 hover:bg-red-600 transition-colors"
            >
              <PhoneOff size={32} />
            </motion.button>
            <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-4">
            <motion.button
              animate={{ 
                scale: [1, 1.1, 1],
                boxShadow: [
                  "0 0 0 0px rgba(34, 197, 94, 0.4)",
                  "0 0 0 20px rgba(34, 197, 94, 0)",
                  "0 0 0 0px rgba(34, 197, 94, 0)"
                ]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.5,
                ease: "easeInOut"
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={incomingCall.accept}
              className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40 hover:bg-green-600 transition-colors"
            >
              <Phone size={32} />
            </motion.button>
            <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">Accept</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
