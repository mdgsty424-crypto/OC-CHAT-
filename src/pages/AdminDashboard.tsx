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
  CheckCircle2
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

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'assets' | 'stats' | 'broadcast'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    messages24h: 0
  });
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [assets, setAssets] = useState({
    ringtone: 'https://res.cloudinary.com/demo/video/upload/v1626343568/sample_audio.mp3',
    sent: 'https://actions.google.com/sounds/v1/multimedia/message_sent.ogg',
    received: 'https://actions.google.com/sounds/v1/multimedia/notification_high_intensity.ogg',
    typing: 'https://actions.google.com/sounds/v1/foley/keyboard_typing_fast.ogg'
  });
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);

  // Security Check
  if (!currentUser || currentUser.email !== 'info@ocsthael.com') {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    // Fetch Users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => doc.data() as User);
      setUsers(usersList);
      setLoading(false);
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
      await updateDoc(doc(db, 'users', uid), {
        suspended: !currentStatus
      });
    } catch (error) {
      console.error("Error suspending user:", error);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
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

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    setIsBroadcasting(true);
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'all', // Backend should handle this
          title: 'Global Broadcast',
          message: broadcastMessage,
          priority: 'high'
        })
      });
      if (response.ok) {
        alert("Broadcast sent successfully!");
        setBroadcastMessage('');
      }
    } catch (error) {
      console.error("Error broadcasting:", error);
    } finally {
      setIsBroadcasting(false);
    }
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
            active={activeTab === 'broadcast'} 
            onClick={() => setActiveTab('broadcast')} 
            icon={<Bell size={20} />} 
            label="Broadcast" 
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

                <div className="bg-surface border border-border/50 rounded-2xl overflow-hidden">
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
                                  <p className="font-bold text-sm">{u.displayName}</p>
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
                                <Link 
                                  to={`/profile/${u.uid}`}
                                  className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                                  title="View Profile"
                                >
                                  <ExternalLink size={18} />
                                </Link>
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
                
                <div className="bg-surface border border-border/50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4">System Health</h3>
                  <div className="space-y-4">
                    <HealthRow label="Firebase Firestore" status="Operational" />
                    <HealthRow label="Firebase Auth" status="Operational" />
                    <HealthRow label="Cloudinary Storage" status="Operational" />
                    <HealthRow label="ZegoCloud RTC" status="Operational" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'broadcast' && (
              <motion.div
                key="broadcast"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-black tracking-tight">Global Broadcast</h2>
                <div className="bg-surface border border-border/50 rounded-2xl p-8 max-w-2xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <Bell size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Send Notification</h3>
                      <p className="text-sm text-muted-foreground">This will be sent to all registered users immediately.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Message Content</label>
                      <textarea 
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        placeholder="Enter your announcement here..."
                        className="w-full h-40 bg-background border border-border/50 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      />
                    </div>
                    <button 
                      onClick={handleBroadcast}
                      disabled={isBroadcasting || !broadcastMessage.trim()}
                      className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isBroadcasting ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Bell size={18} />
                          Send to All Users
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
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
      <span className="text-sm font-bold hidden sm:block">{label}</span>
    </button>
  );
}

function StatsCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border/50 rounded-2xl p-6 flex items-center gap-4">
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
    <div className="bg-surface border border-border/50 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold">{title}</h3>
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
