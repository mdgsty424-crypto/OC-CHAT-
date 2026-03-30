import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Heart, X, Video, Users, Sparkles, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';
import { useAuth } from '../hooks/useAuth';

export default function Discovery() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'nearby' | 'swipe' | 'random'>('swipe');
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [swipeUsers, setSwipeUsers] = useState<User[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);

  const startRandomMatch = () => {
    setIsMatching(true);
    setMatchedUser(null);
    
    // Simulate matching delay
    setTimeout(() => {
      const randomUser = nearbyUsers[Math.floor(Math.random() * nearbyUsers.length)];
      if (randomUser) {
        setMatchedUser(randomUser);
      }
      setIsMatching(false);
    }, 3000);
  };

  const handleStartRandomCall = async (type: 'audio' | 'video') => {
    if (!currentUser || !matchedUser) return;

    try {
      const callRef = await addDoc(collection(db, 'calls'), {
        type,
        callerId: currentUser.uid,
        receiverId: matchedUser.uid,
        status: 'calling',
        timestamp: new Date().toISOString()
      });

      navigate(`/call/${matchedUser.uid}?type=${type}&callId=${callRef.id}`);
    } catch (error) {
      console.error("Error starting random call:", error);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, limit(20));
      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as User))
        .filter(u => u.uid !== currentUser?.uid);
      
      setNearbyUsers(users.slice(0, 10));
      setSwipeUsers(users.slice(10));
    };

    fetchUsers();
  }, [currentUser]);

  const handleSwipe = (direction: 'left' | 'right') => {
    setCurrentIndex(prev => prev + 1);
    if (direction === 'right') {
      // Logic for match
      console.log("Matched with:", swipeUsers[currentIndex].displayName);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-border px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black tracking-tighter text-primary flex items-center gap-2">
            OC MATCH <Sparkles className="text-secondary fill-secondary" size={20} />
          </h1>
          <div className="flex items-center gap-2 bg-background p-1 rounded-full border border-border">
            <button 
              onClick={() => setActiveTab('swipe')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                activeTab === 'swipe' ? "bg-primary text-white" : "text-muted"
              )}
            >
              Swipe
            </button>
            <button 
              onClick={() => setActiveTab('nearby')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                activeTab === 'nearby' ? "bg-primary text-white" : "text-muted"
              )}
            >
              Nearby
            </button>
            <button 
              onClick={() => setActiveTab('random')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                activeTab === 'random' ? "bg-primary text-white" : "text-muted"
              )}
            >
              Random
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {activeTab === 'swipe' && (
          <div className="h-full flex flex-col items-center justify-center relative max-w-md mx-auto">
            <AnimatePresence mode="popLayout">
              {currentIndex < swipeUsers.length ? (
                <motion.div
                  key={swipeUsers[currentIndex].uid}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ x: 500, opacity: 0, rotate: 20 }}
                  className="w-full aspect-[3/4] bg-white rounded-[2rem] border border-border overflow-hidden relative"
                >
                  <img 
                    src={swipeUsers[currentIndex].photoURL || `https://picsum.photos/seed/${swipeUsers[currentIndex].uid}/600/800`}
                    alt={swipeUsers[currentIndex].displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-2xl font-black">{swipeUsers[currentIndex].displayName}, 24</h2>
                      {swipeUsers[currentIndex].verified && (
                        <ShieldCheck size={20} className="text-secondary fill-secondary" />
                      )}
                    </div>
                    <p className="text-sm opacity-80 flex items-center gap-1 mb-4">
                      <MapPin size={14} /> 2.4 km away
                    </p>
                    <div className="flex gap-2">
                      {['Travel', 'Music', 'Coffee'].map(tag => (
                        <span key={tag} className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Users size={40} className="text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">No more people nearby</h3>
                  <p className="text-muted text-sm">Try expanding your search radius</p>
                  <button 
                    onClick={() => setCurrentIndex(0)}
                    className="px-6 py-2 bg-primary text-white rounded-full font-bold"
                  >
                    Reset
                  </button>
                </div>
              )}
            </AnimatePresence>

            {currentIndex < swipeUsers.length && (
              <div className="flex gap-6 mt-8">
                <button 
                  onClick={() => handleSwipe('left')}
                  className="w-16 h-16 bg-white rounded-full border border-border flex items-center justify-center text-red-500 hover:scale-110 active:scale-95 transition-all"
                >
                  <X size={32} strokeWidth={3} />
                </button>
                <button 
                  onClick={() => handleSwipe('right')}
                  className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all"
                >
                  <Heart size={32} strokeWidth={3} fill="currentColor" />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'nearby' && (
          <div className="grid grid-cols-2 gap-4">
            {nearbyUsers.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-3xl p-3 border border-border transition-all group"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-3">
                  <img 
                    src={user.photoURL || `https://picsum.photos/seed/${user.id}/300/300`}
                    alt={user.displayName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded-full text-[8px] font-bold text-white flex items-center gap-1">
                    <MapPin size={8} /> {Math.floor(Math.random() * 10) + 1}km
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold truncate max-w-[80px]">{user.displayName}</h4>
                    <p className="text-[10px] text-muted">Active 5m ago</p>
                  </div>
                  <button className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary hover:text-white transition-colors">
                    <Video size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'random' && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className={cn(
                "w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center",
                isMatching && "animate-pulse"
              )}>
                {matchedUser ? (
                  <img 
                    src={matchedUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${matchedUser.uid}`} 
                    className="w-full h-full rounded-full object-cover border-4 border-primary"
                    alt="Matched"
                  />
                ) : (
                  <Video size={60} className="text-primary" />
                )}
              </div>
              <div className="absolute -top-2 -right-2 bg-secondary text-white px-3 py-1 rounded-full text-[10px] font-black animate-bounce">
                LIVE
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black">{matchedUser ? `Matched with ${matchedUser.displayName}!` : 'Random Video Chat'}</h3>
              <p className="text-muted text-sm max-w-xs">
                {isMatching ? 'Finding someone special for you...' : matchedUser ? 'Start a conversation now!' : 'Connect with random people around the world instantly.'}
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {matchedUser ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleStartRandomCall('video')}
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    VIDEO CALL
                  </button>
                  <button 
                    onClick={() => setMatchedUser(null)}
                    className="flex-1 py-4 bg-border text-text rounded-2xl font-black hover:bg-border/80 transition-all"
                  >
                    NEXT
                  </button>
                </div>
              ) : (
                <button 
                  onClick={startRandomMatch}
                  disabled={isMatching}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isMatching ? 'MATCHING...' : 'START MATCHING'}
                </button>
              )}
              <div className="flex items-center gap-2 justify-center text-[10px] text-muted">
                <ShieldCheck size={12} />
                Safe & Moderated Environment
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
