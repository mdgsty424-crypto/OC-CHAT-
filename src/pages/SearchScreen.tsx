import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { User } from '../types';
import { Search as SearchIcon, ArrowLeft, X, Clock, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import UserList from '../components/chat/UserList';
import { cn } from '../lib/utils';

const RECENT_SEARCHES_KEY = 'oc_chat_recent_searches';

export default function SearchScreen() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [recentSearches, setRecentSearches] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading recent searches:", e);
      }
    }
  }, []);

  // Save to recent searches
  const addToRecent = useCallback((user: User) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(u => u.uid !== user.uid);
      const updated = [user, ...filtered].slice(0, 5);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Debounced search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const q = searchQuery.toLowerCase();
        const usersRef = collection(db, 'users');
        
        // Firestore prefix search for displayName
        // Note: This is case-sensitive in Firestore if not stored normalized.
        // We assume displayName or a searchName field is used.
        // For simplicity, we'll search by displayName and username.
        const nameQuery = query(
          usersRef,
          where('displayName', '>=', searchQuery),
          where('displayName', '<=', searchQuery + '\uf8ff'),
          limit(10)
        );

        const usernameQuery = query(
          usersRef,
          where('username', '>=', q),
          where('username', '<=', q + '\uf8ff'),
          limit(10)
        );

        const [nameSnap, usernameSnap] = await Promise.all([
          getDocs(nameQuery),
          getDocs(usernameQuery)
        ]);

        const usersMap = new Map<string, User>();
        
        nameSnap.forEach(doc => {
          if (doc.id !== currentUser?.uid) {
            usersMap.set(doc.id, { uid: doc.id, ...doc.data() } as User);
          }
        });

        usernameSnap.forEach(doc => {
          if (doc.id !== currentUser?.uid) {
            usersMap.set(doc.id, { uid: doc.id, ...doc.data() } as User);
          }
        });

        setResults(Array.from(usersMap.values()));
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms Debounce

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser?.uid]);

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-300">
      {/* Header with Search Bar */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-surface rounded-full transition-colors text-muted hover:text-text"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="flex-1 relative group">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
          <input
            autoFocus
            type="text"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-full py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-muted/20 hover:bg-muted/40 rounded-full transition-colors"
              >
                <X size={14} className="text-muted" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {!isSearching ? (
          <>
            {recentSearches.length > 0 ? (
              <div className="py-2">
                <div className="px-6 py-4 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                    <Clock size={12} />
                    Recent Searches
                  </h3>
                  <button 
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem(RECENT_SEARCHES_KEY);
                    }}
                    className="text-[10px] font-black text-primary uppercase tracking-wider hover:opacity-70"
                  >
                    Clear All
                  </button>
                </div>
                <UserList 
                  users={recentSearches} 
                  onUserClick={(u) => {
                    addToRecent(u);
                    navigate(`/chat/${u.uid}`);
                  }} 
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 px-10 text-center opacity-30">
                <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-6 border border-border">
                  <SearchIcon size={40} className="text-muted" />
                </div>
                <h3 className="text-xl font-black mb-2">Search Global Users</h3>
                <p className="text-sm font-medium">Find anyone on OC-CHAT by their name or username.</p>
              </div>
            )}
          </>
        ) : (
          <UserList 
            users={results} 
            loading={loading}
            onUserClick={(u) => {
              addToRecent(u);
              navigate(`/chat/${u.uid}`);
            }}
            emptyMessage="No users found"
            title="Search Results"
          />
        )}
      </div>
    </div>
  );
}
