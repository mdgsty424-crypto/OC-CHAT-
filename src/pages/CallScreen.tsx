import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, VolumeX, Monitor, SwitchCamera, MessageSquare, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CallSession, User } from '../types';
import { useAuth } from '../hooks/useAuth';

import { startCall, endCall } from '../lib/callService';

export default function CallScreen() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const type = searchParams.get('type') || 'audio';
  const callId = searchParams.get('callId');
  
  const [status, setStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended'>('calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(type === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [otherUser, setOtherUser] = useState<User | null>(null);

  useEffect(() => {
    if (status === 'connected' && callId && currentUser) {
      startCall(callId, currentUser.uid, currentUser.displayName, type === 'video');
    }
    if (status === 'ended' && callId) {
      endCall(callId);
    }
  }, [status, callId, currentUser, type]);

  useEffect(() => {
    if (!id) return;
    const fetchOtherUser = async () => {
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        setOtherUser(userDoc.data() as User);
      }
    };
    fetchOtherUser();
  }, [id]);

  useEffect(() => {
    if (!callId) return;

    const unsubscribe = onSnapshot(doc(db, 'calls', callId), (snapshot) => {
      if (snapshot.exists()) {
        const callData = snapshot.data() as CallSession;
        setStatus(callData.status);
        
        if (callData.status === 'ended') {
          setTimeout(() => navigate(-1), 2000);
        }
      } else {
        setStatus('ended');
        setTimeout(() => navigate(-1), 1000);
      }
    });

    return () => unsubscribe();
  }, [callId, navigate]);

  useEffect(() => {
    let interval: any;
    if (status === 'connected') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    if (callId) {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'ended',
        endTime: new Date().toISOString()
      });
    }
    navigate(-1);
  };

  return (
    <div className="h-screen w-screen bg-text flex flex-col items-center justify-between relative overflow-hidden">
      {/* Video Background (Simulated) */}
      {type === 'video' && status === 'connected' && isVideoOn && (
        <div className="absolute inset-0 z-0">
          <img 
            src={otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`} 
            className="w-full h-full object-cover blur-xl opacity-40"
            alt="Background"
          />
          <div className="absolute inset-0 bg-black/40"></div>
          {/* Main Remote Video Placeholder */}
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border-4 border-primary/50 overflow-hidden animate-pulse">
               <img src={otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`} className="w-full h-full object-cover" alt="Remote" />
            </div>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="pt-20 flex flex-col items-center gap-4 z-10">
        <AnimatePresence mode="wait">
          {status !== 'connected' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-32 h-32 rounded-3xl border-4 border-primary/30 p-1 mb-4"
            >
              <img 
                src={otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`} 
                className="w-full h-full rounded-2xl object-cover shadow-2xl"
                alt="User"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <h2 className="text-3xl font-black text-white tracking-tight">
          {otherUser?.displayName || 'Loading...'}
        </h2>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            status === 'connected' ? "bg-green-500" : status === 'ended' ? "bg-red-500" : "bg-primary"
          )}></div>
          <span className="text-white/70 text-sm font-bold uppercase tracking-widest">
            {status === 'connected' ? formatTime(duration) : status === 'ended' ? 'Call Ended' : status.charAt(0).toUpperCase() + status.slice(1) + '...'}
          </span>
        </div>
      </div>

      {/* Self View (Small Preview) */}
      {type === 'video' && status === 'connected' && (
        <motion.div 
          drag
          dragConstraints={{ left: -100, right: 100, top: -200, bottom: 200 }}
          className="absolute top-10 right-6 w-32 h-44 bg-black rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden z-20"
        >
          {isVideoOn ? (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Me" className="w-full h-full object-cover" alt="Me" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40">
              <VideoOff size={32} />
            </div>
          )}
        </motion.div>
      )}

      {/* Controls */}
      <div className="pb-16 px-8 w-full z-10">
        <div className="glass rounded-3xl p-6 flex flex-wrap justify-center gap-6 shadow-2xl border-white/10">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90",
              isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {type === 'video' && (
            <>
              <button 
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                  !isVideoOn ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
              <button className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-90">
                <SwitchCamera size={24} />
              </button>
              <button 
                onClick={() => setIsScreenSharing(!isScreenSharing)}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                  isScreenSharing ? "bg-secondary text-white" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                <Monitor size={24} />
              </button>
            </>
          )}

          <button 
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90",
              isSpeakerOn ? "bg-white text-text" : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>

          <button className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-90">
            <MessageSquare size={24} />
          </button>

          <button 
            onClick={handleEndCall}
            className="w-14 h-14 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/40 hover:bg-red-600 transition-all active:scale-90"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
