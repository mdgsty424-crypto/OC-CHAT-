import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import ZIM from 'zego-zim-web';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { cn } from '../lib/utils';
import { useGlobalSettings } from '../hooks/useGlobalSettings';
import { initDB } from '../lib/db';
import { Phone, Video, MoreVertical, Mic, MicOff, CameraOff, UserPlus, RefreshCw, Volume2 } from 'lucide-react';

export default function CallScreen() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { settings: globalSettings } = useGlobalSettings();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<any>(null);
  const isJoined = useRef(false);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const type = searchParams.get('type') || 'audio';
  const callId = searchParams.get('callId');
  const isVideo = type === 'video';

  // Offline-first user fetch
  useEffect(() => {
    if (!id) return;

    const fetchUser = async () => {
      // Try IndexedDB first
      const dbInstance = await initDB();
      const localUser = await dbInstance.get('users', id);
      if (localUser) setOtherUser(localUser as User);

      // Then Firestore
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as User;
        setOtherUser(userData);
        await dbInstance.put('users', userData);
      }
    };
    fetchUser();
  }, [id]);

  // Zego Initialization
  useEffect(() => {
    if (!currentUser || !containerRef.current || isJoined.current) return;

    const appID = 1698335343;
    const serverSecret = '827755ef5ec4c06648bc783998a6d0c2';
    
    // Universal Room ID: Always join callerID and receiverID sorted alphabetically
    const roomID = [currentUser.uid, id].sort().join('_');
    const userID = currentUser.uid;

    let zp = zpRef.current;
    if (!zp) {
      // Correct Token Logic: Generate using permanent uid
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID, userID, currentUser.displayName || 'User');
      zp = ZegoUIKitPrebuilt.create(kitToken);
      
      // Force ZIM Login
      zp.addPlugins({ ZIM }); 
      zpRef.current = zp;
    }

    isJoined.current = true;
    
    try {
      zp.joinRoom({
        container: containerRef.current,
        showPreJoinView: false, // Auto-Join Logic
        showMyCameraSelfViewInVideoCall: true,
        showMySelfTimer: true,
        turnOnCameraWhenJoining: true, // Auto-Join Logic
        useFrontCameraDevice: true,
        scenario: { mode: ZegoUIKitPrebuilt.OneONoneVideoCall },
        onJoinRoom: () => {
          console.log("Successfully joined Zego room:", roomID);
          setIsLoading(false);
        },
        onLeaveRoom: () => navigate(-1),
        onError: (error: any) => {
          console.error("Zego joinRoom error:", error);
          if (error?.code === 1002011) {
            alert("Login room failed. Please check your connection and try again.");
          } else if (error?.code === 107026) {
            // Error Handling: Show 'User is Offline' toast/alert
            alert("User is Offline or Not Registered.");
          } else {
            alert("Connection failed. Please try again.");
          }
          setIsLoading(false);
          navigate(-1);
        }
      });
    } catch (error) {
      console.error("Failed to join Zego room:", error);
      setIsLoading(false);
      navigate(-1);
    }

    return () => {
      isJoined.current = false;
      zpRef.current = null;
    };
  }, [currentUser, id, navigate]);

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-[#0b141a]">
      {/* Background */}
      <div className={cn("absolute inset-0 bg-gradient-to-b from-[#0b141a] to-[#050a0d]", isVideo && "hidden")}>
        <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />
      </div>

      {/* Video Container */}
      <div ref={containerRef} className={cn("w-full h-full z-10", (!isVideo || isLoading) && "hidden")} id="call-container" />

      {/* Top Action Icons */}
      <div className="absolute top-8 left-6 right-6 flex justify-between text-white z-20">
        <button className="p-3 bg-white/10 rounded-full"><UserPlus size={20} /></button>
        <button className="p-3 bg-white/10 rounded-full" onClick={() => zpRef.current?.useFrontFacingCamera(!zpRef.current?.isFrontFacingCamera())}><RefreshCw size={20} /></button>
      </div>

      {/* Center Profile UI (Audio Call or Loading) */}
      {(!isVideo || isLoading) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6">
          <img 
            src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName}`} 
            alt={otherUser?.displayName}
            className="w-40 h-40 rounded-full border-4 border-white/10 shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white flex items-center justify-center gap-2">
              {otherUser?.displayName || 'User'}
              {otherUser?.verified && <VerifiedBadge size={globalSettings.badgeSize} className="animate-pulse" />}
            </h2>
            <p className="text-white/60 text-xl mt-2 font-medium">
              {isLoading ? 'Connecting...' : 'Calling...'}
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0b141a]/40 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Control Bar */}
      <div className="absolute bottom-12 left-6 right-6 z-50 flex justify-center">
        <div className="bg-[#1f2c34]/90 backdrop-blur-xl rounded-full p-3 flex items-center gap-4 shadow-2xl border border-white/10">
          <button className="p-4 rounded-full bg-white/5 text-white"><MoreVertical size={22} /></button>
          <button className="p-4 rounded-full bg-white/5 text-white" onClick={() => { 
            const newCamera = !isCameraOn;
            setIsCameraOn(newCamera);
            if (zpRef.current) zpRef.current.muteCamera(!newCamera);
          }}>{isCameraOn ? <Video size={22} /> : <CameraOff size={22} />}</button>
          <button className="p-4 rounded-full bg-white/5 text-white" onClick={() => { 
            const newSpeaker = !isSpeakerOn;
            setIsSpeakerOn(newSpeaker);
            if (zpRef.current) zpRef.current.setSpeaker(newSpeaker); 
          }}><Volume2 size={22} /></button>
          <button className="p-4 rounded-full bg-white/5 text-white" onClick={() => { 
            const newMic = !isMicOn;
            setIsMicOn(newMic);
            if (zpRef.current) zpRef.current.muteMicrophone(!newMic); 
          }}>{isMicOn ? <Mic size={22} /> : <MicOff size={22} />}</button>
          <button className="p-5 rounded-full bg-red-600 text-white shadow-lg" onClick={() => {
            if (zpRef.current) zpRef.current.hangUp();
            navigate('/');
          }}><Phone className="rotate-[135deg]" size={24} /></button>
        </div>
      </div>
    </div>
  );
}
