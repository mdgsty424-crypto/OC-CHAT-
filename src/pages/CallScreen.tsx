import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, onSnapshot, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { cn } from '../lib/utils';
import { ICE_SERVERS, endCall } from '../lib/webrtc';
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
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CallScreen() {
  const { id: otherUserId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const callId = searchParams.get('callId');
  const type = (searchParams.get('type') || 'video') as 'audio' | 'video';
  const mode = searchParams.get('mode') || 'caller'; // 'caller' or 'receiver'
  
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(type === 'video');
  const [isMuted, setIsMuted] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVirtualBgOn, setIsVirtualBgOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isFilterOn, setIsFilterOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended' | 'rejected'>('connecting');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

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

    const startWebRTC = async () => {
      pc.current = new RTCPeerConnection(ICE_SERVERS);

      // Get local stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video' ? { facingMode } : false,
          audio: true
        });
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        
        stream.getTracks().forEach(track => {
          pc.current?.addTrack(track, stream);
        });
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }

      // Handle remote stream
      pc.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setCallStatus('active');
      };

      // Signaling
      const callRef = doc(db, 'calls', callId);
      const callerCandidatesCollection = collection(callRef, 'callerCandidates');
      const receiverCandidatesCollection = collection(callRef, 'receiverCandidates');

      // ICE Candidates handling
      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
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
        onSnapshot(callRef, (snapshot) => {
          const data = snapshot.data();
          if (!pc.current?.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.current?.setRemoteDescription(answerDescription);
          }
          if (data?.status === 'rejected' || data?.status === 'ended') {
            handleHangUp(false);
          }
        });

        // Listen for Receiver ICE Candidates
        onSnapshot(receiverCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              pc.current?.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        });

      } else {
        // Receiver: Join Call
        const callDoc = await getDoc(callRef);
        const callData = callDoc.data();

        if (callData?.offer) {
          const offerDescription = new RTCSessionDescription(callData.offer);
          await pc.current.setRemoteDescription(offerDescription);

          const answerDescription = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answerDescription);

          const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
          };

          await updateDoc(callRef, { answer, status: 'active' });
        }

        // Listen for Caller ICE Candidates
        onSnapshot(callerCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              pc.current?.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        });

        // Listen for call status changes
        onSnapshot(callRef, (snapshot) => {
          const data = snapshot.data();
          if (data?.status === 'ended') {
            handleHangUp(false);
          }
        });
      }
    };

    startWebRTC();

    return () => {
      cleanup();
    };
  }, [currentUser, otherUserId, callId, mode, type, facingMode]);

  const cleanup = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    if (pc.current) {
      pc.current.close();
    }
  };

  const handleHangUp = async (notify = true) => {
    cleanup();
    if (notify && callId) {
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

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        
        if (pc.current) {
          const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        }

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        
        videoTrack.onended = () => {
          stopScreenShare();
        };
        
        setIsScreenSharing(true);
      } else {
        stopScreenShare();
      }
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };

  const stopScreenShare = async () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (pc.current) {
        const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;
    }
    setIsScreenSharing(false);
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (remoteVideoRef.current) {
        await remoteVideoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP error:", err);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      const stream = remoteVideoRef.current?.srcObject as MediaStream;
      if (!stream) return;

      recordedChunks.current = [];
      mediaRecorder.current = new MediaRecorder(stream);
      
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-record-${Date.now()}.webm`;
        a.click();
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } else {
      mediaRecorder.current?.stop();
      setIsRecording(false);
    }
  };

  const minimizeCall = async () => {
    if (remoteVideoRef.current) {
      try {
        await remoteVideoRef.current.requestPictureInPicture();
      } catch (e) {}
    }
    navigate(-1);
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-black font-sans">
      {/* Exit Arrow */}
      <button 
        onClick={minimizeCall}
        className="absolute top-6 left-6 z-50 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-all active:scale-90"
      >
        <ChevronDown size={24} />
      </button>

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
          className={cn(
            "w-full h-full object-cover",
            isVirtualBgOn && "blur-[10px]",
            isFilterOn && "brightness-125 contrast-125 sepia-[0.2] saturate-150"
          )}
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

      {/* Chat Overlay */}
      <AnimatePresence>
        {showChat && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute inset-0 z-[60] bg-background flex flex-col"
          >
            <div className="p-4 border-b flex items-center gap-4">
              <button onClick={() => setShowChat(false)} className="p-2 hover:bg-surface rounded-full">
                <X size={24} />
              </button>
              <h3 className="font-bold">Chat with {otherUser?.displayName}</h3>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p>Chat overlay is active. You can send messages here while staying on the call.</p>
              <p className="text-xs mt-2">(Full chat integration coming soon)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Control Bar */}
      <div className="absolute bottom-12 left-0 right-0 z-40 flex flex-col items-center gap-6">
        {/* More Options Menu (3x3 Grid) */}
        <AnimatePresence>
          {showMoreMenu && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-black/60 backdrop-blur-2xl rounded-[2.5rem] p-8 grid grid-cols-3 gap-8 border border-white/10 shadow-2xl mb-4 w-[90%] max-w-md z-50"
            >
              {[
                { icon: <MessageSquare size={24} />, label: 'Chat', onClick: () => setShowChat(true) },
                { icon: <ScreenShare size={24} />, label: 'Share', onClick: toggleScreenShare, active: isScreenSharing },
                { icon: <Users size={24} />, label: 'Members' },
                { icon: <ImageIcon size={24} />, label: 'Virtual BG', onClick: () => setIsVirtualBgOn(!isVirtualBgOn), active: isVirtualBgOn },
                { icon: <Wind size={24} />, label: 'Noise' },
                { icon: <Settings size={24} />, label: 'Settings' },
                { icon: <Circle size={24} className={cn(isRecording ? "text-red-500 fill-red-500" : "text-white")} />, label: 'Record', onClick: toggleRecording, active: isRecording },
                { icon: <Wand2 size={24} />, label: 'Filter', onClick: () => setIsFilterOn(!isFilterOn), active: isFilterOn },
                { icon: <ExternalLink size={24} />, label: 'PiP Mode', onClick: togglePiP },
              ].map((item, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    if (!item.active && item.label !== 'Chat') setShowMoreMenu(false);
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                    item.active ? "bg-yellow-500 text-black" : "bg-white/5 text-white group-hover:bg-white/10"
                  )}>
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
          
          <button 
            onClick={switchCamera}
            className="p-4 rounded-full bg-white/5 text-white transition-all active:scale-90"
          >
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
