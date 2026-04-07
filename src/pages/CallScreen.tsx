import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc, getDoc, addDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, CallSession } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Sparkles, Sun, Ghost, Palette, X, Check, Sliders, Phone, PhoneOff, Video, MoreVertical, Volume2, Mic, MicOff, UserPlus, RefreshCw, CameraOff } from 'lucide-react';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { cn } from '../lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useAppAssets } from '../hooks/useAppAssets';
import { useNetwork } from '../hooks/useNetwork';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

import { useNotifications } from '../hooks/useNotifications';

const BEAUTY_EFFECTS = [
  { id: 'smooth', label: 'Smoothing', icon: '✨', min: 0, max: 100 },
  { id: 'whiten', label: 'Whitening', icon: '🧖‍♀️', min: 0, max: 100 },
  { id: 'rosy', label: 'Rosy', icon: '🌸', min: 0, max: 100 },
  { id: 'sharpen', label: 'Sharpen', icon: '🔪', min: 0, max: 100 },
];

const COLOR_FILTERS = [
  { id: 'none', label: 'Original', filter: 'none' },
  { id: 'natural', label: 'Natural', filter: 'contrast(1.1) saturate(1.1)' },
  { id: 'warm', label: 'Warm', filter: 'sepia(0.3) saturate(1.2) contrast(1.1)' },
  { id: 'cool', label: 'Cool', filter: 'hue-rotate(180deg) saturate(1.1) brightness(1.1)' },
  { id: 'bw', label: 'B&W', filter: 'grayscale(1)' },
  { id: 'vivid', label: 'Vivid', filter: 'saturate(2) contrast(1.2)' },
];

