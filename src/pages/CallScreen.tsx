import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { cn } from '../lib/utils';
import { useGlobalSettings } from '../hooks/useGlobalSettings';
import { initDB } from '../lib/db';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Mic, 
  MicOff, 
  CameraOff, 
  UserPlus, 
  RefreshCw, 
  Volume2, 
  Wand2, 
  X, 
  MessageSquare, 
  ScreenShare, 
  Users, 
  Image as ImageIcon, 
  Wind, 
  Settings,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const APP_ID = 1698335343;
const APP_SIGN = 'd1647c6b9802ed758e1bf148914b80758d5b35061f3e8f76261c6187d55ab9fe';

const FILTERS = [
  { name: 'Normal', filter: 'none' },
  { name: 'Grayscale', filter: 'grayscale(100%)' },
  { name: 'Sepia', filter: 'sepia(100%)' },
  { name: 'Invert', filter: 'invert(100%)' },
  { name: 'Blur', filter: 'blur(5px)' },
  { name: 'Brightness', filter: 'brightness(150%)' },
  { name: 'Contrast', filter: 'contrast(200%)' },
  { name: 'Hue Rotate', filter: 'hue-rotate(90deg)' },
  { name: 'Saturate', filter: 'saturate(300%)' },
  { name: 'Vintage', filter: 'sepia(50%) contrast(120%) brightness(90%)' },
  { name: 'Cold', filter: 'hue-rotate(180deg) saturate(150%)' },
  { name: 'Warm', filter: 'sepia(30%) saturate(150%)' },
  { name: 'Dramatic', filter: 'contrast(150%) brightness(80%)' },
  { name: 'Noir', filter: 'grayscale(100%) contrast(150%)' },
  { name: 'Faded', filter: 'opacity(80%) brightness(110%)' },
  // Adding more to reach a large number as requested
  ...Array.from({ length: 85 }).map((_, i) => ({
    name: `Style ${i + 1}`,
    filter: `hue-rotate(${i * 10}deg) saturate(${100 + i}%) contrast(${100 + (i % 50)}%)`
  }))
];

