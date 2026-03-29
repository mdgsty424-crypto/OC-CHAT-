import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Chat, User } from '../types';
import StorySection from '../components/chat/StorySection';
import ChatListItem from '../components/chat/ChatListItem';
import { Search, Plus, Archive, EyeOff, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Home() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'all' | 'archived' | 'hidden'>('all');
  const [showHiddenInput, setShowHiddenInput] = useState(false);
  const [hiddenPassword, setHiddenPassword] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      // Sort client-side
      chatList.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
      setChats(chatList);
    });

    // Fetch active users (online users)
    const usersQ = query(
      collection(db, 'users'),
      where('online', '==', true),
      limit(20)
    );
    const usersUnsubscribe = onSnapshot(usersQ, (snapshot) => {
      const onlineUsers = snapshot.docs
        .map(doc => doc.data() as User)
        .filter(u => u.uid !== user.uid);
      setActiveUsers(onlineUsers);
    });

    return () => {
      unsubscribe();
      usersUnsubscribe();
    };
  }, [user]);

  // Mock data for stories
  const mockStories = [
    { id: '1', name: 'Alex', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', active: true },
    { id: '2', name: 'Sarah', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', active: true },
    { id: '3', name: 'Mike', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', active: false },
    { id: '4', name: 'Emma', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma', active: true },
    { id: '5', name: 'John', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', active: false },
  ];

  const filteredChats = chats.filter(chat => {
    const isArchived = chat.isArchived?.[user?.uid || ''] || false;
    const isHidden = chat.isHidden?.[user?.uid || ''] || false;

    if (view === 'archived') return isArchived;
    if (view === 'hidden') return isHidden;
    return !isArchived && !isHidden;
  }).filter(chat => {
    const name = chat.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleHiddenAccess = () => {
    if (hiddenPassword === '1234') { // Mock password
      setView('hidden');
      setShowHiddenInput(false);
      setHiddenPassword('');
    } else {
      alert('Incorrect Password');
    }
  };

  return (
    <main className="flex-1 overflow-y-auto pb-24 bg-transparent no-scrollbar">
      {/* Search Bar */}
      <div className="px-6 py-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search chats, groups, channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/50 backdrop-blur-md border border-white/20 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium"
          />
        </div>
      </div>

      {/* Active Friends (Horizontal Circles) */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Active Friends</h3>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{activeUsers.length} online</span>
        </div>
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
          {/* Your Story */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center bg-white group-hover:border-primary transition-colors">
                <Plus size={24} className="text-primary" />
              </div>
            </div>
            <span className="text-[10px] font-bold text-muted">Your Story</span>
          </div>

          {activeUsers.map(u => (
            <div key={u.uid} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
              <div className="relative">
                <div className="p-[2px] bg-gradient-to-tr from-primary to-secondary rounded-full">
                  <img 
                    src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-white group-hover:scale-105 transition-transform"
                    alt={u.displayName}
                  />
                </div>
                <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
              </div>
              <span className="text-[10px] font-bold text-muted truncate w-14 text-center">{u.displayName.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat List Section */}
      <div className="px-4">
        <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setView('all')}
                className={cn(
                  "text-lg font-black tracking-tight transition-all relative", 
                  view === 'all' ? "text-text" : "text-muted hover:text-text"
                )}
              >
                Chats
                {view === 'all' && <motion.div layoutId="activeTab" className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-full" />}
              </button>
              <button 
                onClick={() => setView('archived')}
                className={cn(
                  "text-lg font-black tracking-tight transition-all relative", 
                  view === 'archived' ? "text-text" : "text-muted hover:text-text"
                )}
              >
                Archived
                {view === 'archived' && <motion.div layoutId="activeTab" className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-full" />}
              </button>
            </div>
            
            <button 
              onClick={() => setShowHiddenInput(true)}
              className="p-2 bg-white/50 rounded-xl text-muted hover:text-primary transition-colors"
            >
              <Lock size={18} />
            </button>
          </div>
          
          <div className="divide-y divide-white/5">
            {filteredChats.length > 0 ? (
              filteredChats.map((chat) => (
                <ChatListItem key={chat.id} chat={chat} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-24 px-10 text-center opacity-40">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 border border-white/30">
                  <MessageCircle size={40} className="text-muted" />
                </div>
                <h3 className="text-xl font-black mb-2">No {view} chats</h3>
                <p className="text-sm font-medium">Start a new conversation with your friends!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Chats Password Modal */}
      <AnimatePresence>
        {showHiddenInput && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-xs shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock size={32} />
              </div>
              <h3 className="text-xl font-black mb-2">Hidden Chats</h3>
              <p className="text-sm text-muted mb-6">Enter password to access your hidden conversations.</p>
              <input 
                type="password" 
                value={hiddenPassword}
                onChange={(e) => setHiddenPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-background border border-border rounded-2xl py-3 px-4 mb-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowHiddenInput(false)}
                  className="flex-1 py-3 bg-border text-text rounded-2xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleHiddenAccess}
                  className="flex-1 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20"
                >
                  Unlock
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-50 ripple"
      >
        <Plus size={28} />
      </motion.button>
    </main>
  );
}
