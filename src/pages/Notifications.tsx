import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Heart, MessageCircle, ShoppingBag, UserPlus, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    // In a real app, you would have a 'notifications' collection
    // For now, we'll simulate some notifications
    setNotifications([
      { id: '1', type: 'like', title: 'New Like', message: 'Mena Akter liked your post', time: '2m ago', icon: <Heart className="text-red-500" size={20} />, read: false },
      { id: '2', type: 'comment', title: 'New Comment', message: 'John Doe commented on your story', time: '1h ago', icon: <MessageCircle className="text-blue-500" size={20} />, read: false },
      { id: '3', type: 'order', title: 'Order Update', message: 'Your order #1234 has been shipped', time: '2h ago', icon: <ShoppingBag className="text-green-500" size={20} />, read: true },
      { id: '4', type: 'friend', title: 'Friend Request', message: 'Sarah sent you a friend request', time: '1d ago', icon: <UserPlus className="text-purple-500" size={20} />, read: true },
    ]);
  }, [user]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white p-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold flex-1">Notifications</h1>
        <button className="p-2 hover:bg-gray-100 rounded-full text-blue-600 font-bold text-sm">
          Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 flex flex-col items-center">
            <Bell size={48} className="text-gray-300 mb-4" />
            <p className="font-medium">No notifications yet.</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`flex items-start gap-4 p-4 rounded-2xl transition-colors cursor-pointer ${notif.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'}`}
            >
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                {notif.icon}
              </div>
              <div className="flex-1">
                <h3 className={`text-sm ${notif.read ? 'font-bold text-gray-900' : 'font-black text-blue-900'}`}>{notif.title}</h3>
                <p className={`text-sm ${notif.read ? 'text-gray-500' : 'text-blue-800'}`}>{notif.message}</p>
                <span className="text-xs text-gray-400 mt-1 block font-medium">{notif.time}</span>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
