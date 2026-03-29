import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Search, Plus, Users, Hash, Radio, ChevronRight, MoreVertical, Loader2, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, where, onSnapshot, addDoc, orderBy, updateDoc, doc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Group } from '../types';
import { useNavigate } from 'react-router-dom';

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
      where('type', '==', activeTab),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
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
    
    const isMember = item.members.includes(user.uid);
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

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto pb-24 bg-background">
      {/* Search & Tabs */}
      <div className="px-6 py-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder={`Search ${activeTab}s...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>

        <div className="flex bg-border/50 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('group')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === 'group' ? "bg-white text-primary shadow-sm" : "text-muted hover:text-text"
            )}
          >
            <Users size={16} />
            Groups
          </button>
          <button
            onClick={() => setActiveTab('channel')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === 'channel' ? "bg-white text-primary shadow-sm" : "text-muted hover:text-text"
            )}
          >
            <Radio size={16} />
            Channels
          </button>
        </div>
      </div>

      {/* List */}
      <div className="mt-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isMember = user ? item.members.includes(user.uid) : false;
            return (
              <div 
                key={item.id} 
                onClick={() => handleJoin(item)}
                className="flex items-center gap-4 px-6 py-4 hover:bg-white/50 transition-all group cursor-pointer"
              >
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
                      {item.members.length} members
                    </span>
                  </div>
                  <p className="text-sm text-muted truncate">{item.lastMessage}</p>
                </div>

                <div className="flex items-center gap-2">
                  {joiningId === item.id ? (
                    <Loader2 className="animate-spin text-primary" size={20} />
                  ) : isMember ? (
                    <Check size={20} className="text-green-500" />
                  ) : (
                    <ChevronRight size={20} className="text-border group-hover:text-primary transition-colors" />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 px-10">
            <p className="text-muted text-sm">No {activeTab}s found. Be the first to create one!</p>
          </div>
        )}

        {/* Create New */}
        <div className="px-6 py-8">
          {isCreating ? (
            <div className="bg-white p-6 rounded-3xl shadow-soft border border-border space-y-4">
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
