import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Search, Plus, Users, Hash, Radio, ChevronRight, MoreVertical } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Community() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'groups' | 'channels'>('groups');

  const mockGroups = [
    { id: '1', name: 'Tech Enthusiasts', members: 1240, photo: 'https://picsum.photos/seed/tech/200', lastMessage: 'Anyone tried the new AI model?', type: 'group' },
    { id: '2', name: 'Design Daily', members: 850, photo: 'https://picsum.photos/seed/design/200', lastMessage: 'Check out this UI kit!', type: 'group' },
    { id: '3', name: 'Travel Buddies', members: 3200, photo: 'https://picsum.photos/seed/travel/200', lastMessage: 'Best places in Bali?', type: 'group' },
  ];

  const mockChannels = [
    { id: '4', name: 'OC Official News', members: 50000, photo: 'https://picsum.photos/seed/news/200', lastMessage: 'New update v2.0 is live!', type: 'channel' },
    { id: '5', name: 'Daily Motivation', members: 12000, photo: 'https://picsum.photos/seed/motivation/200', lastMessage: 'Keep pushing forward!', type: 'channel' },
  ];

  const items = activeTab === 'groups' ? mockGroups : mockChannels;

  return (
    <main className="flex-1 overflow-y-auto pb-24 bg-background">
      {/* Search & Tabs */}
      <div className="px-6 py-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search communities..."
            className="w-full bg-white border border-border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>

        <div className="flex bg-border/50 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('groups')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === 'groups' ? "bg-white text-primary shadow-sm" : "text-muted hover:text-text"
            )}
          >
            <Users size={16} />
            Groups
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === 'channels' ? "bg-white text-primary shadow-sm" : "text-muted hover:text-text"
            )}
          >
            <Radio size={16} />
            Channels
          </button>
        </div>
      </div>

      {/* List */}
      <div className="mt-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/50 transition-all group cursor-pointer">
            <div className="relative flex-shrink-0">
              <img
                src={item.photo}
                alt={item.name}
                className="w-16 h-16 rounded-3xl object-cover shadow-sm group-hover:shadow-md transition-all"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-white rounded-full border-2 border-white flex items-center justify-center">
                {item.type === 'group' ? <Hash size={12} /> : <Radio size={12} />}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-base font-bold text-text truncate">{item.name}</h3>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {item.members > 1000 ? `${(item.members / 1000).toFixed(1)}k` : item.members} members
                </span>
              </div>
              <p className="text-sm text-muted truncate">{item.lastMessage}</p>
            </div>

            <ChevronRight size={20} className="text-border group-hover:text-primary transition-colors" />
          </div>
        ))}

        {/* Create New */}
        <div className="px-6 py-8">
          <button className="w-full py-4 border-2 border-dashed border-border rounded-3xl flex items-center justify-center gap-3 text-muted hover:border-primary hover:text-primary transition-all group">
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
            <span className="font-bold">Create New {activeTab === 'groups' ? 'Group' : 'Channel'}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
