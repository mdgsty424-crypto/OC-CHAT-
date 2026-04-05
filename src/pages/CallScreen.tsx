import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc, getDoc, addDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, CallSession } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Sparkles, Sun, Ghost, Palette, X, Check, Sliders, Phone, PhoneOff, Video } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSettings } from '../hooks/useSettings';

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
  const { isMuted } = useSettings();
  const { sendNotification } = useNotifications();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Audio pre-loading
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    // Pre-load sounds
    const sounds = ['ringtone'];
    sounds.forEach(sound => {
      const audio = new Audio(`/assets/sounds/${sound}.mp3`);
      audio.load();
      audio.loop = true;
      audioRefs.current[sound] = audio;
    });
  }, []);

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
            await updateDoc(doc(db, 'calls', callId), {
              status: 'ended',
              reason: 'no_answer'
            });
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
    if (!currentUser || !containerRef.current) return;

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
            await updateDoc(doc(db, 'calls', callId), {
              status: 'ended',
              endTime: new Date().toISOString()
            });

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
              await addDoc(collection(db, 'chats', chatId, 'messages'), {
                chatId,
                senderId: currentUser?.uid,
                type: 'call_history',
                status: 'ended',
                timestamp: new Date().toISOString(),
                callType: type,
                duration: timer
              });
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

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      <style>
        {`
          #call-container video {
            filter: ${filterStyle};
            transition: filter 0.3s ease;
          }
          .effects-scroll::-webkit-scrollbar {
            display: none;
          }
          .effects-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>

      {/* Custom Header Overlay */}
      {!isGroup && otherUser && (
        <div className="absolute top-0 left-0 w-full p-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <img 
              src={otherUser.photoURL || `https://ui-avatars.com/api/?name=${otherUser.displayName}`} 
              alt={otherUser.displayName}
              className="w-10 h-10 rounded-full border-2 border-white"
              referrerPolicy="no-referrer"
            />
            <span className="text-white font-bold text-lg">{otherUser.displayName}</span>
          </div>
          <div className="text-white font-mono text-lg bg-black/30 px-3 py-1 rounded-full">
            {formatTime(timer)}
          </div>
        </div>
      )}

      <div 
        ref={containerRef} 
        className="w-full h-full"
        id="call-container"
      />

      {/* Calling/Ringing Overlay */}
      <AnimatePresence>
        {(callStatus === 'calling' || callStatus === 'ringing' || callStatus === 'no_answer') && isCaller && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-6"
          >
            {/* Background Blur Effect */}
            <div className="absolute inset-0 opacity-30">
              <img 
                src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName}`} 
                alt="background"
                className="w-full h-full object-cover blur-3xl scale-110"
              />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-8">
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    "0 0 0 0px rgba(99, 102, 241, 0)",
                    "0 0 0 20px rgba(99, 102, 241, 0.2)",
                    "0 0 0 0px rgba(99, 102, 241, 0)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="relative"
              >
                <img 
                  src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName}`} 
                  alt={otherUser?.displayName}
                  className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-2xl"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-black">
                  {type === 'video' ? <Video className="w-5 h-5 text-white" /> : <Phone className="w-5 h-5 text-white" />}
                </div>
              </motion.div>

              <div className="text-center">
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                  {otherUser?.displayName || 'User'}
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <span className={cn(
                    "text-lg font-bold tracking-widest uppercase transition-all duration-500",
                    callStatus === 'no_answer' ? "text-red-500" : "text-indigo-400 animate-pulse"
                  )}>
                    {callStatus === 'calling' && 'Calling...'}
                    {callStatus === 'ringing' && 'Ringing...'}
                    {callStatus === 'no_answer' && 'No Answer'}
                  </span>
                </div>
              </div>

              {callStatus !== 'no_answer' && (
                <div className="mt-12">
                  <button
                    onClick={() => zpRef.current?.hangUp()}
                    className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors active:scale-90"
                  >
                    <PhoneOff className="w-8 h-8 text-white" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Magic Wand Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowEffects(!showEffects)}
        className={`absolute bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center z-50 shadow-lg transition-colors ${
          showEffects ? 'bg-indigo-600 text-white' : 'bg-white/20 backdrop-blur-md text-white border border-white/30'
        }`}
      >
        <Wand2 className="w-7 h-7" />
      </motion.button>

      {/* Effects Menu */}
      <AnimatePresence>
        {showEffects && (
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            className="absolute bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 p-6 pb-10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveTab('beauty')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeTab === 'beauty' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Beauty
                </button>
                <button 
                  onClick={() => setActiveTab('filters')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeTab === 'filters' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Filters
                </button>
                <button 
                  onClick={() => setActiveTab('advanced')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeTab === 'advanced' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Advanced
                </button>
              </div>
              <button onClick={() => setShowEffects(false)} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-x-auto flex gap-6 pb-2 effects-scroll">
              {activeTab === 'beauty' && BEAUTY_EFFECTS.map((effect) => (
                <div key={effect.id} className="flex flex-col items-center gap-3 min-w-[80px]">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">
                    {effect.icon}
                  </div>
                  <span className="text-xs text-white/80 whitespace-nowrap">{effect.label}</span>
                  <input 
                    type="range" 
                    min={effect.min} 
                    max={effect.max} 
                    value={beautyParams[effect.id as keyof typeof beautyParams]}
                    onChange={(e) => setBeautyParams(prev => ({ ...prev, [effect.id]: parseInt(e.target.value) }))}
                    className="w-20 accent-indigo-500"
                  />
                  <span className="text-[10px] text-white/40">{beautyParams[effect.id as keyof typeof beautyParams]}%</span>
                </div>
              ))}

              {activeTab === 'filters' && COLOR_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className="flex flex-col items-center gap-3 min-w-[80px]"
                >
                  <div 
                    className={`w-14 h-14 rounded-xl border-2 transition-all overflow-hidden ${
                      activeFilter === filter.id ? 'border-indigo-500 scale-110' : 'border-white/10'
                    }`}
                    style={{ filter: filter.filter }}
                  >
                    <img 
                      src="https://picsum.photos/seed/filter-preview/100/100" 
                      alt={filter.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className={`text-xs whitespace-nowrap ${activeFilter === filter.id ? 'text-indigo-400 font-bold' : 'text-white/60'}`}>
                    {filter.label}
                  </span>
                </button>
              ))}

              {activeTab === 'advanced' && (
                <>
                  <button
                    onClick={() => setLowLightBoost(!lowLightBoost)}
                    className="flex flex-col items-center gap-3 min-w-[80px]"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-colors ${
                      lowLightBoost ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'
                    }`}>
                      <Sun className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-white/80 whitespace-nowrap">Low Light</span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${lowLightBoost ? 'bg-indigo-500' : 'bg-white/20'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${lowLightBoost ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                  </button>

                  <div className="flex flex-col items-center gap-3 min-w-[80px] opacity-50">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">
                      👁️
                    </div>
                    <span className="text-xs text-white/80 whitespace-nowrap">Big Eyes</span>
                    <span className="text-[10px] text-indigo-400">Pro Only</span>
                  </div>

                  <div className="flex flex-col items-center gap-3 min-w-[80px] opacity-50">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">
                      👤
                    </div>
                    <span className="text-xs text-white/80 whitespace-nowrap">Slim Face</span>
                    <span className="text-[10px] text-indigo-400">Pro Only</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
