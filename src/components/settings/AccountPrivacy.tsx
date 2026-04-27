import React, { useState, useEffect } from 'react';
import { ChevronLeft, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function AccountPrivacy({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setIsPrivate(user.isPrivate || false);
    }
  }, [user?.isPrivate]);

  const handleToggle = async () => {
    if (!isPrivate) {
      setShowConfirm(true);
    } else {
      await updatePrivacy(false);
    }
  };

  const updatePrivacy = async (value: boolean) => {
    setIsPrivate(value);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          isPrivate: value
        });
      } catch (e) {
        console.error("Error updating account privacy:", e);
        setIsPrivate(!value);
      }
    }
  };

  const confirmSwitch = () => {
    updatePrivacy(true);
    setShowConfirm(false);
  };

  return (
    <div className="flex flex-col h-full bg-white text-black">
      <div className="flex items-center gap-4 p-4 border-b border-gray-100">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">Account Privacy</h1>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-bold">Private Account</span>
            <span className="text-xs text-gray-500 max-w-[240px]">
              When your account is private, only people you approve can see your photos and videos.
            </span>
          </div>
          <button 
            onClick={handleToggle}
            className={`w-12 h-6 rounded-full relative transition-colors ${isPrivate ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <motion.div 
              animate={{ x: isPrivate ? 24 : 4 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
            />
          </button>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-400 leading-relaxed">
            Your existing followers won't be affected. Anyone can see your profile picture, but only approved followers can see what you share.
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="text-blue-600" size={32} />
                </div>
                <h3 className="text-xl font-black mb-2">Switch to private?</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Only your followers will be able to see your photos and videos. This won't change who can message, tag, or mention you.
                </p>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={confirmSwitch}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl active:scale-[0.98] transition-transform"
                  >
                    Switch to Private
                  </button>
                  <button 
                    onClick={() => setShowConfirm(false)}
                    className="w-full py-3 font-bold text-gray-400 hover:text-black transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
