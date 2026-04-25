import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  ShoppingBag, 
  UserPlus, 
  Bell, 
  MoreHorizontal, 
  Settings, 
  Search,
  Check,
  Trash2,
  EyeOff,
  Share2,
  ThumbsUp,
  Video,
  DollarSign,
  PhoneIncoming,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  senderName: string;
  senderPhoto: string;
  message: string;
  link?: string;
  data?: any;
  timestamp: Timestamp | any;
  read: boolean;
}

export default function Notifications() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [globalNotifications, setGlobalNotifications] = useState<Notification[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);
    
    // 1. Personal Notifications
    const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');
    const qPersonal = query(notificationsRef, orderBy('timestamp', 'desc'));

    const unsubscribePersonal = onSnapshot(qPersonal, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(notifs);
    });

    // 2. Global Notifications
    const globalRef = collection(db, 'global_notifications');
    const qGlobal = query(globalRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribeGlobal = onSnapshot(qGlobal, (snapshot) => {
      const globNotifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        read: true // Global notifications are typically informational and don't track read per-user easily without a link table
      })) as Notification[];
      setGlobalNotifications(globNotifs);
    });

    return () => {
      unsubscribePersonal();
      unsubscribeGlobal();
    };
  }, [currentUser]);

  useEffect(() => {
    if (loading && (notifications.length > 0 || globalNotifications.length > 0)) {
       setLoading(false);
    }
  }, [notifications, globalNotifications]);

  const allNotifications = [...notifications, ...globalNotifications].sort((a, b) => {
    const timeA = a.timestamp?.seconds || 0;
    const timeB = b.timestamp?.seconds || 0;
    return timeB - timeA;
  });

  const handleMarkAsRead = async (id: string) => {
    if (!currentUser) return;
    try {
      const notifRef = doc(db, 'users', currentUser.uid, 'notifications', id);
      await updateDoc(notifRef, { read: true });
      setActiveMenu(null);
    } catch (e) {
      console.error("Failed to mark read:", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    try {
      const notifRef = doc(db, 'users', currentUser.uid, 'notifications', id);
      await deleteDoc(notifRef);
      setActiveMenu(null);
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  };

  const markAllRead = async () => {
    if (!currentUser) return;
    try {
      const unread = notifications.filter(n => !n.read);
      const promises = unread.map(n => 
        updateDoc(doc(db, 'users', currentUser.uid!, 'notifications', n.id), { read: true })
      );
      await Promise.all(promises);
    } catch (e) {
      console.error("Failed to mark all read:", e);
    }
  };

  const filteredNotifs = filter === 'unread' 
    ? allNotifications.filter(n => !n.read) 
    : allNotifications;

  const getActionOverlay = (type: string) => {
    switch (type) {
      case 'like': return { icon: <ThumbsUp size={12} fill="white" stroke="white" />, color: 'bg-blue-500' };
      case 'comment': return { icon: <MessageCircle size={10} fill="white" stroke="white" />, color: 'bg-green-500' };
      case 'call': return { icon: <PhoneIncoming size={10} stroke="white" />, color: 'bg-green-600' };
      case 'payment': return { icon: <DollarSign size={10} stroke="white" />, color: 'bg-emerald-500' };
      case 'mention': return { icon: <Bell size={10} fill="white" stroke="white" />, color: 'bg-blue-600' };
      case 'share': return { icon: <Share2 size={10} fill="white" stroke="white" />, color: 'bg-purple-500' };
      case 'video': return { icon: <Video size={10} fill="white" stroke="white" />, color: 'bg-red-500' };
      case 'alert': return { icon: <AlertTriangle size={10} stroke="white" />, color: 'bg-orange-500' };
      default: return { icon: <Bell size={10} fill="white" stroke="white" />, color: 'bg-blue-500' };
    }
  };

  const getTimeLabel = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    try {
      const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Recently';
    }
  };

  const handleNotifClick = (notif: Notification) => {
    if (!notif.read) handleMarkAsRead(notif.id);
    if (notif.link) {
      if (notif.link.startsWith('http')) {
        window.location.href = notif.link;
      } else {
        navigate(notif.link);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background select-none">
      {/* Facebook Header */}
      <header className="bg-background border-b border-border/50 sticky top-0 z-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors active:scale-95"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-muted rounded-full transition-colors">
              <Search size={22} className="text-foreground" />
            </button>
            <button className="p-2 hover:bg-muted rounded-full transition-colors">
              <Settings size={22} className="text-foreground" />
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 mt-4">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
              filter === 'all' 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('unread')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
              filter === 'unread' 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Unread
          </button>
        </div>
      </header>

      {/* Header Context Action */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-border/20">
        <span className="text-sm font-bold text-foreground">Earlier</span>
        <button 
          onClick={markAllRead}
          className="text-sm text-blue-600 font-medium hover:bg-blue-50 px-2 py-1 rounded"
        >
          Mark all as read
        </button>
      </div>

      {/* Notifications List */}
      <main className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        <AnimatePresence initial={false}>
          {loading ? (
            <div className="flex flex-col gap-4 p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2 py-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 px-10 text-center"
            >
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <Bell size={40} className="text-muted-foreground/30" />
              </div>
              <p className="text-lg font-bold text-foreground uppercase tracking-widest text-[10px]">No notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter === 'unread' ? "You don't have any unread notifications." : "We'll notify you when something happens."}
              </p>
            </motion.div>
          ) : (
            filteredNotifs.map((notif) => {
              const overlay = getActionOverlay(notif.type);
              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => handleNotifClick(notif)}
                  className={`group relative flex items-center gap-3 px-4 py-3 transition-colors ${
                    !notif.read ? 'bg-blue-50/50' : 'hover:bg-muted/30'
                  } cursor-pointer`}
                >
                  {/* Profile Pic with Badge Overlay */}
                  <div className="relative shrink-0">
                    <img 
                      src={notif.senderPhoto} 
                      alt={notif.senderName} 
                      className="w-16 h-16 rounded-full object-cover border border-border/50"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
                      }}
                    />
                    <div className={`absolute bottom-0 -right-1 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${overlay.color}`}>
                      {overlay.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[15px] leading-snug break-words line-clamp-3">
                      <span className="font-extrabold text-foreground">{notif.senderName} </span>
                      <span className={`${!notif.read ? 'font-bold text-foreground' : 'text-foreground/80'}`}>{notif.message}</span>
                    </p>
                    <p className={`text-[11px] mt-1 font-medium ${notif.read ? 'text-muted-foreground' : 'text-blue-600'}`}>
                      {getTimeLabel(notif.timestamp)}
                    </p>
                  </div>

                  {/* Right Side Info: Unread Dot + Menu */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    {!notif.read && (
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === notif.id ? null : notif.id);
                      }}
                      className={`p-2 rounded-full hover:bg-muted transition-opacity ${
                        activeMenu === notif.id ? 'opacity-100 bg-muted' : 'opacity-100 group-hover:opacity-100'
                      }`}
                    >
                      <MoreHorizontal size={20} className="text-muted-foreground" />
                    </button>
                  </div>

                  {/* Management Menu */}
                  <AnimatePresence>
                    {activeMenu === notif.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-[60]" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(null);
                          }}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, x: 20 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95, x: 20 }}
                          className="absolute right-4 top-14 w-64 bg-background border border-border shadow-2xl rounded-2xl z-[70] overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="p-2 space-y-1">
                            {!notif.read && (
                              <button 
                                onClick={() => handleMarkAsRead(notif.id)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-xl transition-colors text-sm font-bold"
                              >
                                <Check size={18} className="text-blue-600" />
                                Mark as read
                              </button>
                            )}
                            <button 
                              onClick={() => handleDelete(notif.id)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-xl transition-colors text-sm font-bold"
                            >
                              <Trash2 size={18} className="text-foreground" />
                              Remove this notification
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-xl transition-colors text-sm font-bold">
                              <EyeOff size={18} className="text-foreground" />
                              Hide notifications like this
                            </button>
                            <div className="h-px bg-border/50 my-1" />
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-xl transition-colors text-sm font-bold">
                              <Settings size={18} className="text-foreground" />
                              Notification settings
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </main>

      <div className="h-4 bg-background" />
    </div>
  );
}
