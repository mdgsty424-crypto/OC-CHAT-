import React, { useState } from 'react';
import { ChevronLeft, Search, UserMinus, UserPlus, Ban, Star, Heart, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ListType = 'close_friends' | 'blocked' | 'favorites' | 'muted';

interface UserListSettingsProps {
  type: ListType;
  onBack: () => void;
}

const mockUsers = [
  { id: '1', name: 'Felix', username: '@felix', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop' },
  { id: '2', name: 'Sarah', username: '@sarah_j', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { id: '3', name: 'James', username: '@jimmy', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop' },
  { id: '4', name: 'Luna', username: '@moonlight', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
];

export default function UserListSettings({ type, onBack }: UserListSettingsProps) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState(mockUsers);
  const [activeIds, setActiveIds] = useState<string[]>([]);

  const config = {
    close_friends: { title: 'Close Friends', icon: <Star size={18} className="text-green-500" />, activeIcon: <UserMinus size={18} />, inactiveIcon: <UserPlus size={18} />, desc: 'Add friends to your Close Friends list to share stories with them exclusively.' },
    blocked: { title: 'Blocked Accounts', icon: <Ban size={18} className="text-red-500" />, activeIcon: <span className="text-xs font-bold text-red-500">Unblock</span>, inactiveIcon: <Ban size={18} />, desc: 'You can unblock people here. They won\'t be notified when you block or unblock them.' },
    favorites: { title: 'Favorites', icon: <Heart size={18} className="text-pink-500" />, activeIcon: <Heart size={18} fill="currentColor" />, inactiveIcon: <Heart size={18} />, desc: 'View posts from your favorites in chronological order in your feed.' },
    muted: { title: 'Muted Accounts', icon: <VolumeX size={18} className="text-gray-500" />, activeIcon: <span className="text-xs font-bold text-gray-500">Unmute</span>, inactiveIcon: <VolumeX size={18} />, desc: 'Accounts you\'ve muted won\'t appear in your feed or stories.' },
  }[type];

  const toggleUser = (id: string) => {
    setActiveIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white text-black">
      <div className="flex items-center gap-4 p-4 border-b border-gray-100">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">{config.title}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        <div className="px-2">
          <p className="text-xs text-gray-500 leading-relaxed italic">
            {config.desc}
          </p>
        </div>

        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {filteredUsers.map((user) => {
              const isActive = activeIds.includes(user.id);
              return (
                <motion.div 
                  key={user.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-10 h-10 rounded-full object-cover border border-gray-100" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{user.name}</span>
                      <span className="text-[10px] text-gray-400">{user.username}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleUser(user.id)}
                    className={`p-2 rounded-xl border transition-all ${
                      isActive 
                        ? 'bg-blue-50 border-blue-200 text-blue-600' 
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    {isActive ? config.activeIcon : config.inactiveIcon}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredUsers.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">No accounts found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
