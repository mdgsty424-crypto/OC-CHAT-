import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, addDoc, collection, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, CallSession } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { cn } from '../lib/utils';
import { useGlobalSettings } from '../hooks/useGlobalSettings';
import { initDB } from '../lib/db';
import { Phone, Video, MoreVertical, Mic, MicOff, CameraOff, RefreshCw, Volume2, X } from 'lucide-react';

export default function CallScreen() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<ZegoUIKitPrebuilt | null>(null);
  
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');

  const type = searchParams.get('type') || 'audio';
  const callIdFromUrl = searchParams.get('callId');
  const isVideo = type === 'video';

  // NEW CREDENTIALS
  const appID = 49448835;
  const appSign = '878421378237b2b8c5ea4c6e83484749f13631b3d5f1306d7614df6cf94781f8';

  // 1. Wake up hardware
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .catch(err => console.error("Hardware wake-up failed:", err));
  }, []);

  // 2. Fetch other user details
  useEffect(() => {
    if (!id) return;
    const fetchUser = async () => {
      const dbInstance = await initDB();
      const localUser = await dbInstance.get('users', id);
      if (localUser) setOtherUser(localUser as User);
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as User;
        setOtherUser(userData);
        await dbInstance.put('users', userData);
      }
    };
    fetchUser();
  }, [id]);

  // 3. Firestore Signaling
  useEffect(() => {
    if (!currentUser || !id) return;
    let unsubscribe: () => void;
    const startSignaling = async () => {
      if (callIdFromUrl) {
        const callRef = doc(db, 'calls', callIdFromUrl);
        unsubscribe = onSnapshot(callRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as CallSession;
            setCallSession({ id: snapshot.id, ...data });
            setCallStatus(data.status as any);
            if (data.status === 'ended') navigate(-1);
          }
        });
      } else {
        const newCall = {
          callerId: currentUser.uid,
          receiverId: id,
          type: type,
          status: 'ringing',
          timestamp: new Date().toISOString(),
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'calls'), newCall);
        setCallSession({ id: docRef.id, ...newCall } as any);
        unsubscribe = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as CallSession;
            setCallStatus(data.status as any);
            if (data.status === 'ended') navigate(-1);
          }
        });
      }
    };
    startSignaling();
    return () => unsubscribe?.();
  }, [currentUser, id, callIdFromUrl, type, navigate]);

  // 4. ZegoUIKitPrebuilt Initialization
  useEffect(() => {
    if (!currentUser || !containerRef.current || !callSession) return;

    const initZego = async () => {
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        appSign,
        callSession.id,
        currentUser.uid,
        currentUser.displayName || currentUser.uid
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zpRef.current = zp;

      zp.joinRoom({
        container: containerRef.current!,
        sharedLinks: [],
        scenario: {
          mode: isVideo ? ZegoUIKitPrebuilt.VideoCall : ZegoUIKitPrebuilt.OneONoneCall,
        },
        turnOnCameraWhenJoining: true,
        turnOnMicrophoneWhenJoining: true,
        useFrontFacingCamera: true,
        showPreJoinView: false,
        showAudioVideoSettingsButtonInPreJoinView: false,
        onJoinRoom: () => setCallStatus('connected'),
      });
    };

    initZego();

    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
    };
  }, [currentUser, callSession, isVideo]);

  const handleHangUp = async () => {
    if (callSession) {
      await updateDoc(doc(db, 'calls', callSession.id), { status: 'ended' });
    }
    navigate(-1);
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-[#0b141a]">
      {/* WhatsApp Patterned Wallpaper (z-0) */}
      <div className="absolute inset-0 bg-[#0b141a] z-0">
        <div 
          className="absolute inset-0 opacity-[0.05] invert" 
          style={{ 
            backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
            backgroundSize: '400px'
          }} 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b141a]/50 via-transparent to-[#0b141a]" />
      </div>

      {/* Zego Video Container (z-10) */}
      <div ref={containerRef} className="absolute inset-0 z-[10] video-container bg-transparent" />

      {/* Top Action Icons (z-20) */}
      <div className="absolute top-8 left-6 right-6 flex justify-between text-white z-[20]">
        <button className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors" onClick={handleHangUp}><X size={20} /></button>
        <button className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><RefreshCw size={20} /></button>
      </div>

      {/* Center Profile UI (z-20) - Only visible if not connected */}
      {callStatus !== 'connected' && (
        <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center gap-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-150" />
            <img 
              src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName}`} 
              alt={otherUser?.displayName}
              className="w-44 h-44 rounded-full border-4 border-white/10 shadow-2xl relative z-10 object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-center px-6">
            <h2 className="font-black text-white flex items-center justify-center gap-2 tracking-tight text-4xl">
              {otherUser?.displayName || 'User'}
              {otherUser?.verified && <VerifiedBadge size={28} className="animate-pulse" />}
            </h2>
            <p className="text-primary font-black text-sm uppercase tracking-[0.3em] mt-4 animate-pulse">
              Ringing...
            </p>
          </div>
        </div>
      )}

      {/* Control Bar (z-20) */}
      <div className="absolute bottom-12 left-6 right-6 z-[20] flex justify-center">
        <div className="bg-[#1f2c34]/95 backdrop-blur-2xl rounded-[2.5rem] p-4 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
          <button className="p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all"><MoreVertical size={22} /></button>
          <button className="p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all"><Video size={22} /></button>
          <button className="p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all"><Volume2 size={22} /></button>
          <button className="p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all"><Mic size={22} /></button>
          <button className="p-5 rounded-2xl bg-red-500 text-white shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95" onClick={handleHangUp}>
            <Phone className="rotate-[135deg]" size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
