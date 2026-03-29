import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../types';
import { cn } from '../../lib/utils';

interface UserListItemProps {
  user: User;
  key?: any;
}

export default function UserListItem({ user }: UserListItemProps) {
  return (
    <Link
      to={`/chat/${user.uid}`}
      className="flex items-center gap-6 px-6 py-6 hover:bg-gray-50 transition-all active:scale-[0.98] group"
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
        <div className={cn("absolute bottom-0.5 right-0.5 w-4 h-4 border-2 border-white rounded-full", user.online ? "bg-green-500" : "bg-gray-300")}></div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-black text-text truncate group-hover:text-primary transition-colors">
          {user.displayName}
        </h3>
        <p className="text-xs text-muted truncate">
          {user.online ? 'Online' : 'Offline'}
        </p>
      </div>
    </Link>
  );
}
