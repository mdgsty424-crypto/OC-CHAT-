import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Phone, Video, Search, Clock, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

export default function Calls() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'missed'>('all');

  // Mock call history
  const mockCalls = [
    { id: '1', name: 'Alex Johnson', type: 'video', status: 'incoming', time: new Date(Date.now() - 1000 * 60 * 30).toISOString(), photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
    { id: '2', name: 'Sarah Miller', type: 'audio', status: 'outgoing', time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { id: '3', name: 'Mike Ross', type: 'video', status: 'missed', time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
    { id: '4', name: 'Emma Watson', type: 'audio', status: 'incoming', time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma' },
  ];

  const filteredCalls = activeTab === 'all' ? mockCalls : mockCalls.filter(c => c.status === 'missed');

  return (
    <main className="flex-1 overflow-y-auto pb-24 bg-background">
      {/* Search & Tabs */}
      <div className="px-6 py-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search calls..."
            className="w-full bg-white border border-border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>

        <div className="flex bg-border/50 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
              activeTab === 'all' ? "bg-white text-primary shadow-sm" : "text-muted hover:text-text"
            )}
          >
            All Calls
          </button>
          <button
            onClick={() => setActiveTab('missed')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
              activeTab === 'missed' ? "bg-white text-red-500 shadow-sm" : "text-muted hover:text-text"
            )}
          >
            Missed
          </button>
        </div>
      </div>

      {/* Call List */}
      <div className="mt-2">
        {filteredCalls.map((call) => (
          <div key={call.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/50 transition-all group">
            <div className="relative flex-shrink-0">
              <img
                src={call.photo}
                alt={call.name}
                className="w-14 h-14 rounded-2xl object-cover shadow-sm"
              />
              <div className={cn(
                "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center",
                call.type === 'video' ? "bg-secondary text-white" : "bg-primary text-white"
              )}>
                {call.type === 'video' ? <Video size={12} /> : <Phone size={12} />}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "text-base font-bold truncate",
                call.status === 'missed' ? "text-red-500" : "text-text"
              )}>
                {call.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-muted">
                {call.status === 'incoming' && <ArrowDownLeft size={14} className="text-green-500" />}
                {call.status === 'outgoing' && <ArrowUpRight size={14} className="text-primary" />}
                {call.status === 'missed' && <X size={14} className="text-red-500" />}
                <span>{formatDistanceToNow(new Date(call.time), { addSuffix: true })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-3 bg-primary/10 text-primary rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-90">
                <Phone size={20} />
              </button>
              <button className="p-3 bg-secondary/10 text-secondary rounded-2xl hover:bg-secondary hover:text-white transition-all active:scale-90">
                <Video size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
