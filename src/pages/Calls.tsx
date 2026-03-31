import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Phone, Video, Search, Clock, ArrowUpRight, ArrowDownLeft, X, Loader2, Sparkles, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CallSession, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface CallWithUser extends CallSession {
  otherUser?: User;
}

export default function Calls() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'recent' | 'meetings'>('recent');
  const [calls, setCalls] = useState<CallWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingId, setMeetingId] = useState('');

  const generateMeeting = async () => {
    if (!user) return;
    const id = Math.random().toString(36).substring(2, 11).toUpperCase();
    
    try {
      await setDoc(doc(db, 'meetings', id), {
        id,
        hostId: user.uid,
        title: `${user.displayName}'s Meeting`,
        startTime: new Date().toISOString(),
        participants: [user.uid],
        isActive: true,
        type: 'public'
      });
      setMeetingId(id);
      setShowMeetingModal(true);
    } catch (error) {
      console.error("Error creating meeting:", error);
    }
  };

  const handleJoinMeeting = (idToJoin?: string) => {
    const finalId = idToJoin || meetingId;
    if (finalId) {
      navigate(`/meeting/${finalId}`);
    }
  };

  const isValidDate = (date: any) => {
    if (!date) return false;
    // Handle Firestore Timestamp
    if (typeof date === 'object' && date.toDate) {
      return true;
    }
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  };

  const parseDate = (date: any) => {
    if (typeof date === 'object' && date.toDate) {
      return date.toDate();
    }
    return new Date(date);
  };

  useEffect(() => {
    if (!user) return;

    // Query calls where user is caller
    const q1 = query(
      collection(db, 'calls'),
      where('callerId', '==', user.uid)
    );

    // Query calls where user is receiver
    const q2 = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid)
    );

    const fetchOtherUsers = async (callList: CallSession[]) => {
      const callsWithUsers = await Promise.all(
        callList.map(async (call) => {
          const otherId = call.callerId === user.uid ? call.receiverId : call.callerId;
          try {
            const userDoc = await getDoc(doc(db, 'users', otherId));
            return { ...call, otherUser: userDoc.data() as User };
          } catch (e) {
            return call;
          }
        })
      );
      return callsWithUsers;
    };

    const unsub1 = onSnapshot(q1, async (snapshot) => {
      const callerCalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CallSession));
      setCalls(prev => {
        const otherCalls = prev.filter(c => c.receiverId === user.uid);
        const combined = [...callerCalls, ...otherCalls].sort((a, b) => {
          const timeA = a.timestamp && isValidDate(a.timestamp) ? parseDate(a.timestamp).getTime() : 0;
          const timeB = b.timestamp && isValidDate(b.timestamp) ? parseDate(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
        return combined as CallWithUser[];
      });
      
      const enriched = await fetchOtherUsers(callerCalls);
      setCalls(prev => {
        const updated = prev.map(p => {
          const found = enriched.find(e => e.id === p.id);
          return found || p;
        });
        return updated;
      });
      setLoading(false);
    });

    const unsub2 = onSnapshot(q2, async (snapshot) => {
      const receiverCalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CallSession));
      setCalls(prev => {
        const otherCalls = prev.filter(c => c.callerId === user.uid);
        const combined = [...receiverCalls, ...otherCalls].sort((a, b) => {
          const timeA = a.timestamp && isValidDate(a.timestamp) ? parseDate(a.timestamp).getTime() : 0;
          const timeB = b.timestamp && isValidDate(b.timestamp) ? parseDate(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
        return combined as CallWithUser[];
      });

      const enriched = await fetchOtherUsers(receiverCalls);
      setCalls(prev => {
        const updated = prev.map(p => {
          const found = enriched.find(e => e.id === p.id);
          return found || p;
        });
        return updated;
      });
      setLoading(false);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  const filteredCalls = calls
    .filter(c => {
      if (activeTab === 'recent') return true;
      // In a real app 'meetings' would be a separate collection or filtered differently
      // For now, let's assume 'meetings' are calls with a meetingLink
      return !!c.meetingLink;
    })
    .filter(c => {
      const name = c.otherUser?.displayName || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

  const handleCall = async (otherUser: User, type: 'audio' | 'video') => {
    if (!user || !otherUser) return;

    try {
      const callRef = await addDoc(collection(db, 'calls'), {
        type,
        callerId: user.uid,
        receiverId: otherUser.uid,
        status: 'calling',
        timestamp: new Date().toISOString()
      });

      navigate(`/call/${otherUser.uid}?type=${type}&callId=${callRef.id}`);
    } catch (error) {
      console.error("Error starting call:", error);
      alert("Failed to start call");
    }
  };

  return (
    <main className="flex-1 overflow-y-auto pb-24 bg-background no-scrollbar">
      {/* Header Tabs */}
      <div className="sticky top-0 z-30 bg-white border-b border-border/50 px-6 py-4">
        <div className="flex bg-border/30 p-1 rounded-2xl mb-4">
          <button
            onClick={() => setActiveTab('recent')}
            className={cn(
              "flex-1 py-2.5 text-xs font-black rounded-xl transition-all uppercase tracking-widest",
              activeTab === 'recent' ? "bg-white text-primary" : "text-muted hover:text-text"
            )}
          >
            Recent
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={cn(
              "flex-1 py-2.5 text-xs font-black rounded-xl transition-all uppercase tracking-widest",
              activeTab === 'meetings' ? "bg-white text-primary" : "text-muted hover:text-text"
            )}
          >
            Meetings
          </button>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={generateMeeting}
            className="flex-1 bg-primary text-white py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Video size={18} />
            START MEETING
          </button>
          <button 
            onClick={() => navigate('/discovery')}
            className="flex-1 bg-secondary text-white py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Sparkles size={18} />
            RANDOM CALL
          </button>
        </div>
      </div>

      {activeTab === 'recent' ? (
        <div className="mt-2">
          <div className="px-6 py-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search call history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : filteredCalls.length > 0 ? (
            filteredCalls.map((call) => (
              <div key={call.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/50 transition-all group border-b border-border/30">
                <div className="relative flex-shrink-0">
                  <img
                    src={call.otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${call.otherUser?.uid}`}
                    alt={call.otherUser?.displayName}
                    className="w-14 h-14 rounded-2xl object-cover"
                  />
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center",
                    call.type === 'video' ? "bg-secondary text-white" : "bg-primary text-white"
                  )}>
                    {call.type === 'video' ? <Video size={12} /> : <Phone size={12} />}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "text-base font-bold truncate",
                    call.status === 'ended' && call.receiverId === user?.uid && !call.startTime ? "text-red-500" : "text-text"
                  )}>
                    {call.otherUser?.displayName || 'Unknown User'}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] text-muted font-bold uppercase tracking-wider">
                    {call.receiverId === user?.uid ? (
                      <ArrowDownLeft size={12} className={call.startTime ? "text-green-500" : "text-red-500"} />
                    ) : (
                      <ArrowUpRight size={12} className="text-primary" />
                    )}
                    <span>{call.timestamp && isValidDate(call.timestamp) ? formatDistanceToNow(parseDate(call.timestamp), { addSuffix: true }) : 'Recently'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => call.otherUser && handleCall(call.otherUser, call.type as 'audio' | 'video')}
                    className="p-3 bg-primary/10 text-primary rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-90"
                  >
                    <Phone size={20} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 px-10 opacity-60">
              <p className="text-sm">No call history found.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 border border-border text-center">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Video size={40} />
            </div>
            <h3 className="text-xl font-black mb-2">Personal Meeting Room</h3>
            <p className="text-sm text-muted mb-6">Host professional meetings with screen sharing and high-quality audio.</p>
            <div className="bg-background p-4 rounded-2xl border border-border mb-6">
              <span className="text-[10px] font-black text-muted uppercase tracking-widest block mb-1">Join Meeting</span>
              <input 
                type="text"
                placeholder="Enter Meeting ID"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value.toUpperCase())}
                className="w-full bg-transparent text-center text-2xl font-black tracking-[0.2em] text-primary focus:outline-none"
              />
            </div>
            <button 
              onClick={() => handleJoinMeeting()}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black"
            >
              JOIN NOW
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-muted uppercase tracking-widest px-2">Scheduled Meetings</h4>
            <div className="bg-white rounded-3xl p-6 border border-border flex items-center justify-between">
              <div>
                <h5 className="font-bold">Weekly Team Sync</h5>
                <p className="text-xs text-muted">Today, 4:00 PM</p>
              </div>
              <button className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-black">
                START
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting ID Modal */}
      <AnimatePresence>
        {showMeetingModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-sm text-center"
            >
              <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} />
              </div>
              <h3 className="text-2xl font-black mb-2">Meeting Created!</h3>
              <p className="text-sm text-muted mb-8">Share this meeting ID with your participants to join.</p>
              
              <div className="bg-background p-6 rounded-3xl border-2 border-dashed border-primary/30 mb-8">
                <span className="text-[10px] font-black text-muted uppercase tracking-widest block mb-2">Meeting ID</span>
                <span className="text-3xl font-black tracking-[0.3em] text-primary">{meetingId}</span>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowMeetingModal(false)}
                  className="flex-1 py-4 bg-border text-text rounded-2xl font-black"
                >
                  CLOSE
                </button>
                <button 
                  onClick={() => handleJoinMeeting(meetingId)}
                  className="flex-1 py-4 bg-primary text-white rounded-2xl font-black"
                >
                  JOIN NOW
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
