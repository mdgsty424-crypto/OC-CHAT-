import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Grid, UserPlus, Video } from 'lucide-react';
import { useZegoStore } from '../../hooks/useZegoStore';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { useAppAssets } from '../../hooks/useAppAssets';
import { cn } from '../../lib/utils';

export default function OutgoingCall() {
  const { outgoingCall } = useZegoStore();
  const { isMuted } = useSettings();
  const assets = useAppAssets();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  useEffect(() => {
    if (outgoingCall) {
      // 1. Initialize Audio (Outgoing Ringtone/Waiting Sound)
      const audio = new Audio(assets.ringtone || 'https://res.cloudinary.com/demo/video/upload/v1626343568/sample_audio.mp3');
      audio.loop = true;
      audio.volume = 0.5; // Outgoing is usually quieter
      audioRef.current = audio;

      // 2. Play
      if (!isMuted) {
        audio.play().catch(e => console.log("Outgoing audio blocked", e));
      }

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
  }, [outgoingCall, isMuted, assets.ringtone]);

  if (!outgoingCall) return null;

  const isVideo = outgoingCall.callType === 1;
  const callee = outgoingCall.callees[0];

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
        
        {/* Callee Info (Top) */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${callee?.userID}`}
                alt={callee?.userName}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
          
          <h1 className="text-4xl font-medium text-white mb-2 tracking-tight">
            {callee?.userName || 'Calling...'}
          </h1>
          <p className="text-white/60 text-lg font-light tracking-wide animate-pulse">
            Calling...
          </p>
        </div>

        {/* Call Controls (Middle Grid) */}
        <div className="relative z-10 grid grid-cols-3 gap-x-12 gap-y-12 w-full max-w-sm px-8">
          <ControlButton 
            icon={isMicMuted ? MicOff : Mic} 
            label="mute" 
            active={isMicMuted} 
            onClick={() => setIsMicMuted(!isMicMuted)} 
          />
          <ControlButton icon={Grid} label="keypad" />
          <ControlButton 
            icon={isSpeakerOn ? Volume2 : VolumeX} 
            label="speaker" 
            active={isSpeakerOn} 
            onClick={() => setIsSpeakerOn(!isSpeakerOn)} 
          />
          <ControlButton icon={UserPlus} label="add call" />
          <ControlButton icon={Video} label="FaceTime" disabled={!isVideo} />
          <ControlButton icon={UserPlus} label="contacts" />
        </div>

        {/* End Call Button (Bottom) */}
        <div className="relative z-10 w-full flex justify-center pb-12">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={outgoingCall.cancel}
            className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl"
          >
            <PhoneOff size={32} fill="currentColor" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ControlButton({ icon: Icon, label, active = false, onClick, disabled = false }: { 
  icon: any, 
  label: string, 
  active?: boolean, 
  onClick?: () => void,
  disabled?: boolean
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2", disabled && "opacity-30 pointer-events-none")}>
      <button
        onClick={onClick}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90",
          active ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        <Icon size={28} />
      </button>
      <span className="text-[10px] text-white/60 font-medium uppercase tracking-widest">{label}</span>
    </div>
  );
}
