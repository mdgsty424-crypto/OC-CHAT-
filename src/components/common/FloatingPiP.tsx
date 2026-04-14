import React, { useRef, useEffect } from 'react';
import { motion, useDragControls } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useWebRTCStore } from '../../hooks/useWebRTCStore';
import { VerifiedBadge } from './VerifiedBadge';
import { 
  Mic, 
  MicOff, 
  CameraOff, 
  Phone, 
  Maximize2 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { endCall } from '../../lib/webrtc';

export const FloatingPiP = () => {
  const navigate = useNavigate();
  const { 
    activeCallId, 
    otherUser, 
    remoteStream, 
    localStream, 
    isPiPMode, 
    setIsPiPMode,
    isMicOn,
    setIsMicOn,
    isCameraOn,
    setIsCameraOn,
    callStatus,
    setActiveCallId,
    setLocalStream,
    setRemoteStream,
    setCallStatus,
    pc,
    setPc
  } = useWebRTCStore();

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isPiPMode && remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (isPiPMode && localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [isPiPMode, remoteStream, localStream]);

  if (!isPiPMode || !activeCallId) return null;

  const handleHangUp = async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (pc) {
      pc.close();
    }
    if (activeCallId && otherUser) {
      await endCall(activeCallId, otherUser.uid);
    }
    
    setIsPiPMode(false);
    setActiveCallId(null);
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('ended');
    setPc(null);
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const returnToFullScreen = () => {
    setIsPiPMode(false);
    navigate(`/call/${otherUser?.uid}?callId=${activeCallId}&mode=receiver`); // mode doesn't strictly matter for return
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ x: window.innerWidth - 140, y: window.innerHeight - 200 }}
      className="fixed z-[9999] w-[120px] h-[180px] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/20 cursor-move group"
      onDoubleClick={returnToFullScreen}
    >
      {/* Remote Video */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Local Preview (Tiny) */}
      <div className="absolute top-2 right-2 w-8 h-12 rounded-md overflow-hidden border border-white/20 bg-gray-900">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>

      {/* Verified Badge */}
      {otherUser?.verified && (
        <div className="absolute top-2 left-2">
          <VerifiedBadge size="xs" className="text-yellow-400" />
        </div>
      )}

      {/* Overlay Controls */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end pb-2 gap-2">
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleMic(); }}
            className={cn("p-1.5 rounded-full", isMicOn ? "bg-white/20" : "bg-red-500")}
          >
            {isMicOn ? <Mic size={12} className="text-white" /> : <MicOff size={12} className="text-white" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
            className={cn("p-1.5 rounded-full", isCameraOn ? "bg-white/20" : "bg-red-500")}
          >
            {isCameraOn ? <div className="w-3 h-3" /> : <CameraOff size={12} className="text-white" />}
          </button>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleHangUp(); }}
          className="p-2 bg-red-600 rounded-full text-white"
        >
          <Phone size={14} className="rotate-[135deg]" />
        </button>
      </div>

      {/* Maximize Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); returnToFullScreen(); }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Maximize2 size={20} />
      </button>
    </motion.div>
  );
};
