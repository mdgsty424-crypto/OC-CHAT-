import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Shield, 
  FileAudio, 
  BarChart3, 
  Search, 
  UserX, 
  UserCheck, 
  Trash2, 
  Mail, 
  ExternalLink, 
  Bell, 
  Upload,
  ChevronRight,
  Settings,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Palette
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  setDoc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { User } from '../types';
import { sendPasswordResetEmail } from 'firebase/auth';
import { cn } from '../lib/utils';
import UserDetailsModal from '../components/admin/UserDetailsModal';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'assets' | 'stats' | 'broadcast' | 'ui' | 'groups' | 'push_test'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [pushUsers, setPushUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    messages24h: 0
  });

  // Advanced Notification Form State
  const [notifForm, setNotifForm] = useState({
    target: 'all',
    targetUID: '',
    title: 'OC-CHAT Global Announcement',
    message: '',
    image: '',
    link: '',
    priority: 'high',
    type: 'broadcast' as 'broadcast' | 'message' | 'call' | 'reel' | 'post' | 'alert',
    actionText: 'Open App',
    actionUrl: ''
  });
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // ... existing Security Check ...

  useEffect(() => {
    // ... existing onSnapshot(collection(db, 'users')) ...
  }, []);

  const fetchPushData = async () => {
    try {
      const res = await fetch('/api/admin/users-push-data');
      if (res.ok) {
        const data = await res.json();
        setPushUsers(data);
      }
    } catch (err) {
      console.error("Error fetching push data:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'push_test') {
      fetchPushData();
    }
  }, [activeTab]);

  const handleAdvancedNotifSend = async () => {
    if (!notifForm.message.trim() || !notifForm.title.trim()) {
      alert("Title and Message are required");
      return;
    }

    setIsSendingNotif(true);
    try {
      const payload: any = {
        targetUserId: notifForm.target === 'all' ? 'all' : notifForm.targetUID,
        title: notifForm.title,
        message: notifForm.message,
        image: notifForm.image || undefined,
        link: notifForm.link || undefined,
        priority: notifForm.priority,
      };

      // Add actions if provided
      if (notifForm.actionText) {
        payload.actions = [
          {
            action: 'open',
            title: notifForm.actionText,
            url: notifForm.actionUrl || notifForm.link || window.location.origin
          }
        ];
      }

      // Add icon presets based on type
      if (notifForm.type === 'message') {
        payload.image = payload.image || 'https://cdn-icons-png.flaticon.com/512/733/733585.png';
      } else if (notifForm.type === 'call') {
        payload.image = payload.image || 'https://cdn-icons-png.flaticon.com/512/9431/9431109.png';
      } else if (notifForm.type === 'reel') {
        payload.image = payload.image || 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png';
      }

      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok) {
        alert(`Notification Sent! Recipients: ${result.recipients || 'Requested'}`);
      } else {
        alert(`Error: ${result.error || 'Failed to send'}`);
      }
    } catch (error) {
      console.error("Broadcast failed:", error);
      alert("System error sending notification.");
    } finally {
      setIsSendingNotif(false);
    }
  };
  const [assets, setAssets] = useState({
    ringtone: 'https://res.cloudinary.com/demo/video/upload/v1626343568/sample_audio.mp3',
    sent: 'https://actions.google.com/sounds/v1/multimedia/message_sent.ogg',
    received: 'https://actions.google.com/sounds/v1/multimedia/notification_high_intensity.ogg',
    typing: 'https://actions.google.com/sounds/v1/foley/keyboard_typing_fast.ogg'
  });
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const { settings, updateSettings } = useGlobalSettings();

  // Security Check
  if (!currentUser || (currentUser.email !== 'info@ocsthael.com' && currentUser.role !== 'admin')) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    // Fetch Users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => doc.data() as User);
      setUsers(usersList);
      setLoading(false);
    });

    // Fetch Posts
    const unsubscribePosts = onSnapshot(collection(db, 'books_posts'), (snapshot) => {
      const postsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsList);
    });

    // Fetch Stats
    const fetchStats = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnap.size;
      const activeUsers = usersSnap.docs.filter(d => d.data().online).length;

      // Messages in last 24h
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const messagesSnap = await getDocs(query(
        collection(db, 'messages'),
        where('timestamp', '>=', yesterday.toISOString())
      ));
      
      setStats({
        totalUsers,
        activeUsers,
        messages24h: messagesSnap.size
      });
    };

    // Fetch Assets
    const fetchAssets = async () => {
      const settingsDoc = await getDoc(doc(db, 'app_settings', 'assets'));
      if (settingsDoc.exists()) {
        setAssets(prev => ({ ...prev, ...settingsDoc.data() }));
      }
    };

    fetchStats();
    fetchAssets();
    return () => unsubscribeUsers();
  }, []);

  const handleSuspendUser = async (uid: string, currentStatus: boolean) => {
    try {
      updateDoc(doc(db, 'users', uid), {
        suspended: !currentStatus
      }).catch(e => console.error("Error suspending user:", e));
    } catch (error) {
      console.error("Error suspending user:", error);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      deleteDoc(doc(db, 'users', uid)).catch(e => console.error("Error deleting user:", e));
      // Note: Deleting from Auth requires Admin SDK, but we'll remove them from Firestore
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handlePasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error("Error sending password reset:", error);
      alert("Failed to send password reset email.");
    }
  };

  const handleQuickBroadcast = async (msg: string) => {
    if (!msg.trim()) return;
    setIsSendingNotif(true);
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'all',
          title: 'Broadcast',
          message: msg,
          priority: 'high'
        })
      });
      alert("Broadcast sent!");
    } catch (e) {}
    setIsSendingNotif(false);
  };

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>, assetKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAsset(assetKey);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed: ${response.status} ${text}`);
      }
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response. This usually means the file is too large.");
      }
      const data = await response.json();
      if (data.url) {
        await setDoc(doc(db, 'app_settings', 'assets'), {
          [assetKey]: data.url
        }, { merge: true });
        setAssets(prev => ({ ...prev, [assetKey]: data.url }));
      }
    } catch (error) {
      console.error("Error uploading asset:", error);
    } finally {
      setUploadingAsset(null);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.uid?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 h-full bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-surface/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">Admin Control</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">System Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold">{currentUser.displayName}</p>
            <p className="text-[10px] text-primary font-black uppercase tracking-tighter">Super Admin</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-primary p-0.5">
            <img src={currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`} alt="Admin" className="w-full h-full rounded-full object-cover" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Tabs */}
        <aside className="w-20 sm:w-64 border-r border-border/50 bg-surface/30 flex flex-col p-4 gap-2">
          <TabButton 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
            icon={<Users size={20} />} 
            label="Users" 
          />
          <TabButton 
            active={activeTab === 'assets'} 
            onClick={() => setActiveTab('assets')} 
            icon={<FileAudio size={20} />} 
            label="Assets" 
          />
          <TabButton 
            active={activeTab === 'stats'} 
            onClick={() => setActiveTab('stats')} 
            icon={<BarChart3 size={20} />} 
            label="Statistics" 
          />
          <TabButton 
            active={activeTab === 'push_test'} 
            onClick={() => setActiveTab('push_test')} 
            icon={<Bell size={20} />} 
            label="Push Center" 
          />
          <TabButton 
            active={activeTab === 'ui'} 
            onClick={() => setActiveTab('ui')} 
            icon={<Palette size={20} />} 
            label="UI Settings" 
          />
          <TabButton 
            active={activeTab === 'groups'} 
            onClick={() => setActiveTab('groups')} 
            icon={<Users size={20} />} 
            label="Groups & Channels" 
          />
          <TabButton 
            active={activeTab === 'posts'} 
            onClick={() => setActiveTab('posts')} 
            icon={<FileAudio size={20} />} 
            label="Posts" 
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-background/50">
          <AnimatePresence mode="wait">
            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-2xl font-black tracking-tight">User Management</h2>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-surface border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-surface border border-border/50 rounded-2xl overflow-hidden card-3d">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/30 border-b border-border/50">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">User</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {filteredUsers.map((u) => (
                          <tr key={u.uid} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} alt="" className="w-10 h-10 rounded-full object-cover border border-border/50" />
                                <div>
                                  <p className="font-extrabold text-sm">{u.displayName}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{u.uid}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm">{u.email || 'No Email'}</p>
                              <p className="text-xs text-muted-foreground">{u.location || 'Unknown Location'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                                u.suspended ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                              )}>
                                {u.suspended ? 'Suspended' : 'Active'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handlePasswordReset(u.email!)}
                                  disabled={!u.email}
                                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                  title="Reset Password"
                                >
                                  <Mail size={18} />
                                </button>
                                <button 
                                  onClick={() => handleSuspendUser(u.uid, !!u.suspended)}
                                  className={cn(
                                    "p-2 rounded-lg transition-all",
                                    u.suspended ? "text-green-500 hover:bg-green-500/10" : "text-orange-500 hover:bg-orange-500/10"
                                  )}
                                  title={u.suspended ? "Unsuspend" : "Suspend"}
                                >
                                  {u.suspended ? <UserCheck size={18} /> : <UserX size={18} />}
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(u.uid)}
                                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                  title="Delete User"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <button 
                                  onClick={() => setSelectedUser(u)}
                                  className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                                  title="View Details"
                                >
                                  <ExternalLink size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'assets' && (
              <motion.div
                key="assets"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-black tracking-tight">Asset Manager</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AssetCard 
                    title="Ringtone" 
                    description="Plays during incoming calls" 
                    url={assets.ringtone} 
                    onUpload={(e) => handleAssetUpload(e, 'ringtone')}
                    isUploading={uploadingAsset === 'ringtone'}
                  />
                  <AssetCard 
                    title="Message Sent" 
                    description="Plays when you send a message" 
                    url={assets.sent} 
                    onUpload={(e) => handleAssetUpload(e, 'sent')}
                    isUploading={uploadingAsset === 'sent'}
                  />
                  <AssetCard 
                    title="Message Received" 
                    description="Plays when a message arrives" 
                    url={assets.received} 
                    onUpload={(e) => handleAssetUpload(e, 'received')}
                    isUploading={uploadingAsset === 'received'}
                  />
                  <AssetCard 
                    title="Typing Sound" 
                    description="Subtle sound during typing" 
                    url={assets.typing} 
                    onUpload={(e) => handleAssetUpload(e, 'typing')}
                    isUploading={uploadingAsset === 'typing'}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-black tracking-tight">App Statistics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <StatsCard title="Total Users" value={stats.totalUsers} icon={<Users className="text-blue-500" />} />
                  <StatsCard title="Active Now" value={stats.activeUsers} icon={<UserCheck className="text-green-500" />} />
                  <StatsCard title="Messages (24h)" value={stats.messages24h} icon={<Mail className="text-primary" />} />
                </div>
                
                <div className="bg-surface border border-border/50 rounded-2xl p-6 card-3d">
                  <h3 className="text-lg font-extrabold mb-4">System Health</h3>
                  <div className="space-y-4">
                    <HealthRow label="Firebase Firestore" status="Operational" />
                    <HealthRow label="Firebase Auth" status="Operational" />
                    <HealthRow label="Cloudinary Storage" status="Operational" />
                    <HealthRow label="ZegoCloud RTC" status="Operational" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'push_test' && (
              <motion.div
                key="push_test"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-tight">Push & Notification Center</h2>
                  <button 
                    onClick={fetchPushData}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="Refresh Data"
                  >
                    <Settings className="animate-spin-slow" size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Form */}
                  <div className="xl:col-span-1 space-y-4">
                    <div className="bg-surface border border-border/50 rounded-2xl p-6 card-3d">
                      <h3 className="text-sm font-black uppercase tracking-widest mb-4">Notification Tester</h3>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Target</label>
                          <select 
                            value={notifForm.target}
                            onChange={(e) => setNotifForm({...notifForm, target: e.target.value})}
                            className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm"
                          >
                            <option value="all">Broadcast (All Users)</option>
                            <option value="single">Single User (UID)</option>
                          </select>
                        </div>

                        {notifForm.target === 'single' && (
                          <div className="animate-in slide-in-from-top duration-200">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Recipient UID</label>
                            <input 
                              type="text"
                              value={notifForm.targetUID}
                              onChange={(e) => setNotifForm({...notifForm, targetUID: e.target.value})}
                              placeholder="Firebase UID..."
                              className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Type / Icon Preset</label>
                          <select 
                            value={notifForm.type}
                            onChange={(e) => setNotifForm({...notifForm, type: e.target.value as any})}
                            className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm"
                          >
                            <option value="broadcast">📢 General Announcement</option>
                            <option value="message">💬 Chat Message</option>
                            <option value="call">📞 Incoming Call</option>
                            <option value="reel">🎬 New Reel</option>
                            <option value="post">🖼️ New Post</option>
                            <option value="alert">⚠️ System Alert</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Title</label>
                          <input 
                            type="text"
                            value={notifForm.title}
                            onChange={(e) => setNotifForm({...notifForm, title: e.target.value})}
                            className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Message</label>
                          <textarea 
                            value={notifForm.message}
                            onChange={(e) => setNotifForm({...notifForm, message: e.target.value})}
                            className="w-full h-24 bg-background border border-border/50 rounded-xl px-3 py-2 text-sm resize-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Image URL (Optional)</label>
                          <input 
                            type="text"
                            value={notifForm.image}
                            onChange={(e) => setNotifForm({...notifForm, image: e.target.value})}
                            placeholder="https://..."
                            className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm"
                          />
                        </div>

                        <div className="pt-2">
                          <button 
                            onClick={handleAdvancedNotifSend}
                            disabled={isSendingNotif}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                          >
                            {isSendingNotif ? <Loader2 className="animate-spin" size={14} /> : <Bell size={14} />}
                            Fire Notification
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Push Data Table */}
                  <div className="xl:col-span-2">
                    <div className="bg-surface border border-border/50 rounded-2xl overflow-hidden card-3d h-[600px] flex flex-col">
                      <div className="p-4 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest">User Push Registrations</h3>
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{pushUsers.length} Users Tracked</span>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-surface z-10">
                            <tr className="bg-muted/50 border-b border-border/50 shadow-sm">
                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">User / IP</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Player IDs</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last Sync</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {pushUsers.map((u) => (
                              <tr key={u.uid} className="hover:bg-muted/10 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full border border-primary/20 p-0.5">
                                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-full h-full rounded-full" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-extra-bold">{u.displayName}</p>
                                      <p className="text-[9px] font-mono text-primary">{u.publicIp}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                    <span className={cn(
                                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase inline-block w-fit",
                                      u.onesignalSynced ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                    )}>
                                      {u.onesignalSynced ? 'Synced' : 'Not Linked'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {u.onesignalIds && u.onesignalIds.length > 0 ? (
                                      u.onesignalIds.map((id: string) => (
                                        <span key={id} className="text-[8px] font-mono bg-muted px-1 rounded truncate max-w-[80px]" title={id}>{id}</span>
                                      ))
                                    ) : (
                                      <span className="text-[8px] text-muted-foreground italic">No IDs</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-[9px] text-muted-foreground">{u.lastActive}</p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'ui' && (
              <motion.div
                key="ui"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-black tracking-tight">Global UI Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Font & Text Control */}
                  <div className="bg-surface border border-border/50 rounded-2xl p-6 card-3d space-y-4">
                    <h3 className="text-lg font-extrabold flex items-center gap-2"><Settings size={20}/> Font & Text Control</h3>
                    
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Font Size</label>
                      <select 
                        value={settings.fontSize} 
                        onChange={(e) => updateSettings({ fontSize: e.target.value })}
                        className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="text-sm">Small</option>
                        <option value="text-base">Medium</option>
                        <option value="text-lg">Large</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Font Weight</label>
                      <select 
                        value={settings.fontWeight} 
                        onChange={(e) => updateSettings({ fontWeight: e.target.value })}
                        className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="font-normal">Normal</option>
                        <option value="font-medium">Medium</option>
                        <option value="font-bold">Bold</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Font Family</label>
                      <select 
                        value={settings.fontFamily} 
                        onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                        className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="font-sans">Sans Serif</option>
                        <option value="font-mono">Monospace</option>
                        <option value="font-serif">Serif</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">User Name Size</label>
                      <select 
                        value={settings.userNameSize} 
                        onChange={(e) => updateSettings({ userNameSize: e.target.value })}
                        className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="text-sm">Small</option>
                        <option value="text-base">Medium</option>
                        <option value="text-lg">Large</option>
                        <option value="text-xl">Extra Large</option>
                      </select>
                    </div>
                  </div>

                  {/* 3D Capsule & Glass-morphism */}
                  <div className="bg-surface border border-border/50 rounded-2xl p-6 card-3d space-y-4">
                    <h3 className="text-lg font-extrabold flex items-center gap-2"><Palette size={20}/> 3D Capsule & Glass-morphism</h3>
                    
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Blur Intensity (Backdrop Filter)</label>
                      <select 
                        value={settings.blurIntensity} 
                        onChange={(e) => updateSettings({ blurIntensity: e.target.value })}
                        className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="backdrop-blur-sm">Small</option>
                        <option value="backdrop-blur-md">Medium</option>
                        <option value="backdrop-blur-lg">Large</option>
                        <option value="backdrop-blur-xl">Extra Large</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Border Radius</label>
                      <select 
                        value={settings.borderRadius} 
                        onChange={(e) => updateSettings({ borderRadius: e.target.value })}
                        className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="rounded-lg">Large</option>
                        <option value="rounded-xl">Extra Large</option>
                        <option value="rounded-2xl">2x Extra Large</option>
                        <option value="rounded-3xl">3x Extra Large</option>
                        <option value="rounded-full">Full</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Profile Size</label>
                      <select 
                        value={settings.profileSize} 
                        onChange={(e) => updateSettings({ profileSize: e.target.value })}
                        className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="w-10 h-10">Small</option>
                        <option value="w-12 h-12">Medium</option>
                        <option value="w-14 h-14">Large</option>
                        <option value="w-16 h-16">Extra Large</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Story Circle Size</label>
                      <select 
                        value={settings.storyCircleSize} 
                        onChange={(e) => updateSettings({ storyCircleSize: e.target.value })}
                        className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="w-12 h-12">Small</option>
                        <option value="w-14 h-14">Medium</option>
                        <option value="w-16 h-16">Large</option>
                        <option value="w-20 h-20">Extra Large</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Badge Size (px): {settings.badgeSize}</label>
                      <input 
                        type="range"
                        min="12"
                        max="64"
                        value={settings.badgeSize}
                        onChange={(e) => updateSettings({ badgeSize: e.target.value })}
                        className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>

                  {/* User Customization (Theme Gallery) */}
                  <div className="bg-surface border border-border/50 rounded-2xl p-6 card-3d space-y-4 md:col-span-2">
                    <h3 className="text-lg font-extrabold flex items-center gap-2"><Palette size={20}/> User Customization (Theme Gallery)</h3>
                    <p className="text-xs text-muted-foreground">Select the default background theme for all users.</p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {[
                        { id: 'theme-default', name: 'Default', class: 'bg-background' },
                        { id: 'theme-gradient-waves', name: 'Gradient Waves', class: 'bg-gradient-to-br from-[#5f2c82] via-[#49a09d] to-[#ff4b8b]' },
                        { id: 'theme-glass', name: 'Glass-morphism', class: 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900' },
                        { id: 'theme-solid-dark', name: 'Solid Dark', class: 'bg-[#121212]' },
                        { id: 'theme-ocean', name: 'Ocean Depth', class: 'bg-gradient-to-b from-[#0f2027] via-[#203a43] to-[#2c5364]' },
                      ].map((theme) => (
                        <div 
                          key={theme.id}
                          onClick={() => updateSettings({ theme: theme.id })}
                          className={cn(
                            "cursor-pointer rounded-xl overflow-hidden border-2 transition-all",
                            settings.theme === theme.id ? "border-primary scale-105 shadow-lg shadow-primary/20" : "border-transparent hover:border-border"
                          )}
                        >
                          <div className={cn("h-24 w-full", theme.class)}></div>
                          <div className="p-2 text-center bg-surface">
                            <span className="text-[10px] font-bold">{theme.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'groups' && (
              <motion.div
                key="groups"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-tight">Groups & Channels Control</h2>
                  <button className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm">
                    Create New
                  </button>
                </div>
                
                <div className="bg-surface border border-border/50 rounded-2xl p-6 card-3d">
                  <p className="text-muted-foreground text-sm mb-4">Manage all groups, channels, and voice clubs across the platform.</p>
                  
                  <div className="space-y-4">
                    <div className="p-4 border border-border/50 rounded-xl flex items-center justify-between hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-xl">
                          G
                        </div>
                        <div>
                          <h3 className="font-bold">Global Chat</h3>
                          <p className="text-xs text-muted-foreground">1.2k Members • Public Group</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold">Delete</button>
                        <button className="px-3 py-1 bg-muted text-foreground rounded-lg text-xs font-bold">Edit</button>
                      </div>
                    </div>
                    
                    <div className="p-4 border border-border/50 rounded-xl flex items-center justify-between hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-black text-xl">
                          V
                        </div>
                        <div>
                          <h3 className="font-bold">Music Voice Club</h3>
                          <p className="text-xs text-muted-foreground">340 Members • Voice Channel</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold">Delete</button>
                        <button className="px-3 py-1 bg-muted text-foreground rounded-lg text-xs font-bold">Edit</button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'posts' && (
              <motion.div
                key="posts"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black tracking-tight">Manage Posts</h2>
                </div>

                <div className="bg-surface border border-border/50 rounded-2xl overflow-hidden card-3d">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/30 border-b border-border/50">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Post</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Author</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Likes</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {posts.map((post) => (
                          <tr key={post.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {post.mediaType === 'video' ? (
                                  <video src={post.mediaUrl} className="w-10 h-10 rounded-lg object-cover border border-border/50" />
                                ) : (
                                  <img src={post.mediaUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-border/50" />
                                )}
                                <div>
                                  <p className="font-extrabold text-sm line-clamp-1">{post.title || post.description || 'Untitled'}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{post.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold">{post.authorName}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold">{(post.likes || []).length}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this post?')) {
                                      await deleteDoc(doc(db, 'books_posts', post.id));
                                    }
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                  title="Delete Post"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
          onUpdate={() => {
            // The snapshot listener handles updates automatically
          }} 
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
        active 
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
          : "text-muted-foreground hover:bg-surface hover:text-foreground"
      )}
    >
      <span className={cn("transition-transform group-hover:scale-110", active ? "scale-110" : "")}>{icon}</span>
      <span className="text-sm font-extrabold hidden sm:block">{label}</span>
    </button>
  );
}

function StatsCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border/50 rounded-2xl p-6 flex items-center gap-4 card-3d">
      <div className="w-12 h-12 bg-muted/30 rounded-xl flex items-center justify-center text-2xl">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
        <p className="text-2xl font-black">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function AssetCard({ title, description, url, onUpload, isUploading }: { title: string; description: string; url: string; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; isUploading: boolean }) {
  return (
    <div className="bg-surface border border-border/50 rounded-2xl p-6 space-y-4 card-3d">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
          <FileAudio size={20} />
        </div>
      </div>
      
      <div className="bg-background rounded-xl p-3 flex items-center justify-between gap-4">
        <audio src={url} controls className="h-8 flex-1" />
      </div>

      <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border/50 rounded-xl text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition-all cursor-pointer">
        {isUploading ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            Uploading...
          </>
        ) : (
          <>
            <Upload size={16} />
            Replace Asset
          </>
        )}
        <input type="file" accept="audio/*" onChange={onUpload} className="hidden" />
      </label>
    </div>
  );
}

function HealthRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2 text-green-500">
        <CheckCircle2 size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
      </div>
    </div>
  );
}
