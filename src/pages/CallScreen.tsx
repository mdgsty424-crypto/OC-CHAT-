import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { cn } from '../lib/utils';
import { ICE_SERVERS, endCall } from '../lib/webrtc';
import { useNotifications } from '../hooks/useNotifications';
import { 
  Phone, 
  Video, 
  Mic, 
  MicOff, 
  CameraOff, 
  RefreshCw, 
  X, 
  Sun, 
  Moon,
  Volume2,
  VolumeX,
  MoreVertical,
  MessageSquare,
  ScreenShare,
  Users,
  Image as ImageIcon,
  Wind,
  Settings,
  Circle,
  Wand2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Helmet } from 'react-helmet-async';

export default function CallScreen() {
  const { id: otherUserId, roomId } = useParams<{ id?: string, roomId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const callId = searchParams.get('callId') || roomId;
  const type = (searchParams.get('type') || 'video') as 'audio' | 'video';
  const mode = searchParams.get('mode') || (roomId ? 'room' : 'caller'); // 'caller', 'receiver', or 'room'
  
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(type === 'video');
  const [isMuted, setIsMuted] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended' | 'rejected'>('connecting');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const { sendNotification } = useNotifications();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  // 1. Fetch Other User Info
  useEffect(() => {
    if (!otherUserId) return;
    const fetchUser = async () => {
      const userDoc = await getDoc(doc(db, 'users', otherUserId));
      if (userDoc.exists()) {
        setOtherUser({ ...userDoc.data(), uid: userDoc.id } as User);
      }
    };
    fetchUser();
  }, [otherUserId]);

  // 2. WebRTC Logic
  useEffect(() => {
    if (!currentUser || !otherUserId || !callId) return;

    let isMounted = true;

    const startWebRTC = async () => {
      // Cleanup any existing connection first
      if (pc.current) {
        pc.current.close();
      }
      pc.current = new RTCPeerConnection(ICE_SERVERS);

      // Get local stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video',
          audio: true
        });
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        
        stream.getTracks().forEach(track => {
          pc.current?.addTrack(track, stream);
        });
      } catch (err) {
        console.error("Error accessing media devices:", err);
        if (isMounted) {
          setPermissionError(err instanceof Error ? err.message : "Camera/Microphone access denied. Please check your browser settings.");
        }
        return;
      }

      // Handle remote stream
      pc.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        if (isMounted) setCallStatus('active');
      };

      // Signaling
      const callRef = doc(db, 'calls', callId);
      const callerCandidatesCollection = collection(callRef, 'callerCandidates');
      const receiverCandidatesCollection = collection(callRef, 'receiverCandidates');

      // ICE Candidates handling
      pc.current.onicecandidate = (event) => {
        if (event.candidate && pc.current) {
          const candidatesCollection = mode === 'caller' ? callerCandidatesCollection : receiverCandidatesCollection;
          addDoc(candidatesCollection, event.candidate.toJSON());
        }
      };

      if (mode === 'caller') {
        // Create Offer
        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        const offer = {
          sdp: offerDescription.sdp,
          type: offerDescription.type,
        };

        await updateDoc(callRef, { offer });

        // Listen for Answer
        const unsubCall = onSnapshot(callRef, (snapshot) => {
          const data = snapshot.data();
          if (pc.current && pc.current.signalingState !== 'stable' && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.current.setRemoteDescription(answerDescription).catch(e => console.error("Error setting remote description:", e));
          }
          if (data?.status === 'rejected' || data?.status === 'ended') {
            handleHangUp(false);
          }
        });

        // Listen for Receiver ICE Candidates
        const unsubIce = onSnapshot(receiverCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' && pc.current) {
              const data = change.doc.data();
              pc.current.addIceCandidate(new RTCIceCandidate(data)).catch(e => console.error("Error adding ICE candidate:", e));
            }
          });
        });

        return () => {
          unsubCall();
          unsubIce();
        };

      } else {
        // Receiver: Listen for Offer and status changes
        const unsubCall = onSnapshot(callRef, async (snapshot) => {
          const data = snapshot.data();
          if (!data) return;

          // Handle Offer
          if (pc.current && pc.current.signalingState === 'stable' && data.offer && !pc.current.remoteDescription) {
            const offerDescription = new RTCSessionDescription(data.offer);
            await pc.current.setRemoteDescription(offerDescription);

            const answerDescription = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answerDescription);

            const answer = {
              type: answerDescription.type,
              sdp: answerDescription.sdp,
            };

            await updateDoc(callRef, { answer, status: 'active' });
          }

          if (data.status === 'ended' || data.status === 'rejected') {
            handleHangUp(false);
          }
        });

        // Listen for Caller ICE Candidates
        const unsubIce = onSnapshot(callerCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' && pc.current) {
              const data = change.doc.data();
              pc.current.addIceCandidate(new RTCIceCandidate(data)).catch(e => console.error("Error adding ICE candidate:", e));
            }
          });
        });

        return () => {
          unsubCall();
          unsubIce();
        };
      }
    };

    let signalingCleanup: (() => void) | undefined;
    startWebRTC().then(cleanupFn => {
      signalingCleanup = cleanupFn;
    });

    return () => {
      isMounted = false;
      if (signalingCleanup) signalingCleanup();
      cleanup();
    };
  }, [currentUser?.uid, otherUserId, callId, mode, type]);

  const cleanup = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
  };

  const handleHangUp = async (notify = true) => {
    cleanup();
    if (notify && callId && otherUserId && currentUser) {
      // If caller hangs up before call becomes active, it's a missed call
      if (mode === 'caller' && callStatus !== 'active') {
        sendNotification({
          targetUserId: otherUserId,
          title: `Missed ${type === 'video' ? 'Video' : 'Audio'} Call`,
          message: `${currentUser.displayName || 'Someone'} called you`,
          largeIcon: currentUser.photoURL || '',
          url: `${window.location.origin}/chat/${currentUser.uid}`,
          deepLink: `app://chat/${currentUser.uid}`,
          priority: 'high',
          actions: [
            { id: 'callback', text: '📞 Call Back', icon: 'call', url: `${window.location.origin}/calls` },
            { id: 'message', text: '💬 Message', icon: 'comment', url: `${window.location.origin}/chat/${currentUser.uid}` }
          ]
        });
      }
      await endCall(callId, otherUserId);
    }
    navigate(-1);
  };

  const toggleMic = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  if (permissionError) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <CameraOff className="text-red-500" size={40} />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Permission Denied</h2>
        <p className="text-white/60 mb-8 max-w-xs">{permissionError}</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-white/90 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-black font-sans">
      {/* Remote Video (Full Screen when active) */}
      <video 
        ref={remoteVideoRef}
        autoPlay 
        playsInline 
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
          callStatus === 'active' ? "opacity-100 z-0" : "opacity-0 -z-10"
        )}
      />

      {/* Local Video */}
      <div className={cn(
        "transition-all duration-700 overflow-hidden shadow-2xl bg-gray-900",
        callStatus === 'active' 
          ? "absolute top-6 right-6 w-32 h-48 rounded-2xl border-2 border-white/20 z-50" 
          : "absolute inset-0 w-full h-full z-0"
      )}>
        <video 
          ref={localVideoRef}
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
        />
        {!isCameraOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <CameraOff className="text-white/40" size={callStatus === 'active' ? 24 : 48} />
          </div>
        )}
      </div>

      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/80 to-transparent z-30 pointer-events-none" />

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
      <div className="absolute top-16 left-0 right-0 z-20 flex flex-col items-center gap-4">
        <div className="relative">
          <motion.div 
            animate={{ 
              boxShadow: [
                "0 0 0px rgba(255, 215, 0, 0)",
                "0 0 15px rgba(255, 215, 0, 0.6)",
                "0 0 0px rgba(255, 215, 0, 0)"
              ]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className={cn("absolute -inset-1 rounded-full border-2", isNightMode ? "border-white/80" : "border-yellow-400/50")}
          />
          <div className="relative w-24 h-24 rounded-full border-2 border-white/30 shadow-2xl">
            <img 
              src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName}`} 
              alt={otherUser?.displayName}
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h2 className="text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {otherUser?.displayName || 'OCSTHAEL'}
            </h2>
            {otherUser?.verified && (
              <motion.div
                animate={{ 
                  filter: [
                    "drop-shadow(0 0 0px rgba(255,215,0,0))",
                    "drop-shadow(0 0 8px rgba(255,215,0,0.8))",
                    "drop-shadow(0 0 0px rgba(255,215,0,0))"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <VerifiedBadge size="xs" className="text-yellow-400 h-5 w-5" />
              </motion.div>
            )}
          </div>
          <span className="text-white/90 text-xs font-bold tracking-[0.2em] uppercase drop-shadow-md animate-pulse">
            {callStatus === 'connecting' ? 'Connecting...' : callStatus === 'ringing' ? 'Ringing...' : 'Active Call'}
          </span>
        </div>

        <button 
          onClick={() => setIsNightMode(!isNightMode)}
          className={cn(
            "mt-2 px-4 py-1.5 rounded-full transition-all active:scale-95 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border",
            isNightMode ? "bg-white text-black border-white" : "bg-black/20 text-white border-white/20"
          )}
        >
          {isNightMode ? <Sun size={12} /> : <Moon size={12} />}
          {isNightMode ? "Light ON" : "Light OFF"}
        </button>
      </div>

      {/* Main Control Bar */}
      <div className="absolute bottom-12 left-0 right-0 z-40 flex flex-col items-center gap-6">
        {/* More Options Menu (3x3 Grid) */}
        <AnimatePresence>
          {showMoreMenu && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-black/80 backdrop-blur-2xl rounded-[2.5rem] p-8 grid grid-cols-3 gap-8 border border-white/10 shadow-2xl mb-4 w-[90%] max-w-md z-50"
            >
              {[
                { icon: <MessageSquare size={24} />, label: 'Chat' },
                { icon: <ScreenShare size={24} />, label: 'Share' },
                { icon: <Users size={24} />, label: 'Members' },
                { icon: <ImageIcon size={24} />, label: 'Virtual BG' },
                { icon: <Wind size={24} />, label: 'Noise' },
                { icon: <Settings size={24} />, label: 'Settings' },
                { icon: <Circle size={24} className="text-red-500 fill-red-500" />, label: 'Record' },
                { icon: <Wand2 size={24} />, label: 'Filter' },
                { icon: <ExternalLink size={24} />, label: 'PiP Mode' },
              ].map((item, i) => (
                <button 
                  key={i} 
                  onClick={() => setShowMoreMenu(false)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white group-hover:bg-white/10 transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-[#1f2c34]/90 backdrop-blur-2xl rounded-full p-3 flex items-center gap-4 shadow-2xl border border-white/10">
          <button 
            onClick={toggleMic}
            className={cn("p-4 rounded-full transition-all active:scale-90", isMicOn ? "bg-white/5 text-white" : "bg-red-500 text-white")}
          >
            {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
          </button>
          
          <button className="p-4 rounded-full bg-white/5 text-white transition-all active:scale-90">
            <RefreshCw size={22} />
          </button>

          <button 
            onClick={() => handleHangUp()}
            className="p-5 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-all active:scale-90"
          >
            <Phone className="rotate-[135deg]" size={28} />
          </button>

          <button 
            onClick={toggleCamera}
            className={cn("p-4 rounded-full transition-all active:scale-90", isCameraOn ? "bg-white/5 text-white" : "bg-red-500 text-white")}
          >
            {isCameraOn ? <Video size={22} /> : <CameraOff size={22} />}
          </button>

          <button 
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={cn(
              "p-4 rounded-full transition-all active:scale-90 z-[20]", 
              showMoreMenu ? "bg-white/20 text-white" : "bg-white/5 text-white"
            )}
          >
            <MoreVertical size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
