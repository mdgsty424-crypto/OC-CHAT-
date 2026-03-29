import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Chat, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { Check, CheckCheck, Archive, BellOff, Users, Megaphone } from 'lucide-react';
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
    <div className="relative overflow-hidden bg-white mb-3">
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
          className="flex items-center gap-6 px-6 py-8 hover:bg-gray-50 transition-all active:scale-[0.98] group"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="p-[2px] bg-white rounded-full transition-all group-hover:scale-105">
              {chat.type === 'group' && !chatPhoto ? (
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users size={24} className="text-muted" />
                </div>
              ) : (
                <img
                  src={chatPhoto}
                  alt={chatName}
                  className="w-14 h-14 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            {(otherUser?.online || chat.type !== 'direct') && (
              <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-black text-text truncate group-hover:text-primary transition-colors flex items-center">
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
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                {chat.lastMessageTime ? formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: false }) : ''}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 min-w-0">
                {/* Read Receipt (Mock) */}
                {currentUser?.uid === chat.participants[0] && (
                  <CheckCheck size={14} className="text-primary flex-shrink-0" />
                )}
                <p className={cn(
                  "text-xs truncate",
                  unreadCount > 0 ? "text-text font-black" : "text-muted"
                )}>
                  {chat.lastMessage || 'Start a conversation'}
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
