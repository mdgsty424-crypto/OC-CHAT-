import React from 'react';
import { User } from '../../types';
import { MessageSquare, Search as SearchIcon, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';

interface UserListProps {
  users: User[];
  onUserClick?: (user: User) => void;
  loading?: boolean;
  emptyMessage?: string;
  title?: string;
}

export default function UserList({ users, onUserClick, loading, emptyMessage = "No users found", title }: UserListProps) {
  const navigate = useNavigate();
  const { settings } = useGlobalSettings();

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className={cn(settings.profileSize, "bg-border rounded-full")} />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-border rounded w-1/3" />
              <div className="h-3 bg-border rounded w-1/4" />
            </div>
            <div className="w-20 h-8 bg-border rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-10 text-center opacity-40">
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-6 border border-border">
          <SearchIcon size={40} className="text-muted" />
        </div>
        <h3 className="text-xl font-black mb-2">{emptyMessage}</h3>
        <p className="text-sm font-medium">Try searching for a different name or username.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", settings.fontFamily)}>
      {title && (
        <div className="px-6 py-4">
          <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{title}</h3>
        </div>
      )}
      <div className="divide-y divide-border/50">
        {users.map((user, index) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            key={user.uid}
            className="flex items-center gap-4 px-6 py-4 hover:bg-surface transition-colors group"
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className={cn(settings.profileSize, "rounded-full overflow-hidden border-2 border-background shadow-sm")}>
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              {user.online && (
                <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 border-2 border-surface rounded-full shadow-sm"></div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0" onClick={() => onUserClick?.(user)}>
              <h4 className={cn(settings.userNameSize, settings.fontWeight, "text-text truncate group-hover:text-primary transition-colors")}>
                {user.displayName}
              </h4>
              <p className={cn(settings.fontSize, "text-muted truncate")}>
                @{user.username || user.displayName?.toLowerCase().replace(/\s+/g, '') || 'user'}
              </p>
            </div>

            {/* Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUserClick?.(user);
                navigate(`/chat/${user.uid}`);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-full text-xs font-black transition-all active:scale-95"
            >
              <MessageSquare size={14} />
              <span>Message</span>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
