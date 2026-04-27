import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft,
  ChevronRight,
  Lock,
  MessageSquare,
  Eye,
  Users,
  Ban,
  Slash,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function PrivacySettings({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [messageView, setMessageView] = useState(false);

  useEffect(() => {
    if (user) {
      setIsPrivate(user.isPrivate || false);
    }
  }, [user?.isPrivate]);

  const togglePrivacy = async () => {
    const newValue = !isPrivate;
    setIsPrivate(newValue);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          isPrivate: newValue
        });
      } catch (e) {
        console.error("Error updating privacy:", e);
        setIsPrivate(!newValue); // Revert
      }
    }
  };

  const updateMessageControl = async (option: string) => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          'privacy.messageControl': option
        });
      } catch (e) {
        console.error("Error updating message control:", e);
      }
    }
  };

  const privacyOptions = [
    { id: 'tags', label: "Tags and mentions", icon: <AtSignIcon />, value: user?.privacy?.tags || "Everyone" },
    { id: 'messages', label: "Messages", icon: <MessageSquare size={20} />, value: user?.privacy?.messageControl || "Friends only", action: () => setMessageView(true) },
    { id: 'activity', label: "Activity status", icon: <Eye size={20} />, value: user?.privacy?.activityStatus ? "On" : "Off" },
    { id: 'restricted', label: "Restricted accounts", icon: <Slash size={20} />, value: "0" },
    { id: 'blocked', label: "Blocked accounts", icon: <Ban size={20} />, value: "0" },
  ];

  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-gray-50">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">Privacy</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Account Privacy Toggle */}
        <section className="p-4 border-b border-gray-50">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Account privacy</h3>
           <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-4">
                 <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                    <Lock size={20} className={isPrivate ? "text-blue-600" : "text-gray-400"} />
                 </div>
                 <div>
                    <div className="font-bold text-sm">Private account</div>
                    <div className="text-[10px] text-gray-500 font-medium">Only people you approve can see your posts.</div>
                 </div>
              </div>
              <button 
                onClick={togglePrivacy}
                className={`w-12 h-6 rounded-full relative transition-colors ${isPrivate ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPrivate ? 'right-1' : 'left-1'}`} />
              </button>
           </div>
        </section>

        {/* Interactions List */}
        <section className="p-4 space-y-4">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Interactions</h3>
           <div className="space-y-1">
              {privacyOptions.map(opt => (
                <button 
                  key={opt.id}
                  onClick={opt.action}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                   <div className="text-gray-400">{opt.icon}</div>
                   <span className="flex-1 font-bold text-sm">{opt.label}</span>
                   <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-medium">{opt.value}</span>
                      <ChevronRight size={18} className="text-gray-300" />
                   </div>
                </button>
              ))}
           </div>
        </section>
      </div>

      {/* Messaging Control Layer */}
      <AnimatePresence>
         {messageView && (
           <motion.div 
             initial={{ x: '100%' }}
             animate={{ x: 0 }}
             exit={{ x: '100%' }}
             className="fixed inset-0 bg-white z-[130] flex flex-col"
           >
              <div className="p-4 flex items-center gap-4 border-b border-gray-50">
                 <button onClick={() => setMessageView(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ChevronLeft size={24} />
                 </button>
                 <h1 className="text-xl font-black">Message controls</h1>
              </div>
              
              <div className="flex-1 p-6 space-y-8">
                 <div className="space-y-4">
                    <h3 className="text-sm font-black">Who can message you</h3>
                    <div className="space-y-2">
                       {['Everyone', 'Friends only', 'No one'].map(option => (
                         <button 
                           key={option}
                           onClick={() => updateMessageControl(option)}
                           className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-black/5 active:bg-gray-100"
                         >
                            <span className="font-bold">{option}</span>
                            <div className={`w-5 h-5 rounded-full border-2 ${user?.privacy?.messageControl === option || (!user?.privacy?.messageControl && option === 'Friends only') ? 'border-blue-600 bg-blue-600' : 'border-gray-200'}`}>
                               {(user?.privacy?.messageControl === option || (!user?.privacy?.messageControl && option === 'Friends only')) && <div className="m-1 w-2 h-2 bg-white rounded-full" />}
                            </div>
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <p className="text-xs text-blue-800 leading-relaxed font-medium">
                       Choosing "No one" will prevent anyone from starting new chats with you, but you can still message people you follow.
                    </p>
                 </div>
              </div>
           </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}

function AtSignIcon() {
  return (
    <div className="relative w-5 h-5 flex items-center justify-center">
       <span className="text-lg font-black leading-none">@</span>
    </div>
  );
}
