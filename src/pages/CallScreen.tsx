import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
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
  VolumeX
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
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended' | 'rejected'>('connecting');

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

    const startWebRTC = async () => {
      pc.current = new RTCPeerConnection(ICE_SERVERS);

      // Get local stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video',
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
  }, [currentUser, otherUserId, callId, mode, type]);

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

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-black font-sans">
      {/* Remote Video (Full Screen) */}
      <video 
        ref={remoteVideoRef}
        autoPlay 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Local Video (Floating) */}
      <div className="absolute top-6 right-6 w-32 h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-50 bg-gray-900">
        <video 
          ref={localVideoRef}
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
        />
        {!isCameraOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <CameraOff className="text-white/40" size={24} />
          </div>
        )}
      </div>

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
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/30 shadow-2xl">
            <img 
              src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName}`} 
              alt={otherUser?.displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white drop-shadow-lg">
              {otherUser?.displayName || 'User'}
            </h2>
            {otherUser?.verified && <VerifiedBadge size="sm" className="text-yellow-400" />}
          </div>
          <span className="text-white/80 text-sm font-medium tracking-wide drop-shadow-md animate-pulse">
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
            onClick={() => setIsMuted(!isMuted)}
            className={cn("p-4 rounded-full transition-all active:scale-90", !isMuted ? "bg-white/5 text-white" : "bg-red-500 text-white")}
          >
            {!isMuted ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
        </div>
      </div>
    </div>
  );
}
