import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CallSession, User } from '../../types';

export default function IncomingCall() {
  const { user: currentUser } = useAuth();
  const [incomingCall, setIncomingCall] = useState<{ id: string, name: string, type: 'audio' | 'video', callId: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', currentUser.uid),
      where('status', '==', 'calling')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const callData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CallSession;
        
        // Fetch caller info
        const callerDoc = await getDoc(doc(db, 'users', callData.callerId));
        if (callerDoc.exists()) {
          const callerData = callerDoc.data() as User;
          setIncomingCall({
            id: callerData.uid,
            name: callerData.displayName,
            type: callData.type,
            callId: callData.id
          });
        }
      } else {
        setIncomingCall(null);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (incomingCall) {
      // Native vibration if available
      if ('vibrate' in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
      
      // Play ringtone (simulated)
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.loop = true;
      audio.play().catch(e => console.log("Audio play blocked by browser"));
      
      return () => {
        audio.pause();
        if ('vibrate' in navigator) navigator.vibrate(0);
      };
    }
  }, [incomingCall]);

  const handleAccept = async () => {
    if (incomingCall) {
      await updateDoc(doc(db, 'calls', incomingCall.callId), {
        status: 'connected',
        startTime: new Date().toISOString()
      });
      
      // PiP Mode simulation
      if (document.pictureInPictureEnabled) {
        console.log("Entering PiP mode...");
      }

      navigate(`/call/${incomingCall.id}?type=${incomingCall.type}&callId=${incomingCall.callId}`);
      setIncomingCall(null);
    }
  };

  const handleReject = async () => {
    if (incomingCall) {
      await updateDoc(doc(db, 'calls', incomingCall.callId), {
        status: 'ended'
      });
      setIncomingCall(null);
    }
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 20, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 max-w-md mx-auto px-4 z-[100]"
        >
          <div className="glass rounded-3xl p-4 flex items-center justify-between shadow-2xl border-white/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${incomingCall.id}`}
                  alt={incomingCall.name}
                  className="w-12 h-12 rounded-2xl object-cover shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary text-white rounded-full border-2 border-white flex items-center justify-center">
                  {incomingCall.type === 'video' ? <Video size={10} /> : <Phone size={10} />}
                </div>
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-black text-text tracking-tight">{incomingCall.name}</h4>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">
                  Incoming {incomingCall.type} call...
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleReject}
                className="p-3 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-90"
              >
                <PhoneOff size={20} />
              </button>
              <button 
                onClick={handleAccept}
                className="p-3 bg-green-500 text-white rounded-2xl shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all active:scale-90"
              >
                <Phone size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
