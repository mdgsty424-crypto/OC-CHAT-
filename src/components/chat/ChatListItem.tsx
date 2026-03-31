import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Chat, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { initDB } from '../../lib/db';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { Check, CheckCheck, Archive, BellOff, Users, Megaphone, Phone } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'motion/react';

interface ChatListItemProps {
  chat: Chat;
  key?: any;
}

export default function ChatListItem({ chat }: ChatListItemProps) {
  const { user: currentUser } = useAuth();
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0], [1, 0]);
  const scale = useTransform(x, [-100, 0], [1, 0.5]);

  useEffect(() => {
    const fetchOtherUser = async () => {
      if (chat.type === 'group' || chat.type === 'channel') return;
      
      const otherId = chat.participants?.find(id => id !== currentUser?.uid);
      if (otherId) {
        // Try IndexedDB first
        const dbInstance = await initDB();
        const localUser = await dbInstance.get('users', otherId);
        if (localUser) {
          setOtherUser(localUser as any);
        }

        const userDoc = await getDoc(doc(db, 'users', otherId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setOtherUser(userData);
          // Save to IndexedDB
          await dbInstance.put('users', userData);
        }
      }
    };
    fetchOtherUser();
  }, [chat, currentUser]);

  const unreadCount = currentUser ? chat.unreadCount?.[currentUser.uid] || 0 : 0;
  const chatName = chat.type === 'group' || chat.type === 'channel' ? chat.name : otherUser?.displayName || 'Loading...';
  const chatPhoto = chat.type === 'group' || chat.type === 'channel' ? chat.photo : (otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.uid || chat.id}`);
  
  const isTyping = chat.typing && Object.values(chat.typing).some(t => t);

  return (
    <div className="relative overflow-hidden bg-white mb-1">
      {/* Swipe Actions (Background) */}
      <div className="absolute inset-0 flex justify-end items-center px-6 gap-4 bg-gray-50">
        <motion.div style={{ opacity, scale }} className="flex items-center gap-4">
          <button className="p-3 bg-primary text-white rounded-2xl">
            <Archive size={20} />
          </button>
          <button className="p-3 bg-secondary text-white rounded-2xl">
            <BellOff size={20} />
          </button>
        </motion.div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -150, right: 0 }}
        style={{ x }}
        className="relative z-10 bg-white"
      >
        <Link
          to={`/chat/${chat.id}`}
          className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-all active:scale-[0.98] group"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="p-[2px] bg-white rounded-full transition-all group-hover:scale-105">
              {chat.type === 'group' && !chatPhoto ? (
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users size={20} className="text-muted" />
                </div>
              ) : (
                <img
                  src={chatPhoto}
                  alt={chatName}
                  className="w-12 h-12 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            {(otherUser?.online || chat.type !== 'direct') && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <h3 className="text-lg font-semibold text-text truncate group-hover:text-primary transition-colors flex items-center">
                {chatName}
                {chat.type === 'group' && (
                  <span className="text-[9px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-md ml-2 flex items-center gap-1">
                    <Users size={10} /> GROUP
                  </span>
                )}
                {chat.type === 'channel' && (
                  <span className="text-[9px] font-black bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-md ml-2 flex items-center gap-1">
                    <Megaphone size={10} /> BROADCAST
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  unreadCount > 0 ? "bg-primary" : "border border-muted"
                )}></div>
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                  {chat.lastMessageTime && !isNaN(new Date(chat.lastMessageTime).getTime()) 
                    ? formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: false }) 
                    : ''}
                </span>
                <div role="button" className="text-muted hover:text-primary p-1" onClick={(e) => { e.preventDefault(); /* TODO: Implement call */ }}>
                  <Phone size={18} />
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 min-w-0">
                <p className={cn(
                  "text-sm truncate",
                  isTyping ? "text-blue-500 font-medium" : (unreadCount > 0 ? "text-text font-black" : "text-muted")
                )}>
                  {isTyping ? 'Typing...' : (chat.lastMessage || 'Start a conversation')}
                </p>
              </div>
              {unreadCount > 0 && (
                <div className="bg-primary text-white text-[10px] font-black min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5">
                  {unreadCount}
                </div>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
