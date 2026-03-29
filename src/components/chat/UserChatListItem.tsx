import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface UserChatListItemProps {
  user: User;
  key?: any;
}

export default function UserChatListItem({ user }: UserChatListItemProps) {
  return (
    <div className="relative overflow-hidden bg-white mb-3">
      <motion.div
        className="relative z-10 bg-white"
      >
        <Link
          to={`/chat/new/${user.uid}`}
          className="flex items-center gap-6 px-6 py-8 hover:bg-gray-50 transition-all active:scale-[0.98] group"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="p-[2px] bg-white rounded-full transition-all group-hover:scale-105">
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                alt={user.displayName}
                className="w-14 h-14 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {user.online && (
              <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-black text-text truncate group-hover:text-primary transition-colors">
                {user.displayName}
              </h3>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted truncate">
                {user.online ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