export default function CallScreen() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { settings: globalSettings } = useGlobalSettings();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<any>(null);
  const [otherUser, setOtherUser] = useState<User | null>(() => {
    const paramName = searchParams.get('name');
    const paramPhoto = searchParams.get('photo');
    if (id && paramName) {
      return {
        uid: id,
        displayName: paramName,
        photoURL: paramPhoto || '',
        verified: true
      } as User;
    }
    return null;
  });
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState('none');
  const [isNightMode, setIsNightMode] = useState(false);

  const type = searchParams.get('type') || 'audio';
  const roomIDFromParam = searchParams.get('roomID');
  const callId = searchParams.get('callId');
  const isVideo = type === 'video';

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

  useEffect(() => {
    if (!currentUser || !containerRef.current) return;

    // Ensure roomID, userID, and userName are NOT empty
    const roomID = roomIDFromParam || callId || id || 'default_room';
    const userID = currentUser.uid || `user_${Math.floor(Math.random() * 1000)}`;
    const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';

    console.log("Generating Kit Token with:", { APP_ID, roomID, userID, userName });

    try {
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        APP_ID, 
        APP_SIGN, 
        roomID, 
        userID, 
        userName
      );
      
      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zpRef.current = zp;

      zp.joinRoom({
        container: containerRef.current,
        showPreJoinView: false,
        scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
        showMyCameraToggleButton: false,
        showMyMicrophoneToggleButton: false,
        showAudioVideoSettingsButton: false,
        showScreenSharingButton: false,
        showUserList: false,
        showTextChat: false,
        showLeaveRoomConfirmDialog: false,
        onLeaveRoom: () => navigate(-1),
      });
    } catch (error) {
      console.error("Zego joinRoom error:", error);
    }

    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
    };
  }, [currentUser, id, roomIDFromParam, callId, navigate]);

  const handleHangUp = () => {
    zpRef.current?.hangUp();
    navigate(-1);
  };

  const toggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    zpRef.current?.muteMicrophone(!newState);
  };

  const toggleCamera = () => {
    const newState = !isCameraOn;
    setIsCameraOn(newState);
    zpRef.current?.setCameraOn(newState);
  };

  const toggleSpeaker = () => {
    const newState = !isSpeakerOn;
    setIsSpeakerOn(newState);
    // ZegoUIKitPrebuilt might not have a direct setSpeaker for web in all versions, 
    // but we can try to find the audio element and mute it or use SDK methods if available
  };

  const flipCamera = () => {
    zpRef.current?.useFrontFacingCamera(!zpRef.current?.isFrontFacingCamera());
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-black font-sans">
      {/* Video Background */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full z-0" 
        style={{ filter: activeFilter }}
      />

      {/* Night Mode Ring Light Overlay */}
      <AnimatePresence>
        {isNightMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 pointer-events-none border-[40px] border-white/90 shadow-[inset_0_0_100px_rgba(255,255,255,0.8)]"
          />
        )}
      </AnimatePresence>

      {/* Top Header (Identity) */}
      <div className="absolute top-12 left-0 right-0 z-20 flex flex-col items-center gap-3">
        <div className="relative">
          {/* Flush Light Animation */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={cn(
              "absolute inset-0 rounded-full blur-xl",
              isNightMode ? "bg-white shadow-[0_0_30px_rgba(255,255,255,0.8)]" : "bg-primary"
            )}
          />
          
          {/* Profile Image */}
          <div className={cn(
            "relative w-24 h-24 rounded-full overflow-hidden border-4 z-10",
            isNightMode ? "border-white shadow-[0_0_20px_rgba(255,255,255,1)]" : "border-white/20"
          )}>
            <img 
              src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName}`} 
              alt={otherUser?.displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
          <h2 className="text-xl font-bold text-white">
            {otherUser?.displayName || 'User'}
          </h2>
          {otherUser?.verified && <VerifiedBadge size="sm" className="text-yellow-400" />}
        </div>

        {/* Night Mode Toggle */}
        <button 
          onClick={() => setIsNightMode(!isNightMode)}
          className={cn(
            "mt-2 p-2 rounded-full transition-all active:scale-95 flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
            isNightMode ? "bg-white text-black" : "bg-black/40 text-white border border-white/20"
          )}
        >
          {isNightMode ? <Sun size={14} /> : <Moon size={14} />}
          {isNightMode ? "Light ON" : "Light OFF"}
        </button>
      </div>

      {/* Floating Filter Icon (Middle Right) */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-30">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "p-4 rounded-full shadow-2xl transition-all active:scale-90",
            showFilters ? "bg-primary text-white" : "bg-white/10 backdrop-blur-xl text-white border border-white/20"
          )}
        >
          <Wand2 size={24} />
        </button>
      </div>

      {/* Filters List */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="absolute right-20 top-1/2 -translate-y-1/2 z-30 bg-black/60 backdrop-blur-2xl p-4 rounded-[2rem] border border-white/10 w-48 max-h-[60vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex flex-col gap-3">
              {FILTERS.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFilter(f.filter)}
                  className={cn(
                    "w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all text-left",
                    activeFilter === f.filter ? "bg-primary text-white" : "text-white/70 hover:bg-white/10"
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (WhatsApp Style) */}
      <div className="absolute bottom-12 left-0 right-0 z-40 flex flex-col items-center gap-6">
        {/* More Menu Pop-up */}
        <AnimatePresence>
          {showMoreMenu && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-[#1f2c34]/95 backdrop-blur-2xl rounded-[2.5rem] p-6 grid grid-cols-3 gap-6 border border-white/10 shadow-2xl mb-4 w-[90%] max-w-sm"
            >
              {[
                { icon: <MessageSquare size={20} />, label: 'Chat', action: () => zpRef.current?.showTextChat(true) },
                { icon: <ScreenShare size={20} />, label: 'Share', action: () => zpRef.current?.showScreenSharingButton(true) },
                { icon: <Users size={20} />, label: 'Members', action: () => zpRef.current?.showUserList(true) },
                { icon: <ImageIcon size={20} />, label: 'Virtual BG', action: () => {} },
                { icon: <Wind size={20} />, label: 'Noise', action: () => {} },
                { icon: <Settings size={20} />, label: 'Settings', action: () => zpRef.current?.showAudioVideoSettingsButton(true) },
              ].map((item, i) => (
                <button 
                  key={i} 
                  onClick={() => { item.action(); setShowMoreMenu(false); }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white group-hover:bg-primary transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-tighter">{item.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Control Bar */}
        <div className="bg-[#1f2c34]/90 backdrop-blur-2xl rounded-full p-3 flex items-center gap-4 shadow-2xl border border-white/10">
          <button 
            onClick={toggleMic}
            className={cn(
              "p-4 rounded-full transition-all active:scale-90",
              isMicOn ? "bg-white/5 text-white" : "bg-red-500 text-white"
            )}
          >
            {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
          </button>
          
          <button 
            onClick={flipCamera}
            className="p-4 rounded-full bg-white/5 text-white transition-all active:scale-90"
          >
            <RefreshCw size={22} />
          </button>

          <button 
            onClick={handleHangUp}
            className="p-5 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-all active:scale-90"
          >
            <Phone className="rotate-[135deg]" size={28} />
          </button>

          <button 
            onClick={toggleCamera}
            className={cn(
              "p-4 rounded-full transition-all active:scale-90",
              isCameraOn ? "bg-white/5 text-white" : "bg-red-500 text-white"
            )}
          >
            {isCameraOn ? <Video size={22} /> : <CameraOff size={22} />}
          </button>

          <button 
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={cn(
              "p-4 rounded-full transition-all active:scale-90",
              showMoreMenu ? "bg-primary text-white" : "bg-white/5 text-white"
            )}
          >
            <MoreVertical size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
