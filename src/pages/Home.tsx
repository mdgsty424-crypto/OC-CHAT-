import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDocs, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Chat, User, Story } from '../types';
import { getChats, saveChat, initDB } from '../lib/db';
import ChatListItem from '../components/chat/ChatListItem';
import UserChatListItem from '../components/chat/UserChatListItem';
import { Search, Plus, Archive, EyeOff, Lock, Video, ArrowLeft, Pin, Trash2, ShieldAlert, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import StoryPlayer from '../components/stories/StoryPlayer';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings: globalSettings } = useGlobalSettings();
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedUserStories, setSelectedUserStories] = useState<Story[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'all' | 'archived'>('all');
  const [showHiddenInput, setShowHiddenInput] = useState(false);
  const [hiddenPassword, setHiddenPassword] = useState('');
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const toggleChatSelection = (chatId: string) => {
    setSelectedChats(prev => 
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const clearSelection = () => {
    setSelectedChats([]);
    setShowMenu(false);
  };

  const selectAllChats = () => {
    setSelectedChats(filteredChats.map(c => c.id));
    setShowMenu(false);
  };

  const handleAddToHome = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
      alert('Add to Home Screen is not available.');
    }
    setShowMenu(false);
  };

  const handleAction = async (action: string) => {
    if (!user) return;
    const batch = writeBatch(db);
    
    switch (action) {
      case 'pin':
        selectedChats.forEach(chatId => {
          const userRef = doc(db, 'users', user.uid);
          batch.update(userRef, { pinnedChats: arrayUnion(chatId) });
        });
        break;
      case 'delete':
        if (!confirm('Are you sure you want to delete these conversations?')) return;
        selectedChats.forEach(chatId => {
          const chatRef = doc(db, 'chats', chatId);
          batch.update(chatRef, { participants: arrayRemove(user.uid) });
        });
        break;
      case 'block':
        selectedChats.forEach(chatId => {
          const chat = chats.find(c => c.id === chatId);
          if (chat && chat.type === 'direct') {
            const otherId = chat.participants?.find(id => id !== user.uid);
            if (otherId) {
              const userRef = doc(db, 'users', user.uid);
              batch.update(userRef, { blockedUsers: arrayUnion(otherId) });
            }
          }
        });
        break;
      case 'archive':
        selectedChats.forEach(chatId => {
          const chatRef = doc(db, 'chats', chatId);
          batch.update(chatRef, { [`isArchived.${user.uid}`]: true });
        });
        break;
      case 'mark-unread':
        selectedChats.forEach(chatId => {
          const chatRef = doc(db, 'chats', chatId);
          batch.update(chatRef, { [`unreadCount.${user.uid}`]: 1 });
        });
        break;
      case 'lock':
        selectedChats.forEach(chatId => {
          const chatRef = doc(db, 'chats', chatId);
          batch.update(chatRef, { [`isLocked.${user.uid}`]: true });
        });
        break;
      case 'clear':
        if (!confirm('Are you sure you want to clear all messages in these conversations?')) return;
        selectedChats.forEach(chatId => {
          const chatRef = doc(db, 'chats', chatId);
          batch.update(chatRef, { lastMessage: '', lastMessageTime: new Date().toISOString() });
        });
        break;
      case 'view-contact':
        if (selectedChats.length === 1) {
          const chat = chats.find(c => c.id === selectedChats[0]);
          if (chat && chat.type === 'direct') {
            const otherId = chat.participants?.find(id => id !== user.uid);
            if (otherId) navigate(`/profile/${otherId}`);
          }
        }
        break;
    }
    
    await batch.commit();
    clearSelection();
  };

  const onlineUsers = allUsers.filter(u => u.online && u.uid).slice(0, 5);
  const usersWithoutChats = allUsers.filter(u => u.uid && !chats.some(c => c.participants && Array.isArray(c.participants) && c.participants.includes(u.uid)));

  useEffect(() => {
    if (!user) return;
    
    console.log('My UID:', user.uid);
    // Removed setLoading(true);

    // Load from IndexedDB first
    const loadLocalData = async () => {
      const localChats = await getChats();
      if (localChats.length > 0) {
        setChats(localChats as any);
      }
      const dbInstance = await initDB();
      const localUsers = await dbInstance.getAll('users');
      if (localUsers.length > 0) {
        setAllUsers(localUsers as any);
      }
      // Removed setLoading(false);
    };
    loadLocalData();

    // Fetch current user profile
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setCurrentUserProfile({ uid: doc.id, ...doc.data() } as User);
      }
    });

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      // Sort client-side
      chatList.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
      setChats(chatList);
      // Save to IndexedDB
      chatList.forEach(chat => saveChat(chat as any));
    }, (error) => {
      console.log('Chat/Profile Fetch Error:', error);
    });

    // Fetch all users
    const usersQ = query(collection(db, 'users'));
    getDocs(usersQ).then((snapshot) => {
      const usersList = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as User))
        .filter(u => u.uid && u.uid !== user.uid);
      setAllUsers(usersList);
      // Save users to IndexedDB
      const saveUsers = async () => {
        const dbInstance = await initDB();
        for (const u of usersList) {
          await dbInstance.put('users', u);
        }
      };
      saveUsers();
    }).catch((error) => {
      console.error("Error fetching users:", error);
    });

    // Fetch all stories
    const storiesQ = query(collection(db, 'stories'));
    getDocs(storiesQ).then((snapshot) => {
      const storiesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
      storiesList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setStories(storiesList);
    }).catch((error) => {
      console.error("Error fetching stories:", error);
    });

    return () => {
      unsubscribe();
      unsubUser();
    };
  }, [user]);

  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.userId]) {
      acc[story.userId] = [];
    }
    acc[story.userId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const storyUsers = Object.keys(groupedStories).map(uid => {
    const u = allUsers.find(user => user.uid === uid) || { uid, displayName: 'User', photoURL: '' } as User;
    return { ...u, stories: groupedStories[uid] };
  });

  const filteredChats = chats.filter(chat => {
    const isArchived = chat.isArchived?.[user?.uid || ''] || false;
    const isHidden = chat.isHidden?.[user?.uid || ''] || false;

    if (view === 'archived') return isArchived;
    if (view === 'hidden') return isHidden;
    return !isArchived && !isHidden;
  }).filter(chat => {
    const name = chat.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleHiddenAccess = () => {
    if (hiddenPassword === '1234') { // Mock password
      setView('hidden');
      setShowHiddenInput(false);
      setHiddenPassword('');
    } else {
      alert('Incorrect Password');
    }
  };

  return (
    <main className="flex-1 overflow-y-auto pb-40 bg-background no-scrollbar flex flex-col gap-y-4">
      {/* Search Bar / Action Bar */}
      <div className="px-6 mt-2 mb-4">
        {selectedChats.length > 0 ? (
          <div className="flex items-center justify-between bg-surface border border-border rounded-full py-3 px-4 shadow-sm">
            <div className="flex items-center gap-4">
              <button onClick={clearSelection} className="text-text">
                <ArrowLeft size={20} />
              </button>
              <span className="font-extrabold text-text">{selectedChats.length} selected</span>
            </div>
            <div className="flex items-center gap-4 text-muted">
              <button onClick={() => handleAction('pin')}><Pin size={20} /></button>
              <button onClick={() => handleAction('delete')}><Trash2 size={20} /></button>
              <button onClick={() => handleAction('block')}><ShieldAlert size={20} /></button>
              <button onClick={() => handleAction('archive')}><Archive size={20} /></button>
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)}><MoreVertical size={20} /></button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-2xl shadow-xl z-50 p-2">
                    <button onClick={handleAddToHome} className="block w-full text-left px-4 py-2 hover:bg-background rounded-xl text-sm font-medium">Add chat shortcut</button>
                    <button onClick={() => handleAction('view-contact')} className="block w-full text-left px-4 py-2 hover:bg-background rounded-xl text-sm font-medium">View contact</button>
                    <button onClick={() => handleAction('mark-unread')} className="block w-full text-left px-4 py-2 hover:bg-background rounded-xl text-sm font-medium">Mark as unread</button>
                    <button onClick={selectAllChats} className="block w-full text-left px-4 py-2 hover:bg-background rounded-xl text-sm font-medium">Select all</button>
                    <button onClick={() => handleAction('lock')} className="block w-full text-left px-4 py-2 hover:bg-background rounded-xl text-sm font-medium">Lock chat</button>
                    <button onClick={() => handleAction('clear')} className="block w-full text-left px-4 py-2 hover:bg-background rounded-xl text-sm font-medium">Clear chat</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative group" onClick={() => navigate('/search')}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
            <input
              type="text"
              readOnly
              placeholder="Search chats, groups, channels..."
              className={cn("w-full bg-surface border border-border rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium cursor-pointer", globalSettings.fontFamily)}
            />
          </div>
        )}
      </div>

      {/* Stories Section */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className={cn("text-[10px] font-black text-muted uppercase tracking-[0.2em]", globalSettings.fontFamily)}>Stories</h3>
          <span className={cn("text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full", globalSettings.fontFamily)}>{storyUsers.length} active</span>
        </div>
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
          {/* Your Story / Add Story */}
          <div 
            onClick={() => navigate('/story', { state: { openUpload: true } })}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
          >
            <div className="relative">
              <div className={cn(globalSettings.storyCircleSize, "rounded-full p-0.5 border-2 border-dashed border-muted flex items-center justify-center group-hover:border-primary transition-colors overflow-hidden")}>
                <img 
                  src={currentUserProfile?.photoURL || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity rounded-full"
                  alt="Your Story"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Plus size={20} className="text-white drop-shadow-md" />
                </div>
              </div>
            </div>
            <span className={cn("text-[10px] font-extrabold text-muted", globalSettings.fontFamily)}>Your Story</span>
          </div>

          {storyUsers.map(u => (
            <div 
              key={`story-${u.uid}`} 
              onClick={() => setSelectedUserStories(u.stories)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
            >
              <div className="relative">
                <div className={cn(globalSettings.storyCircleSize, "rounded-full p-1 border-2 border-primary flex items-center justify-center group-hover:scale-105 transition-transform")}>
                  <img 
                    src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} 
                    className="w-full h-full rounded-full object-cover"
                    alt={u.displayName}
                    loading="lazy"
                  />
                </div>
                {u.online && (
                  <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-surface rounded-full"></div>
                )}
              </div>
              <span className={cn("text-[10px] font-extrabold text-muted truncate w-14 text-center", globalSettings.fontFamily)}>{(u.displayName || 'User').split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Story Player Modal */}
      {selectedUserStories && (
        <StoryPlayer 
          stories={selectedUserStories} 
          onClose={() => setSelectedUserStories(null)} 
        />
      )}

      {/* Chat List Section */}
      <div className="bg-background flex-1">
        <div className="px-6 py-2 border-b border-border flex justify-between items-center bg-background sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setView('all')}
              className={cn(
                "text-base font-black tracking-tight transition-all relative py-2", 
                view === 'all' ? "text-primary" : "text-muted hover:text-text",
                globalSettings.fontFamily
              )}
            >
              Chats
              {view === 'all' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
            <button 
              onClick={() => setView('archived')}
              className={cn(
                "text-base font-black tracking-tight transition-all relative py-2", 
                view === 'archived' ? "text-primary" : "text-muted hover:text-text",
                globalSettings.fontFamily
              )}
            >
              Archived
              {view === 'archived' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
          </div>
          
          <button 
            onClick={() => setShowHiddenInput(true)}
            className="p-2 hover:bg-surface rounded-xl text-muted hover:text-primary transition-colors"
          >
            <Lock size={18} />
          </button>
        </div>
        
        <div className="divide-y divide-border">
          {filteredChats.map((chat) => (
            <ChatListItem 
              key={`chat-${chat.id}`} 
              chat={chat} 
              isSelected={selectedChats.includes(chat.id)}
              onSelect={toggleChatSelection}
            />
          ))}
          {view === 'all' && usersWithoutChats.map((u) => (
            <UserChatListItem key={`user-${u.uid}`} user={u} />
          ))}
          {filteredChats.length === 0 && (view !== 'all' || usersWithoutChats.length === 0) && chats.length > 0 && (
            <div className="flex flex-col items-center justify-center py-24 px-10 text-center opacity-40">
              <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-6 border border-border">
                <Search size={40} className="text-muted" />
              </div>
              <h3 className="text-xl font-black mb-2">No {view} chats</h3>
              <p className="text-sm font-medium">Start a new conversation with your friends!</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Chats Password Modal */}
      <AnimatePresence>
        {showHiddenInput && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface rounded-[2rem] p-8 w-full max-w-xs border border-border text-center card-3d"
            >
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock size={32} />
              </div>
              <h3 className="text-xl font-black mb-2">Hidden Chats</h3>
              <p className="text-sm text-muted mb-6">Enter password to access your hidden conversations.</p>
              <input 
                type="password" 
                value={hiddenPassword}
                onChange={(e) => setHiddenPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-surface border border-border rounded-2xl py-3 px-4 mb-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowHiddenInput(false)}
                  className="flex-1 py-3 bg-surface text-text rounded-2xl font-extrabold border border-border"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleHiddenAccess}
                  className="flex-1 py-3 bg-primary text-white rounded-2xl font-extrabold"
                >
                  Unlock
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
