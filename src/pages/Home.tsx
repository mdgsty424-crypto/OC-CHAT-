import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Chat, User } from '../types';
import StorySection from '../components/chat/StorySection';
import ChatListItem from '../components/chat/ChatListItem';
import { Search } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(chatList);
    });

    return () => unsubscribe();
  }, [user]);

  // Mock data for stories
  const mockStories = [
    { id: '1', name: 'Alex', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', active: true },
    { id: '2', name: 'Sarah', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', active: true },
    { id: '3', name: 'Mike', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', active: false },
    { id: '4', name: 'Emma', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma', active: true },
    { id: '5', name: 'John', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', active: false },
  ];

  return (
    <main className="flex-1 overflow-y-auto pb-24 bg-transparent">
      {/* Search Bar (Mobile Only) */}
      <div className="px-6 py-4 md:hidden">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/50 backdrop-blur-md border border-white/20 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Stories */}
      <div className="px-6 mt-4">
        <StorySection stories={mockStories} />
      </div>

      {/* Chat List */}
      <div className="mt-6 px-4">
        <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-lg font-black text-text tracking-tight">Recent Chats</h2>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">
              {chats.length} Active
            </span>
          </div>
          
          <div className="divide-y divide-white/10">
            {chats.length > 0 ? (
              chats.map((chat) => (
                <ChatListItem key={chat.id} chat={chat} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-10 text-center opacity-60">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 border border-white/30">
                  <Search size={32} className="text-muted" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No chats yet</h3>
                <p className="text-sm">Start a conversation with your friends or find a match!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
