import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWebRTCStore } from '../../hooks/useWebRTCStore';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, X, Video, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { rejectCall } from '../../lib/webrtc';
import { VerifiedBadge } from './VerifiedBadge';

export default function WebRTCCallInvitation() {
  const { user } = useAuth();
  const { incomingCall, setIncomingCall } = useWebRTCStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.incomingCall) {
        setIncomingCall(data.incomingCall);
        // Play ringtone logic could go here
      } else {
        setIncomingCall(null);
      }
    });

    return () => unsubscribe();
  }, [user?.uid, setIncomingCall]);

  const handleAccept = () => {
    if (!incomingCall) return;
    const { callId, callerId, type } = incomingCall;
    
    // Clear incomingCall field to stop other devices from ringing
    const userRef = doc(db, 'users', user!.uid);
    updateDoc(userRef, { incomingCall: null });

    navigate(`/call-screen/${callerId}?callId=${callId}&type=${type}&mode=receiver`);
  };

  const handleReject = async () => {
    if (!incomingCall) return;
    await rejectCall(incomingCall.callId, user!.uid);
    setIncomingCall(null);
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-between py-20 px-6 backdrop-blur-xl"
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl"
              />
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl relative z-10">
                <img 
                  src={incomingCall.callerPhoto || `https://ui-avatars.com/api/?name=${incomingCall.callerName}`} 
                  alt={incomingCall.callerName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-3xl font-black text-white">{incomingCall.callerName}</h2>
                <VerifiedBadge size="sm" className="text-yellow-400" />
              </div>
              <p className="text-blue-400 font-bold tracking-widest uppercase text-xs animate-pulse">
                Incoming {incomingCall.type === 'video' ? 'Video' : 'Voice'} Call...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-12">
            <button 
              onClick={handleReject}
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/40 hover:bg-red-600 transition-all active:scale-90"
            >
              <X size={32} />
            </button>

            <button 
              onClick={handleAccept}
              className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/40 hover:bg-green-600 transition-all active:scale-90"
            >
              {incomingCall.type === 'video' ? <Video size={32} /> : <Phone size={32} />}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
