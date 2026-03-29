import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Chat, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';

interface ChatListItemProps {
  chat: Chat;
  key?: any;
}

export default function ChatListItem({ chat }: ChatListItemProps) {
  const { user: currentUser } = useAuth();
  const [otherUser, setOtherUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchOtherUser = async () => {
      if (chat.type === 'group' || chat.type === 'channel') return;
      
      const otherId = chat.participants.find(id => id !== currentUser?.uid);
      if (otherId) {
        const userDoc = await getDoc(doc(db, 'users', otherId));
        if (userDoc.exists()) {
          setOtherUser(userDoc.data() as User);
        }
      }
    };
    fetchOtherUser();
  }, [chat, currentUser]);

  const unreadCount = currentUser ? chat.unreadCount?.[currentUser.uid] || 0 : 0;
  const chatName = chat.type === 'group' || chat.type === 'channel' ? chat.name : otherUser?.displayName || 'Loading...';
  const chatPhoto = chat.type === 'group' || chat.type === 'channel' ? chat.photo : (otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.uid || chat.id}`);

  return (
    <Link
      to={`/chat/${chat.id}`}
      className="flex items-center gap-4 px-6 py-4 hover:bg-white/20 transition-all active:scale-[0.98] group"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="p-[2px] bg-white rounded-full shadow-sm group-hover:shadow-md transition-all group-hover:scale-105">
          <img
            src={chatPhoto}
            alt={chatName}
            className="w-14 h-14 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        {(otherUser?.online || chat.type !== 'direct') && (
          <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-sm font-black text-text truncate group-hover:text-primary transition-colors">
            {chatName}
          </h3>
          <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
            {chat.lastMessageTime ? formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: false }) : ''}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className={cn(
            "text-xs truncate",
            unreadCount > 0 ? "text-text font-black" : "text-muted"
          )}>
            {chat.lastMessage || 'Start a conversation'}
          </p>
          {unreadCount > 0 && (
            <div className="bg-primary text-white text-[10px] font-black min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 shadow-lg shadow-primary/20">
              {unreadCount}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
