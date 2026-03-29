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

  return (
    <Link
      to={`/chat/${chat.id}`}
      className="flex items-center gap-4 px-6 py-4 hover:bg-white/50 transition-all active:scale-[0.98] group"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.uid || chat.id}`}
          alt={otherUser?.displayName || 'Chat'}
          className="w-14 h-14 rounded-2xl object-cover shadow-sm group-hover:shadow-md transition-shadow"
        />
        {otherUser?.online && (
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-base font-bold text-text truncate">
            {chat.type === 'group' ? chat.name : otherUser?.displayName || 'Loading...'}
          </h3>
          <span className="text-[10px] font-medium text-muted uppercase tracking-tighter">
            {chat.lastMessageTime ? formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: false }) : ''}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className={cn(
            "text-sm truncate",
            unreadCount > 0 ? "text-text font-semibold" : "text-muted"
          )}>
            {chat.lastMessage || 'Start a conversation'}
          </p>
          {unreadCount > 0 && (
            <div className="bg-primary text-white text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 shadow-sm shadow-primary/30">
              {unreadCount}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
