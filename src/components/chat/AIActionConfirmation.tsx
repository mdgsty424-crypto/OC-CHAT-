import React, { useState } from 'react';
import { Check, X, Shield, User, Settings, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

interface AIActionConfirmationProps {
  actions: any[];
  onComplete: () => void;
}

export default function AIActionConfirmation({ actions, onComplete }: AIActionConfirmationProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  const stats = {
    messages: Math.floor(Math.random() * 1000),
    matches: Math.floor(Math.random() * 50),
    posts: Math.floor(Math.random() * 20),
    joinDate: '2024-01-15'
  };

  const handleConfirm = async () => {
    if (!user) return;
    setLoading(true);
    try {
      for (const action of actions) {
        if (action.name === 'update_profile') {
          await updateDoc(doc(db, 'users', user.uid), action.args);
        } else if (action.name === 'update_security') {
          const currentSecurity = user.securitySettings || {};
          await updateDoc(doc(db, 'users', user.uid), {
            securitySettings: { ...currentSecurity, ...action.args }
          });
        }
      }
      setComplete(true);
      setTimeout(onComplete, 2000);
    } catch (error) {
      console.error("Action error:", error);
      alert("Failed to perform action");
    } finally {
      setLoading(false);
    }
  };

  if (complete) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mt-2 flex items-center gap-3 text-green-600"
      >
        <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
          <Check size={16} strokeWidth={3} />
        </div>
        <span className="text-xs font-bold">Action completed successfully!</span>
      </motion.div>
    );
  }

  const isStatsAction = actions.some(a => a.name === 'get_user_stats');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mt-2 space-y-3"
    >
      <div className="flex items-center gap-2 text-primary">
        <Shield size={16} />
        <span className="text-xs font-black uppercase tracking-tight">
          {isStatsAction ? 'Information Shared' : 'Permission Requested'}
        </span>
      </div>
      
      <div className="space-y-2">
        {actions.map((action, i) => (
          <div key={i} className="bg-white/50 p-3 rounded-xl border border-black/5 flex items-center gap-3">
            {action.name === 'update_profile' ? (
              <User size={16} className="text-blue-500" />
            ) : action.name === 'get_user_stats' ? (
              <BarChart2 size={16} className="text-purple-500" />
            ) : (
              <Settings size={16} className="text-orange-500" />
            )}
            <div className="flex-1">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
                {action.name.replace(/_/g, ' ')}
              </p>
              <div className="text-xs font-medium text-text">
                {action.name === 'get_user_stats' ? (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="bg-black/5 p-2 rounded-lg">
                      <div className="text-[8px] text-muted uppercase">Messages</div>
                      <div className="font-bold">{stats.messages}</div>
                    </div>
                    <div className="bg-black/5 p-2 rounded-lg">
                      <div className="text-[8px] text-muted uppercase">Posts</div>
                      <div className="font-bold">{stats.posts}</div>
                    </div>
                  </div>
                ) : (
                  Object.entries(action.args).map(([k, v]) => (
                    <span key={k} className="mr-2 capitalize">{k.replace(/([A-Z])/g, ' $1')}: <span className="font-bold">{String(v)}</span></span>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isStatsAction && (
        <div className="flex gap-2">
          <button 
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Confirm'}
          </button>
          <button 
            onClick={onComplete}
            disabled={loading}
            className="px-4 py-2 bg-surface text-muted rounded-xl text-xs font-black uppercase hover:bg-border transition-colors border border-border"
          >
            Cancel
          </button>
        </div>
      )}
      
      {isStatsAction && (
        <button 
          onClick={onComplete}
          className="w-full py-2 bg-surface text-muted rounded-xl text-xs font-black uppercase hover:bg-border transition-colors border border-border"
        >
          Dismiss
        </button>
      )}
    </motion.div>
  );
}
