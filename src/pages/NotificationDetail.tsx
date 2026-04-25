import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeft, 
  Bell, 
  ExternalLink, 
  Calendar, 
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export default function NotificationDetail() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotification() {
      if (!id || !currentUser) return;
      try {
        // Try personal notifications first
        const personalRef = doc(db, 'users', currentUser.uid, 'notifications', id);
        const personalSnap = await getDoc(personalRef);

        if (personalSnap.exists()) {
          const data = personalSnap.data();
          setNotification({ id: personalSnap.id, ...data });
          // Mark as read
          if (!data.read) {
            await updateDoc(personalRef, { read: true });
          }
        } else {
          // Try global notifications
          const globalRef = doc(db, 'global_notifications', id);
          const globalSnap = await getDoc(globalRef);
          if (globalSnap.exists()) {
            setNotification({ id: globalSnap.id, ...globalSnap.data(), read: true });
          }
        }
      } catch (error) {
        console.error("Error fetching notification:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchNotification();
  }, [id, currentUser]);

  const handleDelete = async () => {
    if (!id || !currentUser || !notification) return;
    try {
       // Only personal notifications can be deleted by user locally (global ones are read-only for history)
       const personalRef = doc(db, 'users', currentUser.uid, 'notifications', id);
       const snap = await getDoc(personalRef);
       if (snap.exists()) {
         // In a real app we might use deleteDoc, but here we just navigate back
         navigate('/notifications');
       } else {
         navigate('/notifications');
       }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAction = () => {
    if (!notification) return;
    const link = notification.link || notification.url;
    if (link) {
      if (link.startsWith('http')) {
        // If it's a full URL, we normally use window.open. 
        // For webview consistency, if it points back to our origin, we navigate.
        try {
          const urlObj = new URL(link);
          if (urlObj.origin === window.location.origin) {
            navigate(urlObj.pathname + urlObj.search + urlObj.hash);
            return;
          }
        } catch (e) {}
        window.open(link, '_blank');
      } else {
        // Internal paths already stay in webview
        navigate(link);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 px-4 text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <AlertTriangle className="text-red-500" size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Notification Not Found</h2>
        <p className="text-slate-500 mb-6 font-medium">This notification may have been removed or you don't have access.</p>
        <button 
          onClick={() => navigate('/notifications')}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft size={18} /> Back to Notifications
        </button>
      </div>
    );
  }

  const { type, senderName, message, timestamp, largeIcon, link, url, title } = notification;
  const displayTitle = title || senderName || 'Notification';
  const displayIcon = largeIcon || 'https://cdn-icons-png.flaticon.com/512/3119/3119338.png';
  const displayTime = timestamp ? format(timestamp.toDate(), 'PPP p') : 'Just now';

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4 z-40">
        <button 
          onClick={() => navigate('/notifications')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors mr-2"
        >
          <ArrowLeft size={24} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 truncate">Notification Detail</h1>
        <div className="flex-1" />
        <button 
          onClick={handleDelete}
          className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </header>

      <main className="flex-1 pt-20 pb-8 px-4 overflow-y-auto w-full max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
        >
          {/* Header Section */}
          <div className="p-6 border-b border-slate-100 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <img 
                src={displayIcon} 
                alt={displayTitle}
                className="w-20 h-20 rounded-2xl object-cover shadow-sm ring-4 ring-white"
              />
              <div className="absolute -bottom-1 -right-1 bg-blue-600 p-1.5 rounded-lg border-2 border-white">
                <Bell size={14} className="text-white" />
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 mb-1 leading-tight px-4">{displayTitle}</h2>
            <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
              <Calendar size={14} />
              <span>{displayTime}</span>
            </div>
          </div>

          {/* Body Section */}
          <div className="p-8">
            <p className="text-slate-700 text-lg leading-relaxed whitespace-pre-wrap font-medium">
              {message}
            </p>

            {/* Extra Data / Link Box */}
            {(link || url) && (
              <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Info className="text-blue-600" size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 mb-1">Attached Resource</h4>
                  <p className="text-sm text-slate-500 mb-3 line-clamp-1">{link || url}</p>
                  <button 
                    onClick={handleAction}
                    className="flex items-center gap-2 text-blue-600 font-bold hover:gap-3 transition-all"
                  >
                    Open Resource <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-6 bg-slate-50/50 border-t border-slate-100">
            <button 
              onClick={() => navigate('/notifications')}
              className="w-full py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors shadow-sm"
            >
              Back to History
            </button>
          </div>
        </motion.div>
        
        <div className="mt-8 flex flex-col items-center gap-4 px-8 text-center text-slate-400 text-sm font-medium">
           <p>This message was sent securely to your account. Do not share sensitive details via notifications.</p>
           <div className="flex items-center gap-1">
             <CheckCircle2 size={14} className="text-emerald-500" />
             <span>Verified by OC-CHAT Platform</span>
           </div>
        </div>
      </main>
    </div>
  );
}
