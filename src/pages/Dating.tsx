import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { User, Match, Swipe } from '../types';
import { Heart, X, Star, Filter, MapPin, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SwipeCard from '../components/dating/SwipeCard';

export default function Dating() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!currentUser) return;
      
      // In a real app, we'd filter out users already swiped
      const q = query(
        collection(db, 'users'),
        where('uid', '!=', currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      const profileList = snapshot.docs.map(doc => doc.data() as User);
      setProfiles(profileList);
      setLoading(false);
    };
    fetchProfiles();
  }, [currentUser]);

  const [matchProfile, setMatchProfile] = useState<User | null>(null);

  const handleSwipe = async (direction: 'right' | 'left', profile: User) => {
    if (!currentUser) return;

    // Record swipe
    await addDoc(collection(db, 'swipes'), {
      fromUid: currentUser.uid,
      toUid: profile.uid,
      type: direction === 'right' ? 'like' : 'skip',
      timestamp: new Date().toISOString()
    });

    if (direction === 'right') {
      // Check for match
      const q = query(
        collection(db, 'swipes'),
        where('fromUid', '==', profile.uid),
        where('toUid', '==', currentUser.uid),
        where('type', '==', 'like')
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // It's a match!
        const matchId = [currentUser.uid, profile.uid].sort().join('_');
        await setDoc(doc(db, 'matches', matchId), {
          id: matchId,
          uids: [currentUser.uid, profile.uid],
          timestamp: new Date().toISOString()
        });
        
        // Create a chat for the match
        await setDoc(doc(db, 'chats', matchId), {
          id: matchId,
          participants: [currentUser.uid, profile.uid],
          type: 'direct',
          lastMessage: "You matched! Say hello 👋",
          lastMessageTime: new Date().toISOString(),
          unreadCount: { [currentUser.uid]: 0, [profile.uid]: 1 }
        });

        setMatchProfile(profile);
      }
    }

    setCurrentIndex(prev => prev + 1);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div></div>;

  return (
    <main className="flex-1 flex flex-col bg-background relative overflow-hidden pb-24">
      {/* Match Modal */}
      <AnimatePresence>
        {matchProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-center -space-x-8">
                <img 
                  src={currentUser?.photoURL} 
                  className="w-32 h-32 rounded-full border-4 border-white shadow-2xl object-cover" 
                  referrerPolicy="no-referrer"
                />
                <div className="z-10 bg-primary p-4 rounded-full shadow-2xl">
                  <Heart size={32} fill="white" className="text-white" />
                </div>
                <img 
                  src={matchProfile.photoURL} 
                  className="w-32 h-32 rounded-full border-4 border-white shadow-2xl object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">It's a Match!</h2>
                <p className="text-white/60">You and {matchProfile.displayName} liked each other.</p>
              </div>

              <div className="flex flex-col gap-4 pt-8">
                <button 
                  onClick={() => {
                    const matchId = [currentUser?.uid, matchProfile.uid].sort().join('_');
                    navigate(`/chat/${matchId}`);
                  }}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/40 active:scale-95 transition-all"
                >
                  Send a Message
                </button>
                <button 
                  onClick={() => setMatchProfile(null)}
                  className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all"
                >
                  Keep Swiping
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header Actions */}
      <div className="px-6 py-4 flex justify-between items-center z-10">
        <button className="p-3 bg-white rounded-2xl shadow-soft text-muted hover:text-primary transition-colors">
          <Filter size={20} />
        </button>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-soft">
          <MapPin size={16} className="text-primary" />
          <span className="text-xs font-bold text-text">New York, USA</span>
        </div>
        <button className="p-3 bg-white rounded-2xl shadow-soft text-muted hover:text-primary transition-colors">
          <Star size={20} />
        </button>
      </div>

      {/* Cards Stack */}
      <div className="flex-1 relative px-6 py-4">
        <AnimatePresence>
          {currentIndex < profiles.length ? (
            <SwipeCard
              key={profiles[currentIndex].uid}
              profile={profiles[currentIndex]}
              onSwipe={(dir) => handleSwipe(dir, profiles[currentIndex])}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Heart size={40} className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">No more profiles</h3>
              <p className="text-muted text-sm">Check back later or expand your filters to find more matches!</p>
              <button 
                onClick={() => setCurrentIndex(0)}
                className="mt-6 px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20"
              >
                Refresh
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Actions */}
      {currentIndex < profiles.length && (
        <div className="px-10 py-6 flex justify-around items-center z-10">
          <button 
            onClick={() => handleSwipe('left', profiles[currentIndex])}
            className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-red-500 hover:scale-110 transition-transform active:scale-95"
          >
            <X size={32} strokeWidth={3} />
          </button>
          <button className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-secondary hover:scale-110 transition-transform active:scale-95">
            <Star size={24} fill="currentColor" />
          </button>
          <button 
            onClick={() => handleSwipe('right', profiles[currentIndex])}
            className="w-16 h-16 bg-primary rounded-full shadow-lg shadow-primary/30 flex items-center justify-center text-white hover:scale-110 transition-transform active:scale-95"
          >
            <Heart size={32} fill="currentColor" />
          </button>
        </div>
      )}
    </main>
  );
}
