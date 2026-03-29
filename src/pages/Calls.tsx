import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Phone, Video, Search, Clock, ArrowUpRight, ArrowDownLeft, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CallSession, User } from '../types';

interface CallWithUser extends CallSession {
  otherUser?: User;
}

export default function Calls() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'missed'>('all');
  const [calls, setCalls] = useState<CallWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;

    // Query calls where user is caller
    const q1 = query(
      collection(db, 'calls'),
      where('callerId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    // Query calls where user is receiver
    const q2 = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const fetchOtherUsers = async (callList: CallSession[]) => {
      const callsWithUsers = await Promise.all(
        callList.map(async (call) => {
          const otherId = call.callerId === user.uid ? call.receiverId : call.callerId;
          const userDoc = await getDoc(doc(db, 'users', otherId));
          return { ...call, otherUser: userDoc.data() as User };
        })
      );
      return callsWithUsers;
    };

    const unsub1 = onSnapshot(q1, async (snapshot) => {
      const callerCalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CallSession));
      setCalls(prev => {
        const otherCalls = prev.filter(c => c.receiverId === user.uid);
        const combined = [...callerCalls, ...otherCalls].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
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
        const combined = [...receiverCalls, ...otherCalls].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
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
    .filter(c => activeTab === 'all' || c.status === 'ended') // In a real app 'missed' would be a status
    .filter(c => c.otherUser?.displayName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <main className="flex-1 overflow-y-auto pb-24 bg-background">
      {/* Search & Tabs */}
      <div className="px-6 py-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>

        <div className="flex bg-border/50 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
              activeTab === 'all' ? "bg-white text-primary shadow-sm" : "text-muted hover:text-text"
            )}
          >
            All Calls
          </button>
          <button
            onClick={() => setActiveTab('missed')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
              activeTab === 'missed' ? "bg-white text-red-500 shadow-sm" : "text-muted hover:text-text"
            )}
          >
            Missed
          </button>
        </div>
      </div>

      {/* Call List */}
      <div className="mt-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : filteredCalls.length > 0 ? (
          filteredCalls.map((call) => (
            <div key={call.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/50 transition-all group">
              <div className="relative flex-shrink-0">
                <img
                  src={call.otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${call.otherUser?.uid}`}
                  alt={call.otherUser?.displayName}
                  className="w-14 h-14 rounded-2xl object-cover shadow-sm"
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
                <div className="flex items-center gap-1 text-xs text-muted">
                  {call.receiverId === user?.uid ? (
                    <ArrowDownLeft size={14} className={call.startTime ? "text-green-500" : "text-red-500"} />
                  ) : (
                    <ArrowUpRight size={14} className="text-primary" />
                  )}
                  <span>{formatDistanceToNow(new Date(call.timestamp), { addSuffix: true })}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-3 bg-primary/10 text-primary rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-90">
                  <Phone size={20} />
                </button>
                <button className="p-3 bg-secondary/10 text-secondary rounded-2xl hover:bg-secondary hover:text-white transition-all active:scale-90">
                  <Video size={20} />
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
    </main>
  );
}
