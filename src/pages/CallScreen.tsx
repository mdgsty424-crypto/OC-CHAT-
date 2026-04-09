import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import ZIM from 'zego-zim-web';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, addDoc, collection, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, CallSession } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { cn } from '../lib/utils';
import { useGlobalSettings } from '../hooks/useGlobalSettings';
import { initDB } from '../lib/db';
import { Phone, Video, MoreVertical, Mic, MicOff, CameraOff, RefreshCw, Volume2, X, Loader2 } from 'lucide-react';

export default function CallScreen() {
  // 1. Hooks at the top
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { settings: globalSettings } = useGlobalSettings();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const zpRef = useRef<any>(null);
  const isJoined = useRef(false);
  const signalingStarted = useRef(false);
  
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');

  const type = searchParams.get('type') || 'audio';
  const callIdFromUrl = searchParams.get('callId');
  const isVideo = type === 'video';

  // NEW CREDENTIALS
  const appID = 501273512;
  const serverSecret = '4faa5da6007626b30263079ee01729bb';

  // 2. Camera Wake-up & Instant Local Preview
  useEffect(() => {
    if (!isVideo) return;

    let stream: MediaStream | null = null;
    const startPreview = async () => {
      try {
        // Wake up camera hardware immediately
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: true 
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Native camera access failed:", err);
      }
    };

    startPreview();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isVideo]);

  // 3. Fetch other user details (Instant UI)
  useEffect(() => {
    if (!id) return;

    const fetchUser = async () => {
      // Try local first for instant UI
      const dbInstance = await initDB();
      const localUser = await dbInstance.get('users', id);
      if (localUser) setOtherUser(localUser as User);

      // Then fetch from Firestore
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
    if (!currentUser || !id || signalingStarted.current) return;
    signalingStarted.current = true;

    let unsubscribe: () => void;

    const startSignaling = async () => {
      if (callIdFromUrl) {
        // RECEIVER: Listen to existing session
        const callRef = doc(db, 'calls', callIdFromUrl);
        unsubscribe = onSnapshot(callRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as CallSession;
            setCallSession({ id: snapshot.id, ...data });
            setCallStatus(data.status as any);
            if (data.status === 'ended') {
              navigate(-1);
            }
          }
        });
      } else {
        // CALLER: Create new session
        try {
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
              if (data.status === 'ended') {
                navigate(-1);
              }
            }
          });
        } catch (error) {
          console.error("Error creating call session:", error);
          navigate(-1);
        }
      }
    };

    startSignaling();
    return () => {
      unsubscribe?.();
      signalingStarted.current = false;
    };
  }, [currentUser, id, callIdFromUrl, type, navigate]);

  // 4. Zego Background Connect
  const initZego = useCallback(async () => {
    if (!currentUser || !containerRef.current || isJoined.current || !id || !otherUser || !callSession) return;
    
    // Only join if connected (for receiver) or if we are the caller
    const isCaller = callSession.callerId === currentUser.uid;
    
    // If we are the receiver and not connected yet, wait.
    if (!isCaller && callStatus !== 'connected') return;

    console.log("Initializing Zego with NEW CREDENTIALS. Session:", callSession.id);

    const roomID = callSession.id;
    const userID = currentUser.uid;
    const userName = currentUser.displayName || currentUser.uid;

    try {
      isJoined.current = true; // Set early to prevent race conditions
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID, userID, userName);
      const zp = ZegoUIKitPrebuilt.create(kitToken);
      
      (window as any).ZIM = ZIM;
      zp.addPlugins({ ZIM });
      
      zpRef.current = zp;

      zp.joinRoom({
        container: containerRef.current,
        showPreJoinView: false,
        turnOnCameraWhenJoining: true,
        turnOnMicrophoneWhenJoining: true,
        showMyVideoView: true,
        showMyCaptionInVideoView: true,
        showAudioVideoSettingsButtonInPreJoinView: false,
        enableVideoMirroring: true,
        layout: { mode: "PictureInPicture" },
        showMyCameraSelfViewInVideoCall: true,
        showMySelfTimer: true,
        useFrontCameraDevice: true,
        showMyCameraToggleButton: true,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
        onJoinRoom: () => {
          console.log("Joined Zego room successfully");
          setIsLoading(false);
          // Stop native preview to let Zego take over
          if (localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
          }
        },
        onLeaveRoom: () => {
          console.log("Local user left Zego room");
        },
        onError: (error: any) => {
          console.error("Zego error:", error);
          // Only hang up on critical disconnection errors
          if (error?.code === 1002 || error?.code === 1005) {
            handleHangUp();
          }
        }
      } as any);
    } catch (error) {
      console.error("Failed to init Zego:", error);
      isJoined.current = false;
      setIsLoading(false);
    }
  }, [currentUser?.uid, id, otherUser?.uid, callSession?.id, callStatus, isVideo]);

  const handleHangUp = async () => {
    if (callSession) {
      await updateDoc(doc(db, 'calls', callSession.id), {
        status: 'ended'
      });
    }
    if (zpRef.current) {
      zpRef.current.destroy();
      zpRef.current = null;
    }
    navigate(-1);
  };

  useEffect(() => {
    initZego();
    return () => {
      // We don't destroy here to keep the connection alive if it's just a re-render
      // The actual cleanup happens in handleHangUp or when the component is truly unmounted
    };
  }, [initZego]);

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
      isJoined.current = false;
    };
  }, []);

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-[#0b141a]">
      {/* WhatsApp Patterned Wallpaper (Instant UI) */}
      <div className={cn("absolute inset-0 bg-[#0b141a] z-0", isVideo && callStatus === 'connected' && !isLoading && "hidden")}>
        <div 
          className="absolute inset-0 opacity-[0.05] invert" 
          style={{ 
            backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
            backgroundSize: '400px'
          }} 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b141a]/50 via-transparent to-[#0b141a]" />
      </div>

      {/* Video Container Wrapper */}
      <div className="absolute inset-0 z-50 position-relative video-container">
        <div ref={containerRef} className={cn("w-full h-full transition-opacity duration-500", (callStatus !== 'connected' || isLoading) ? "opacity-0 pointer-events-none" : "opacity-100")} id="call-container" />
      </div>

      {/* Instant Local Preview (Native) */}
      {isVideo && isLoading && (
        <div className="absolute inset-0 z-[5] bg-black">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover mirror"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        </div>
      )}

      {/* Top Action Icons */}
      <div className="absolute top-8 left-6 right-6 flex justify-between text-white z-[60]">
        <button className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors" onClick={handleHangUp}><X size={20} /></button>
        <button className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors" onClick={() => zpRef.current?.useFrontFacingCamera(!zpRef.current?.isFrontFacingCamera())}><RefreshCw size={20} /></button>
      </div>

      {/* Center Profile UI (Instant UI) */}
      <div className={cn(
        "absolute inset-0 z-[60] flex flex-col items-center transition-all duration-700",
        (callStatus === 'connected' && !isLoading) ? "pt-12" : "justify-center gap-8"
      )}>
        <div className={cn(
          "relative transition-all duration-700",
          (callStatus === 'connected' && !isLoading) ? "scale-50 opacity-0 pointer-events-none h-0" : "scale-100"
        )}>
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-150" />
          <img 
            src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName}`} 
            alt={otherUser?.displayName}
            className="w-44 h-44 rounded-full border-4 border-white/10 shadow-2xl relative z-10 object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className={cn(
          "text-center px-6 transition-all duration-700",
          (callStatus === 'connected' && !isLoading) ? "mt-0" : "mt-0"
        )}>
          <h2 className={cn(
            "font-black text-white flex items-center justify-center gap-2 tracking-tight transition-all duration-700",
            (callStatus === 'connected' && !isLoading) ? "text-xl opacity-80" : "text-4xl"
          )}>
            {otherUser?.displayName || 'User'}
            {otherUser?.verified && <VerifiedBadge size={ (callStatus === 'connected' && !isLoading) ? 18 : 28} className="animate-pulse" />}
          </h2>
          <p className={cn(
            "text-primary font-black text-sm uppercase tracking-[0.3em] mt-4 animate-pulse transition-opacity duration-700",
            (callStatus === 'connected' && !isLoading) ? "opacity-0" : "opacity-100"
          )}>
            {callStatus === 'ringing' ? 'Ringing...' : 'Connected'}
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-12 left-6 right-6 z-[70] flex justify-center">
        <div className="bg-[#1f2c34]/95 backdrop-blur-2xl rounded-[2.5rem] p-4 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
          <button className="p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all"><MoreVertical size={22} /></button>
          <button className="p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all" onClick={() => { 
            setIsCameraOn(!isCameraOn);
            // Note: Toggling via custom UI requires Zego SDK internal methods or custom signaling
            // For now we update state to reflect UI, but rely on Zego built-in controls if available
          }}>{isCameraOn ? <Video size={22} /> : <CameraOff size={22} />}</button>
          <button className="p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all" onClick={() => { 
            setIsSpeakerOn(!isSpeakerOn);
          }}><Volume2 size={22} /></button>
          <button className="p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all" onClick={() => { 
            setIsMicOn(!isMicOn);
          }}>{isMicOn ? <Mic size={22} /> : <MicOff size={22} />}</button>
          <button className="p-5 rounded-2xl bg-red-500 text-white shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95" onClick={handleHangUp}>
            <Phone className="rotate-[135deg]" size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
