import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Mic, MicOff, PhoneOff, Users, 
  MessageSquare, Hand, Smile, 
  MoreVertical, UserPlus, Loader2,
  Volume2, VolumeX, Music, Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Group } from '../types';

export default function VoiceRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [participants, setParticipants] = useState<User[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;

    const groupRef = doc(db, 'groups', id);
    
    // Join voice room
    updateDoc(groupRef, {
      'voiceRoom.isActive': true,
      'voiceRoom.participants': arrayUnion(user.uid)
    });

    const unsubscribe = onSnapshot(groupRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Group;
        setGroup(data);
        const participantIds = data.voiceRoom?.participants || [];
        
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
        navigate('/community');
      }
    });

    return () => {
      unsubscribe();
      updateDoc(groupRef, {
        'voiceRoom.participants': arrayRemove(user.uid)
      });
    };
  }, [id, user, navigate]);

  const handleLeave = () => {
    navigate('/community');
  };

  if (loading) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-sm font-black tracking-widest uppercase">Connecting to Voice Club...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <div className="p-6 flex items-center justify-between bg-white border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
            <Radio size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">{group?.name} Voice Club</h1>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
              {participants.length} Members Listening
            </p>
          </div>
        </div>
        <button className="p-3 bg-primary/10 text-primary rounded-2xl">
          <UserPlus size={20} />
        </button>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {participants.map((p, idx) => (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={p.uid}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative">
                <div className={cn(
                  "w-20 h-20 rounded-[2rem] p-1 transition-all duration-500",
                  idx === 0 ? "bg-gradient-to-tr from-primary to-secondary scale-110" : "bg-border"
                )}>
                  <img 
                    src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.uid}`} 
                    className="w-full h-full rounded-[1.8rem] object-cover border-4 border-white"
                    alt=""
                  />
                </div>
                {idx === 0 && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-white rounded-full border-4 border-white flex items-center justify-center">
                    <Mic size={14} />
                  </div>
                )}
                {/* Speaking Indicator */}
                {idx === 0 && (
                  <div className="absolute -inset-2 border-2 border-primary rounded-[2.5rem] animate-ping opacity-20" />
                )}
              </div>
              <span className="text-xs font-black text-text truncate w-24 text-center">{p.displayName}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-8 bg-white border-t border-border/50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-4 hover:bg-border/50 rounded-2xl transition-colors text-muted">
              <Smile size={24} />
            </button>
            <button className="p-4 hover:bg-border/50 rounded-2xl transition-colors text-muted">
              <Hand size={24} />
            </button>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                "w-16 h-16 rounded-3xl flex items-center justify-center transition-all",
                isMuted ? "bg-red-500 text-white" : "bg-primary text-white"
              )}
            >
              {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
            </button>

            <button 
              onClick={handleLeave}
              className="px-8 h-16 bg-red-100 text-red-600 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
            >
              <PhoneOff size={20} />
              Leave Quietly
            </button>

            <button 
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className="w-16 h-16 bg-border/50 text-text rounded-3xl flex items-center justify-center hover:bg-border transition-all"
            >
              {isSpeakerOn ? <Volume2 size={28} /> : <VolumeX size={28} />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-4 hover:bg-border/50 rounded-2xl transition-colors text-muted">
              <MessageSquare size={24} />
            </button>
            <button className="p-4 hover:bg-border/50 rounded-2xl transition-colors text-muted">
              <MoreVertical size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
