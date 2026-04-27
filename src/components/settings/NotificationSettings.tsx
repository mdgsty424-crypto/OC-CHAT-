import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft,
  Bell,
  MessageSquare,
  Heart,
  UserPlus,
  PlaySquare,
  AtSign,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function NotificationSettings({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(user?.notificationSettings?.pushEnabled ?? true);

  useEffect(() => {
    if (user?.notificationSettings) {
      setPushEnabled(user.notificationSettings.pushEnabled ?? true);
    }
  }, [user?.notificationSettings?.pushEnabled]);

  const togglePush = async () => {
    const newValue = !pushEnabled;
    setPushEnabled(newValue);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          'notificationSettings.pushEnabled': newValue
        });
      } catch (e) {
        console.error("Error updating notifications:", e);
        setPushEnabled(!newValue);
      }
    }
  };

  const notificationSections = [
    {
      title: "How you get notifications",
      items: [
        { id: 'push', label: "Push notifications", icon: <Smartphone size={20} className="text-blue-500" />, toggle: true, state: pushEnabled, set: togglePush },
      ]
    },
    {
      title: "Activity you're notified about",
      items: [
        { id: 'likes', label: "Likes and comments", icon: <Heart size={20} className="text-red-500" /> },
        { id: 'follow', label: "New followers", icon: <UserPlus size={20} className="text-emerald-500" /> },
        { id: 'mentions', label: "Tags and mentions", icon: <AtSign size={20} className="text-purple-500" /> },
        { id: 'messages', label: "Direct messages", icon: <MessageSquare size={20} className="text-teal-500" /> },
        { id: 'live', label: "Live videos", icon: <PlaySquare size={20} className="text-orange-500" /> },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-gray-50 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">Notifications</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notificationSections.map((section, idx) => (
          <div key={idx} className="mt-6">
            <h3 className="px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 leading-none">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map(item => (
                <div 
                   key={item.id}
                   className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                >
                   <div className="p-2 rounded-xl bg-gray-50">
                      {item.icon}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{item.label}</div>
                      {item.toggle && (
                        <div className="text-[10px] text-gray-500 font-medium">Get notifications on this device</div>
                      )}
                   </div>
                   {item.toggle ? (
                     <button 
                       onClick={() => item.set(!item.state)}
                       className={`w-12 h-6 rounded-full relative transition-colors ${item.state ? 'bg-blue-600' : 'bg-gray-200'}`}
                     >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.state ? 'right-1' : 'left-1'}`} />
                     </button>
                   ) : (
                     <div className="text-[10px] text-gray-400 font-black uppercase">Enabled</div>
                   )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