export default function CallScreen() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { settings: globalSettings } = useGlobalSettings();
  const { isMuted } = useSettings();
  const assets = useAppAssets();
  const { isOnline } = useNetwork();
  const { sendNotification } = useNotifications();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Audio pre-loading
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    // Pre-load sounds
    const audio = new Audio(assets.ringtone);
    audio.load();
    audio.loop = true;
    audioRefs.current['ringtone'] = audio;
  }, [assets]);

  const playSound = (soundName: string) => {
    if (isMuted) return;
    const audio = audioRefs.current[soundName];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.log("Audio play blocked", e));
    }
  };

  const stopSound = (soundName: string) => {
    const audio = audioRefs.current[soundName];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  const zpRef = useRef<any>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [timer, setTimer] = useState(0);

  // Effects State
  const [showEffects, setShowEffects] = useState(false);
  const [activeTab, setActiveTab] = useState<'beauty' | 'filters' | 'advanced'>('beauty');
  const [beautyParams, setBeautyParams] = useState({
    smooth: 0,
    whiten: 0,
    rosy: 0,
    sharpen: 0,
  });
  const [lowLightBoost, setLowLightBoost] = useState(false);
  const [activeFilter, setActiveFilter] = useState('none');

  // Call Status State
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'no_answer'>('calling');
  const [isCaller, setIsCaller] = useState(false);

  const type = searchParams.get('type') || 'audio';
  const callId = searchParams.get('callId');
  const chatId = searchParams.get('chatId');
  const isGroup = searchParams.get('isGroup') === 'true';

  useEffect(() => {
    if (id && !isGroup) {
      getDoc(doc(db, 'users', id)).then((docSnap) => {
        if (docSnap.exists()) {
          setOtherUser({ ...docSnap.data(), uid: docSnap.id } as User);
        }
      });
    }
  }, [id, isGroup]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  useEffect(() => {
    if (callStatus === 'calling' || callStatus === 'ringing') {
      playSound('ringtone');
    } else {
      stopSound('ringtone');
    }
    return () => stopSound('ringtone');
  }, [callStatus, isMuted]);

  useEffect(() => {
    if (callId) {
      const unsubscribe = onSnapshot(doc(db, 'calls', callId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as CallSession;
          setIsCaller(data.callerId === currentUser?.uid);
          
          if (data.status === 'connected') {
            setCallStatus('connected');
          } else if (data.status === 'ringing') {
            setCallStatus('ringing');
          } else if (data.status === 'ended') {
            // Handle remote hangup if needed, but zp.joinRoom usually handles this
          }
        }
      });

      // 30-second timeout for "No Answer"
      const timeout = setTimeout(async () => {
        if (callStatus === 'calling' || callStatus === 'ringing') {
          setCallStatus('no_answer');
          // Update Firestore to end the call
          try {
            updateDoc(doc(db, 'calls', callId), {
              status: 'ended',
              reason: 'no_answer'
            }).catch(e => console.error("Error updating call status to no_answer:", e));
          } catch (error) {
            console.error("Error updating call status to no_answer:", error);
          }
          // Automatically close after 3 seconds of showing "No Answer"
          setTimeout(() => navigate(-1), 3000);
        }
      }, 30000);

      return () => {
        unsubscribe();
        clearTimeout(timeout);
      };
    }
  }, [callId, currentUser?.uid, callStatus, navigate]);

  useEffect(() => {
    if (!currentUser || !containerRef.current || !isOnline) return;

    const appID = 1698335343;
    const serverSecret = '827755ef5ec4c06648bc783998a6d0c2';
    
    // For direct calls, use callId as roomID.
    const roomID = callId || id || 'default-room';
    const userID = currentUser.uid;
    const userName = currentUser.displayName || `User_${userID.slice(0, 4)}`;

    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID,
      serverSecret,
      roomID,
      userID,
      currentUser.displayName || `User_${userID.slice(0, 4)}`
    );

    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zpRef.current = zp;

    zp.joinRoom({
      container: containerRef.current,
      showPreJoinView: false, // Disable pre-join screen
      scenario: {
        mode: isGroup ? ZegoUIKitPrebuilt.GroupCall : ZegoUIKitPrebuilt.OneONoneCall,
      },
      showUserInVideo: true,
      addLeaveConfirmation: true,
      turnOnMicrophoneWhenJoining: true, // Auto-join with mic on
      turnOnCameraWhenJoining: true, // Auto-join with camera on
      showScreenSharingButton: true,
      showTextChat: true,
      showUserList: true,
      maxUsers: isGroup ? 50 : 2,
      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: true,
      showBackgroundProcessButton: true,
      layout: isGroup ? "Grid" : "Auto",
      showLayoutButton: isGroup,
      onLeaveRoom: async () => {
        if (callId) {
          try {
            updateDoc(doc(db, 'calls', callId), {
              status: 'ended',
              endTime: new Date().toISOString()
            }).catch(e => console.error("Error updating call end status:", e));

            // Send Call Dismiss Notification to other user
            if (id && !isGroup) {
              sendNotification({
                targetUserId: id,
                title: "Call Ended",
                message: "The caller has hung up.",
                priority: 'normal',
                sound: 'silent' // Or a silent sound file if available
              });
            }
            
            // Add call history message to chat
            if (chatId) {
              addDoc(collection(db, 'chats', chatId, 'messages'), {
                chatId,
                senderId: currentUser?.uid,
                type: 'call_history',
                status: 'ended',
                timestamp: new Date().toISOString(),
                callType: type,
                duration: timer
              }).catch(e => console.error("Error adding call history:", e));
            }
          } catch (error) {
            console.error("Error ending call:", error);
          }
        }
        // Navigate back to chat if possible
        navigate(-1);
      },
    } as any);

    return () => {
      zp.destroy();
      zpRef.current = null;
    };
  }, [currentUser, id, callId, type, isGroup, navigate]);

  // Apply Beauty Effects
  useEffect(() => {
    if (zpRef.current && zpRef.current.express) {
      // We need to wait for localStream to be available
      const applyBeauty = async () => {
        try {
          // Zego UIKit Prebuilt might take a moment to initialize the local stream
          const localStream = zpRef.current.localStream;
          if (localStream) {
            await zpRef.current.express.setEffectsBeauty(localStream, true, {
              smoothIntensity: beautyParams.smooth,
              whitenIntensity: beautyParams.whiten,
              rosyIntensity: beautyParams.rosy,
              sharpenIntensity: beautyParams.sharpen,
            });
          }
        } catch (error) {
          console.error("Error applying beauty effects:", error);
        }
      };
      applyBeauty();
    }
  }, [beautyParams, showEffects]); // Re-apply when params change or menu opens

  // Apply Low Light Boost
  useEffect(() => {
    if (zpRef.current && zpRef.current.express) {
      const applyLowLight = async () => {
        try {
          const localStream = zpRef.current.localStream;
          if (localStream) {
            await zpRef.current.express.setLowlightEnhancement(localStream, lowLightBoost ? 1 : 0);
          }
        } catch (error) {
          console.error("Error applying low light boost:", error);
        }
      };
      applyLowLight();
    }
  }, [lowLightBoost]);

  const filterStyle = COLOR_FILTERS.find(f => f.id === activeFilter)?.filter || 'none';

  const isVideo = type === 'video';
  const isConnected = callStatus === 'connected';

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  return (
    <div className="w-screen h-screen bg-[#0b141a] relative overflow-hidden">
      {/* Zego Container for Video Call */}
      <div 
        ref={containerRef} 
        className={cn("w-full h-full", !isVideo && "hidden")}
        id="call-container"
      />

      {/* Audio Call Background (WhatsApp Style) */}
      {!isVideo && (
        <div className="absolute inset-0 z-0 bg-[#0b141a]">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />
        </div>
      )}

      {/* Overlay UI */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-6">
        {/* Top Controls */}
        <div className="flex justify-between items-center text-white mt-4">
          <button className="p-2 bg-white/10 rounded-full"><MoreVertical /></button>
          
          {/* User Info (Video Call) */}
          {isVideo && otherUser && (
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
              <span className="font-bold">{otherUser.displayName}</span>
              {otherUser.verified && <VerifiedBadge size={globalSettings.badgeSize} />}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button className="p-2 bg-white/10 rounded-full"><UserPlus /></button>
            {isVideo && (
              <button 
                className="p-2 bg-white/10 rounded-full" 
                onClick={() => {
                  const newState = !isFrontCamera;
                  setIsFrontCamera(newState);
                  zpRef.current?.useFrontFacingCamera(newState);
                }}
              >
                <RefreshCw />
              </button>
            )}
          </div>
        </div>

        {/* Center UI (Audio Call) */}
        {!isVideo && (
          <div className="flex flex-col items-center justify-center flex-grow gap-6">
            <div className="relative">
              <img 
                src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName}`} 
                alt={otherUser?.displayName}
                className="w-40 h-40 rounded-full border-4 border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
                {otherUser?.displayName || 'User'}
                {otherUser?.verified && <VerifiedBadge size={globalSettings.badgeSize} />}
              </h2>
              <p className="text-white/70 text-lg mt-1 font-medium">
                {callStatus === 'connected' ? formatTime(timer) : 'Calling...'}
              </p>
            </div>
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="flex justify-center mb-12">
          <div className="bg-[#1f2c34]/90 backdrop-blur-md rounded-full p-4 flex items-center gap-4 shadow-xl border border-white/10">
            <button className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20"><MoreVertical /></button>
            <button 
              className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                const newState = !isCameraOn;
                setIsCameraOn(newState);
                zpRef.current?.setCameraOn(newState);
              }}
            >
              {isCameraOn ? <Video /> : <CameraOff />}
            </button>
            <button 
              className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                const newState = !isSpeakerOn;
                setIsSpeakerOn(newState);
                zpRef.current?.setSpeaker(newState);
              }}
            >
              <Volume2 />
            </button>
            <button 
              className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                const newState = !isMicOn;
                setIsMicOn(newState);
                zpRef.current?.muteMicrophone(!newState);
              }}
            >
              {isMicOn ? <Mic /> : <MicOff />}
            </button>
            <button 
              className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg"
              onClick={() => zpRef.current?.hangUp()}
            >
              <Phone className="w-6 h-6 rotate-[135deg]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
