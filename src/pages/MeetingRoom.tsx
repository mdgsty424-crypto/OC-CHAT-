import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  Users, MessageSquare, Share, MoreVertical,
  Monitor, Layout, Shield, Settings,
  Hand, Smile, Grid, UserPlus,
  Maximize2, Minimize2, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';
import { initZego, joinMeeting, endCall } from '../lib/callService';

export default function MeetingRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<'grid' | 'speaker'>('grid');

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [zegoEngine, setZegoEngine] = useState<any>(null);

  useEffect(() => {
    if (!id || !user) return;

    const init = async () => {
      const engine = await initZego();
      if (engine) {
        setZegoEngine(engine);
        
        // Listen for remote streams
        engine.on('roomStreamUpdate', async (roomID, updateType, streamList) => {
          if (updateType === 'ADD') {
            for (const streamInfo of streamList) {
              const stream = await engine.startPlayingStream(streamInfo.streamID);
              setRemoteStreams(prev => ({ ...prev, [streamInfo.streamID]: stream }));
              
              // Attach to video element
              setTimeout(() => {
                const videoEl = document.getElementById(`video-${streamInfo.streamID}`) as HTMLVideoElement;
                if (videoEl) videoEl.srcObject = stream;
              }, 500);
            }
          } else if (updateType === 'DELETE') {
            for (const streamInfo of streamList) {
              engine.stopPlayingStream(streamInfo.streamID);
              setRemoteStreams(prev => {
                const updated = { ...prev };
                delete updated[streamInfo.streamID];
                return updated;
              });
            }
          }
        });

        // Join meeting and start local stream
        const stream = await joinMeeting(id, user.uid, user.displayName);
        if (stream) {
          setLocalStream(stream);
          setTimeout(() => {
            const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
            if (localVideo) localVideo.srcObject = stream;
          }, 500);
        }
      }
    };

    init();

    // Join meeting in Firestore
    const meetingRef = doc(db, 'meetings', id);
    updateDoc(meetingRef, {
      participants: arrayUnion(user.uid)
    });

    const unsubscribe = onSnapshot(meetingRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const participantIds = data.participants || [];
        
        // Fetch participant details
        const details = await Promise.all(
          participantIds.map(async (pid: string) => {
            const uDoc = await getDoc(doc(db, 'users', pid));
            return { uid: pid, ...uDoc.data() } as User;
          })
        );
        setParticipants(details);
        setLoading(false);
      } else {
        navigate('/calls');
      }
    });

    return () => {
      unsubscribe();
      updateDoc(meetingRef, {
        participants: arrayRemove(user.uid)
      });
      if (localStream) {
        endCall(id, localStream);
      } else {
        endCall(id);
      }
    };
  }, [id, user, navigate]);

  const handleEndCall = () => {
    navigate('/calls');
  };

  const toggleMute = () => {
    if (zegoEngine) {
      zegoEngine.muteMicrophone(!isMuted);
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (zegoEngine) {
      // zegoEngine.muteVideo(!isVideoOff);
    }
    setIsVideoOff(!isVideoOff);
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-sm font-black tracking-widest uppercase">Joining Meeting...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1a1a1a] flex flex-col overflow-hidden text-white font-sans">
      {/* Top Bar */}
      <div className="p-4 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight">OC Meeting: {id}</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Live • 00:45:12</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setLayout(layout === 'grid' ? 'speaker' : 'grid')}
            className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Layout size={20} />
          </button>
          <button className="p-2.5 hover:bg-white/10 rounded-xl transition-colors">
            <Maximize2 size={20} />
          </button>
          <button className="p-2.5 bg-primary text-white rounded-xl flex items-center gap-2 px-4 font-bold text-xs">
            <UserPlus size={16} />
            INVITE
          </button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative p-4 overflow-hidden">
        <div className={cn(
          "h-full w-full transition-all duration-500",
          layout === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
            : "flex flex-col gap-4"
        )}>
          {participants.map((p, idx) => (
            <motion.div
              layout
              key={p.uid}
              className={cn(
                "relative bg-[#2a2a2a] rounded-[2rem] overflow-hidden border border-white/5",
                layout === 'speaker' && idx === 0 ? "flex-1" : layout === 'speaker' ? "h-32 w-48 absolute bottom-4 right-4 z-10" : ""
              )}
            >
              {/* Video Stream */}
              <div className="absolute inset-0">
                {p.uid === user?.uid ? (
                  <video id="localVideo" autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <video id={`video-${p.uid}`} autoPlay playsInline className="w-full h-full object-cover" />
                )}
              </div>

              {/* Video Placeholder (if no stream) */}
              {((p.uid === user?.uid && !localStream) || (p.uid !== user?.uid && !remoteStreams[p.uid])) && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#2a2a2a]">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-secondary mb-4 mx-auto">
                      <img 
                        src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.uid}`} 
                        className="w-full h-full rounded-full object-cover border-4 border-[#2a2a2a]"
                        alt={p.displayName}
                      />
                    </div>
                    <h3 className="text-lg font-black tracking-tight">{p.displayName}</h3>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                      {p.uid === user?.uid ? 'You' : 'Participant'}
                    </p>
                  </div>
                </div>
              )}

              {/* Participant Info Overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="bg-black/40 px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                  <span className="text-[10px] font-black tracking-tight">{p.displayName}</span>
                  {idx === 0 && <Mic size={12} className="text-primary" />}
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center border border-white/10">
                    <MoreVertical size={14} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Floating Chat/Participants Panels */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="absolute top-4 right-4 bottom-4 w-80 bg-[#252525] rounded-[2.5rem] border border-white/10 z-50 flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="font-black text-lg">Participants ({participants.length})</h2>
                <button onClick={() => setShowParticipants(false)} className="text-muted hover:text-white">
                  <Minimize2 size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {participants.map(p => (
                  <div key={p.uid} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-colors">
                    <img src={p.photoURL} className="w-10 h-10 rounded-xl" alt="" />
                    <div className="flex-1">
                      <p className="text-sm font-bold">{p.displayName}</p>
                      <p className="text-[10px] text-muted uppercase font-black">Member</p>
                    </div>
                    <div className="flex gap-2">
                      <Mic size={16} className="text-muted" />
                      <Video size={16} className="text-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-black/40 border-t border-white/5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="p-3 hover:bg-white/10 rounded-2xl transition-colors text-muted">
              <Smile size={24} />
            </button>
            <button className="p-3 hover:bg-white/10 rounded-2xl transition-colors text-muted">
              <Hand size={24} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleMute}
              className={cn(
                "w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all",
                isMuted ? "bg-red-500 text-white" : "bg-[#333] text-white hover:bg-[#444]"
              )}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            
            <button 
              onClick={toggleVideo}
              className={cn(
                "w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all",
                isVideoOff ? "bg-red-500 text-white" : "bg-[#333] text-white hover:bg-[#444]"
              )}
            >
              {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>

            <button 
              onClick={handleEndCall}
              className="w-20 h-14 bg-red-600 text-white rounded-[1.5rem] flex items-center justify-center hover:bg-red-700 transition-all"
            >
              <PhoneOff size={24} />
            </button>

            <button 
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={cn(
                "w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all",
                isScreenSharing ? "bg-green-500 text-white" : "bg-[#333] text-white hover:bg-[#444]"
              )}
            >
              <Monitor size={24} />
            </button>

            <button className="w-14 h-14 bg-[#333] text-white rounded-[1.5rem] flex items-center justify-center hover:bg-[#444] transition-all">
              <Grid size={24} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowParticipants(!showParticipants)}
              className={cn(
                "p-3 rounded-2xl transition-all relative",
                showParticipants ? "bg-primary text-white" : "hover:bg-white/10 text-muted"
              )}
            >
              <Users size={24} />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#1a1a1a]">
                {participants.length}
              </span>
            </button>
            <button 
              onClick={() => setShowChat(!showChat)}
              className={cn(
                "p-3 rounded-2xl transition-all",
                showChat ? "bg-primary text-white" : "hover:bg-white/10 text-muted"
              )}
            >
              <MessageSquare size={24} />
            </button>
            <button className="p-3 hover:bg-white/10 rounded-2xl transition-colors text-muted">
              <Settings size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
