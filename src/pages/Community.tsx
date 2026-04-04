import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Search, Plus, Users, Hash, Radio, ChevronRight, MoreVertical, Loader2, Check, Mic, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, where, onSnapshot, addDoc, orderBy, updateDoc, doc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Group } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'group' | 'channel'>('group');
  const [items, setItems] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'groups'),
      where('type', '==', activeTab)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      // Sort client-side to avoid composite index requirement
      list.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
      setItems(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    
    try {
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: newGroupName,
        description: `A new ${activeTab} for community members.`,
        photo: `https://picsum.photos/seed/${newGroupName}/200`,
        members: [user.uid],
        lastMessage: `Welcome to the new ${activeTab}!`,
        lastMessageTime: new Date().toISOString(),
        type: activeTab
      });

      // Create a corresponding chat document
      await setDoc(doc(db, 'chats', groupRef.id), {
        id: groupRef.id,
        name: newGroupName,
        photo: `https://picsum.photos/seed/${newGroupName}/200`,
        participants: [user.uid],
        type: activeTab,
        lastMessage: `Welcome to the new ${activeTab}!`,
        lastMessageTime: new Date().toISOString(),
        unreadCount: { [user.uid]: 0 }
      });

      setNewGroupName('');
      setIsCreating(false);
      navigate(`/chat/${groupRef.id}`);
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const handleJoin = async (item: Group) => {
    if (!user) return;
    
    const isMember = item.members?.includes(user.uid) || false;
    if (isMember) {
      navigate(`/chat/${item.id}`);
      return;
    }

    setJoiningId(item.id);
    try {
      await updateDoc(doc(db, 'groups', item.id), {
        members: arrayUnion(user.uid)
      });
      
      await updateDoc(doc(db, 'chats', item.id), {
        participants: arrayUnion(user.uid),
        [`unreadCount.${user.uid}`]: 0
      });

      navigate(`/chat/${item.id}`);
    } catch (error) {
      console.error("Error joining group:", error);
    } finally {
      setJoiningId(null);
    }
  };

  const handleStartVoiceClub = async (groupId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        'voiceRoom.isActive': true,
        'voiceRoom.participants': arrayUnion(user.uid),
        'voiceRoom.startTime': new Date().toISOString()
      });
      navigate(`/voice/${groupId}`);
    } catch (error) {
      console.error("Error starting voice club:", error);
    }
  };

  const filteredItems = items.filter(item => {
    const name = item.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <main className="flex-1 overflow-y-auto pb-24 bg-background no-scrollbar">
      {/* Search & Tabs */}
      <div className="sticky top-0 z-30 bg-background border-b border-border/50 px-6 py-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder={`Search ${activeTab}s...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border/50 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="flex bg-border/30 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('group')}
            className={cn(
              "flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest",
              activeTab === 'group' ? "bg-surface text-primary" : "text-muted hover:text-text"
            )}
          >
            <Users size={16} />
            Groups
          </button>
          <button
            onClick={() => setActiveTab('channel')}
            className={cn(
              "flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest",
              activeTab === 'channel' ? "bg-surface text-primary" : "text-muted hover:text-text"
            )}
          >
            <Radio size={16} />
            Channels
          </button>
        </div>
      </div>

      {/* Active Voice Clubs (IMO Style) */}
      <div className="px-6 mb-8 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center text-secondary">
              <Mic size={18} />
            </div>
            <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Active Voice Clubs</h3>
          </div>
          <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All</button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {items.filter(g => g.voiceRoom?.isActive).map(group => (
            <motion.div 
              key={group.id}
              whileHover={{ y: -5 }}
              onClick={() => navigate(`/voice/${group.id}`)}
              className="flex-shrink-0 w-40 bg-surface rounded-3xl p-4 border border-white/20 cursor-pointer group"
            >
              <div className="relative mb-3">
                <img src={group.photo} className="w-full h-24 rounded-2xl object-cover" alt="" />
                <div className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <div className="w-1 h-1 bg-white rounded-full" />
                  LIVE
                </div>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Play size={24} className="text-white fill-white" />
                </div>
              </div>
              <h4 className="text-xs font-black truncate mb-1">{group.name}</h4>
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-5 h-5 rounded-full border-2 border-surface bg-border overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-muted">+{group.voiceRoom?.participants.length || 0}</span>
              </div>
            </motion.div>
          ))}

          {/* Create Voice Club Button */}
            <button 
            onClick={() => {
              const myGroup = items.find(g => g.members?.includes(user?.uid || ''));
              if (myGroup) handleStartVoiceClub(myGroup.id);
            }}
            className="flex-shrink-0 w-40 bg-surface border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-surface/30 transition-all group"
          >
            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-muted group-hover:text-primary transition-colors">
              <Plus size={24} />
            </div>
            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Start Club</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="mt-2 px-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {filteredItems.map((item) => {
              const isMember = user && item.members ? item.members.includes(user.uid) : false;
              return (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleJoin(item)}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-surface rounded-3xl transition-all group cursor-pointer border border-transparent hover:border-border/50"
                >
                  <div className="relative flex-shrink-0">
                    <div className="p-[2px] bg-background rounded-full group-hover:scale-105 transition-transform">
                      <img
                        src={item.photo}
                        alt={item.name}
                        className="w-16 h-16 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-white rounded-full border-2 border-surface flex items-center justify-center">
                      {item.type === 'group' ? <Hash size={12} /> : <Radio size={12} />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-text truncate group-hover:text-primary transition-colors">{item.name}</h3>
                        {item.members.length > 100 && (
                          <span className="text-[8px] font-black bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Super</span>
                        )}
                      </div>
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        {item.members.length >= 1000 ? `${(item.members.length / 1000).toFixed(1)}k` : item.members.length}
                      </span>
                    </div>
                    <p className="text-xs text-muted truncate font-medium">{item.lastMessage}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] font-bold text-muted uppercase tracking-widest">
                        {item.type === 'channel' ? 'Broadcast' : 'Public Group'}
                      </span>
                      <span className="w-1 h-1 bg-border rounded-full" />
                      <span className="text-[8px] font-bold text-muted uppercase tracking-widest">
                        {isMember ? 'Member' : 'Join to see'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {joiningId === item.id ? (
                      <Loader2 className="animate-spin text-primary" size={20} />
                    ) : isMember ? (
                      <div className="w-8 h-8 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                        <Check size={18} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                        <ChevronRight size={18} />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 px-10">
            <div className="w-20 h-20 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-muted" />
            </div>
            <p className="text-muted text-sm font-bold">No {activeTab}s found. Be the first to create one!</p>
          </div>
        )}

        {/* Create New */}
        <div className="px-6 py-8">
          {isCreating ? (
            <div className="bg-surface p-6 rounded-3xl border border-border space-y-4">
              <h3 className="font-bold text-lg">Create New {activeTab === 'group' ? 'Group' : 'Channel'}</h3>
              <input
                type="text"
                placeholder="Enter name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full bg-background border border-border rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleCreateGroup}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all"
                >
                  Create
                </button>
                <button 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 bg-border text-text rounded-xl font-bold hover:bg-border/80 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full py-4 border-2 border-dashed border-border rounded-3xl flex items-center justify-center gap-3 text-muted hover:border-primary hover:text-primary transition-all group"
            >
              <Plus size={20} className="group-hover:scale-110 transition-transform" />
              <span className="font-bold">Create New {activeTab === 'group' ? 'Group' : 'Channel'}</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
