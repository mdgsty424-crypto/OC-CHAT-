import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { Phone, CheckCircle2 } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

interface UserChatListItemProps {
  user: User;
  key?: any;
}

export default function UserChatListItem({ user }: UserChatListItemProps) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const handleStartChat = async () => {
    if (!currentUser) return;

    try {
      // Check if chat exists
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('type', '==', 'direct'),
        where('participants', 'array-contains', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      let existingChat = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants && Array.isArray(data.participants) && data.participants.includes(user.uid)) {
          existingChat = { id: doc.id, ...data };
        }
      });

      if (existingChat) {
        navigate(`/chat/${(existingChat as any).id}`);
      } else {
        // Create new chat
        const newChatRef = await addDoc(chatsRef, {
          type: 'direct',
          participants: [currentUser.uid, user.uid],
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
          unreadCount: { [currentUser.uid]: 0, [user.uid]: 0 },
          typing: { [currentUser.uid]: false, [user.uid]: false }
        });
        navigate(`/chat/${newChatRef.id}`);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  return (
    <div className="relative overflow-hidden bg-background mb-1">
      <motion.div
        className="relative z-10 bg-background"
      >
        <button
          onClick={handleStartChat}
          className="w-full flex items-center gap-4 px-6 py-2 hover:bg-surface transition-all active:scale-[0.98] group text-left"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="p-[2px] bg-background rounded-full transition-all group-hover:scale-105">
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                alt={user.displayName}
                className="w-12 h-12 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {user.online && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full"></div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <h3 className="text-lg font-semibold text-text truncate group-hover:text-primary transition-colors flex items-center">
                <span className="truncate">{user.displayName}</span>
                {user.verified && (
                  <CheckCircle2 className="text-blue-500 fill-blue-500 ml-1 flex-shrink-0" size={16} />
                )}
                <Phone 
                  size={14} 
                  className={cn(
                    "ml-2 flex-shrink-0",
                    (user.status === 'in-call' || user.status === 'calling') ? "text-green-500" :
                    user.status === 'busy' ? "text-red-500" :
                    "text-gray-400"
                  )} 
                />
              </h3>
              <div role="button" className="text-muted hover:text-primary p-1" onClick={(e) => { e.stopPropagation(); /* TODO: Implement call */ }}>
                <Phone size={18} />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted truncate">
                Tap to start a conversation
              </p>
            </div>
          </div>
        </button>
      </motion.div>
    </div>
  );
}
