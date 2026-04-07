import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Chat, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { initDB } from '../../lib/db';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { Check, CheckCheck, Archive, BellOff, Users, Megaphone } from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';

interface ChatListItemProps {
  chat: Chat;
  isSelected?: boolean;
  onSelect?: (chatId: string) => void;
  key?: any;
}

export default function ChatListItem({ chat, isSelected, onSelect }: ChatListItemProps) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { settings: globalSettings } = useGlobalSettings();
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0], [1, 0]);
  const scale = useTransform(x, [-100, 0], [1, 0.5]);

  // Long press state
  const timer = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => {
    timer.current = setTimeout(() => {
      onSelect?.(chat.id);
    }, 500);
  };

  const endPress = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  const otherId = chat.type === 'direct' ? chat.participants?.find(id => id !== currentUser?.uid) : null;

  useEffect(() => {
    if (chat.type !== 'direct' || !otherId) {
      setLoading(false);
      return;
    }
    
    // If we already have the user, don't fetch again
    if (otherUser && otherUser.uid === otherId) {
      setLoading(false);
      return;
    }

    const fetchOtherUser = async () => {
      setLoading(true);
      // Try IndexedDB first
      const dbInstance = await initDB();
      const localUser = await dbInstance.get('users', otherId);
      if (localUser) {
        setOtherUser(localUser as any);
        setLoading(false);
      }

      const userDoc = await getDoc(doc(db, 'users', otherId));
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as User;
        setOtherUser(userData);
        // Save to IndexedDB
        await dbInstance.put('users', userData);
      }
      setLoading(false);
    };
    fetchOtherUser();
  }, [otherId]);

  const unreadCount = currentUser ? chat.unreadCount?.[currentUser.uid] || 0 : 0;
  const chatName = chat.type === 'group' || chat.type === 'channel' ? chat.name : (loading ? '' : (otherUser?.displayName || 'Unknown User'));
  const chatPhoto = chat.type === 'group' || chat.type === 'channel' ? chat.photo : (otherUser?.photoURL || '');
  
  const isTyping = chat.typing && Object.values(chat.typing).some(t => t);

  return (
    <div className={cn("relative overflow-hidden bg-background mb-1 transition-colors", isSelected && "bg-primary/10")}>
      {/* Swipe Actions (Background) */}
      <div className="absolute inset-0 flex justify-end items-center px-6 gap-4 bg-surface">
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
        className="relative z-10 bg-background"
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onMouseDown={startPress}
        onMouseUp={endPress}
      >
        <div
          onClick={(e) => {
            if (isSelected) {
              e.preventDefault();
              onSelect?.(chat.id);
            } else {
              // Navigate to chat
              navigate(`/chat/${chat.id}`);
            }
          }}
          className="flex items-center gap-4 px-6 py-3 hover:bg-surface transition-all active:scale-[0.98] group"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className={cn(globalSettings.profileSize, "p-[2px] bg-background rounded-full transition-all group-hover:scale-105")}>
              {chat.type === 'group' && !chatPhoto ? (
                <div className="w-full h-full rounded-full bg-surface flex items-center justify-center">
                  <Users size={20} className="text-muted" />
                </div>
              ) : (
                <img
                  src={chatPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatName)}&background=random`}
                  alt={chatName}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chatName)}&background=random`;
                  }}
                />
              )}
            </div>
            {isSelected && (
              <div className="absolute inset-0 bg-primary/50 rounded-full flex items-center justify-center">
                <Check className="text-white" size={20} />
              </div>
            )}
            {(otherUser?.online || chat.type !== 'direct') && !isSelected && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full"></div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <h3 className={cn("text-lg font-extrabold text-text truncate group-hover:text-primary transition-colors flex items-center", globalSettings.userNameSize, globalSettings.fontWeight, globalSettings.fontFamily)}>
                {loading ? (
                  <div className="h-5 w-24 bg-surface animate-pulse rounded" />
                ) : (
                  <>
                    <span className="truncate">{chatName}</span>
                    {chat.type === 'direct' && otherUser?.verified && (
                      <VerifiedBadge className="w-4 h-4 ml-1 flex-shrink-0" size={globalSettings.badgeSize} />
                    )}
                    {chat.type === 'group' && (
                      <span className="text-[9px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-md ml-2 flex-shrink-0 flex items-center gap-1">
                        <Users size={10} /> GROUP
                      </span>
                    )}
                    {chat.type === 'channel' && (
                      <span className="text-[9px] font-black bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-md ml-2 flex-shrink-0 flex items-center gap-1">
                        <Megaphone size={10} /> BROADCAST
                      </span>
                    )}
                  </>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                )}
                <span className={cn("text-[10px] font-bold text-muted uppercase tracking-widest", globalSettings.fontFamily)}>
                  {chat.lastMessageTime && !isNaN(new Date(chat.lastMessageTime).getTime()) 
                    ? formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: false }) 
                    : ''}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 min-w-0">
                <p className={cn(
                  "text-sm truncate",
                  globalSettings.fontFamily,
                  isTyping ? "text-blue-500 font-medium" : (unreadCount > 0 ? "text-text font-black" : "text-muted")
                )}>
                  {isTyping ? 'Typing...' : (chat.lastMessage || 'No messages yet')}
                </p>
              </div>
              {unreadCount > 0 && (
                <div className="bg-primary text-white text-[10px] font-black min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5">
                  {unreadCount}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
