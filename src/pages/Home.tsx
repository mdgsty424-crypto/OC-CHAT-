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
    <main className="flex-1 overflow-y-auto pb-24 bg-background">
      {/* Search Bar */}
      <div className="px-6 py-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Stories */}
      <StorySection stories={mockStories} />

      {/* Chat List */}
      <div className="mt-4">
        {chats.length > 0 ? (
          chats.map((chat) => (
            <ChatListItem key={chat.id} chat={chat} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center opacity-60">
            <div className="w-16 h-16 bg-border rounded-full flex items-center justify-center mb-4">
              <Search size={32} className="text-muted" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No chats yet</h3>
            <p className="text-sm">Start a conversation with your friends or find a match!</p>
          </div>
        )}
      </div>
    </main>
  );
}
