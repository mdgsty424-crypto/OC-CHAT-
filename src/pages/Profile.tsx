import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Volume2,
  VolumeX,
  Settings, 
  Shield, 
  Bell, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  Edit3, 
  Camera,
  Moon,
  Globe,
  Heart,
  Check,
  X,
  Loader2,
  Download,
  Key,
  Mail,
  Phone,
  Lock,
  ChevronLeft,
  MessageCircle,
  AlertCircle,
  UserPlus,
  MoreHorizontal,
  Video,
  Play as PlayIcon,
  Fingerprint,
  CreditCard,
  MapPin,
  User as UserIcon,
  Clock,
  Droplets,
  QrCode,
  CheckCircle2,
  Users,
  Palette
} from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, updateDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import PinLock from '../components/common/PinLock';
import { useSettings } from '../hooks/useSettings';
import { motion, AnimatePresence } from 'motion/react';
import { Story, User } from '../types';
import StoryPlayer from '../components/stories/StoryPlayer';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

type SubView = 'main' | 'account' | 'security' | 'notifications' | 'language' | 'help' | 'set-pin' | 'settings';

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const isOwnProfile = !id || id === currentUser?.uid;
  
  const { theme, language, isMuted, toggleTheme, setLanguage, toggleMute, t } = useSettings();
  const { settings: globalSettings } = useGlobalSettings();
  const [subView, setSubView] = useState<SubView>('main');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  
  // Basic Profile States
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  
  // Identity States
  const [identity, setIdentity] = useState({
    nameBangla: '',
    nameEnglish: '',
    fatherName: '',
    motherName: '',
    address: '',
    ocId: '',
    signatureURL: '',
    bloodGroup: '',
    nidNo: '',
    barcode: '',
    sex: '',
    birthYear: new Date().getFullYear() - 20
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Form states for account settings
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');

  useEffect(() => {
    if (isOwnProfile) {
      setProfileUser(currentUser);
      if (currentUser) {
        setEditName(currentUser.displayName || '');
        setEditBio(currentUser.bio || '');
        setEditEmail(currentUser.email || '');
        setEditPhone(currentUser.phone || '');
        setIdentity(prev => ({
          ...prev,
          sex: currentUser.sex || '',
          birthYear: currentUser.birthYear || new Date().getFullYear() - 20
        }));
      }
    } else if (id) {
      const unsub = onSnapshot(doc(db, 'users', id), (doc) => {
        if (doc.exists()) {
          setProfileUser({ uid: doc.id, ...doc.data() } as User);
        }
      });
      return () => unsub();
    }
  }, [id, currentUser, isOwnProfile]);

  useEffect(() => {
    const targetUid = isOwnProfile ? currentUser?.uid : id;
    if (targetUid && (isOwnProfile || currentUser?.role === 'admin')) {
      const unsub = onSnapshot(doc(db, 'users', targetUid, 'private', 'identity'), (doc) => {
        if (doc.exists()) {
          setIdentity(prev => ({ ...prev, ...doc.data() }));
        }
      });
      return () => unsub();
    }
  }, [isOwnProfile, currentUser?.uid, id, currentUser?.role]);

  useEffect(() => {
    const targetUid = isOwnProfile ? currentUser?.uid : id;
    if (!targetUid) return;

    const q = query(collection(db, 'stories'), where('userId', '==', targetUid));
    const unsub = onSnapshot(q, (snapshot) => {
      const storyList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
      setStories(storyList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });

    return () => unsub();
  }, [id, currentUser?.uid, isOwnProfile]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: editName,
        bio: editBio
      }).catch(e => console.error("Error updating profile:", e));
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover' | 'signature' = 'avatar') => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
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
      
      if (type === 'signature') {
        setIdentity(prev => ({ ...prev, signatureURL: data.url }));
      } else {
        const updateData = type === 'avatar' ? { photoURL: data.url } : { coverURL: data.url };
        updateDoc(doc(db, 'users', currentUser.uid), updateData).catch(e => console.error("Error updating photo:", e));
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveIdentity = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      // 1. Update private identity subcollection
      setDoc(doc(db, 'users', currentUser.uid, 'private', 'identity'), identity).catch(e => console.error("Error updating identity:", e));

      // 2. Update public user document with public fields
      updateDoc(doc(db, 'users', currentUser.uid), {
        sex: identity.sex,
        birthYear: identity.birthYear
      }).catch(e => console.error("Error updating public identity:", e));

      setIsEditingIdentity(false);
    } catch (error) {
      console.error("Error saving identity:", error);
      alert("Failed to save identity data");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploadingStory(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
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
      
      await addDoc(collection(db, 'stories'), {
        userId: currentUser.uid,
        videoUrl: data.url,
        caption: `My new Reel!`,
        likes: [],
        views: 0,
        timestamp: new Date().toISOString(),
        comments: []
      });
    } catch (error) {
      console.error("Error uploading story:", error);
      alert("Failed to upload story");
    } finally {
      setIsUploadingStory(false);
    }
  };

  const toggleSecuritySetting = async (key: string) => {
    if (!currentUser) return;
    const currentSettings = currentUser.securitySettings || { appLockEnabled: false, twoStepVerificationEnabled: false, privacyModeEnabled: false };
    
    // If enabling app lock, check if PIN is set
    if (key === 'appLockEnabled' && !currentSettings.appLockEnabled && !currentSettings.pin) {
      setSubView('set-pin');
      return;
    }

    const newSettings = { ...currentSettings, [key]: !currentSettings[key as keyof typeof currentSettings] };
    
    try {
      updateDoc(doc(db, 'users', currentUser.uid), {
        securitySettings: newSettings
      }).catch(e => console.error("Error updating security settings:", e));
    } catch (error) {
      console.error("Error updating security settings:", error);
    }
  };

  const togglePreference = async (key: string) => {
    if (!currentUser) return;
    const currentPrefs = currentUser.preferences || { theme: 'light', language: 'en', notificationsEnabled: true };
    
    let newValue: any;
    if (key === 'theme') {
      newValue = currentPrefs.theme === 'dark' ? 'light' : 'dark';
    } else if (key === 'language') {
      newValue = currentPrefs.language === 'en' ? 'bn' : 'en';
    } else {
      newValue = !currentPrefs[key as keyof typeof currentPrefs];
    }

    const newPrefs = { ...currentPrefs, [key]: newValue };
    
    try {
      updateDoc(doc(db, 'users', currentUser.uid), {
        preferences: newPrefs
      }).catch(e => console.error("Error updating preferences:", e));
    } catch (error) {
      console.error("Error updating preferences:", error);
    }
  };

  const handleSetPin = async (pin: string) => {
    if (!currentUser) return;
    try {
      updateDoc(doc(db, 'users', currentUser.uid), {
        'securitySettings.pin': pin,
        'securitySettings.appLockEnabled': true
      }).catch(e => console.error("Error setting PIN:", e));
      setSubView('main');
    } catch (error) {
      console.error("Error setting PIN:", error);
    }
  };

  const menuItems = [
    { 
      icon: Settings, 
      label: t('profile.accountSettings'), 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      onClick: () => setSubView('account')
    },
    { 
      icon: Shield, 
      label: t('profile.appLock'), 
      color: 'text-green-500', 
      bg: 'bg-green-500/10', 
      toggle: true, 
      active: currentUser?.securitySettings?.appLockEnabled,
      onToggle: () => toggleSecuritySetting('appLockEnabled')
    },
    { 
      icon: Shield, 
      label: t('profile.twoStep'), 
      color: 'text-orange-500', 
      bg: 'bg-orange-500/10', 
      toggle: true, 
      active: currentUser?.securitySettings?.twoStepVerificationEnabled,
      onToggle: () => toggleSecuritySetting('twoStepVerificationEnabled')
    },
    { 
      icon: Camera, 
      label: t('profile.privacyMode'), 
      color: 'text-red-500', 
      bg: 'bg-red-500/10', 
      toggle: true, 
      active: currentUser?.securitySettings?.privacyModeEnabled,
      onToggle: () => toggleSecuritySetting('privacyModeEnabled')
    },
    { 
      icon: Bell, 
      label: t('profile.notifications'), 
      color: 'text-orange-500', 
      bg: 'bg-orange-500/10',
      toggle: true,
      active: currentUser?.preferences?.notificationsEnabled,
      onToggle: () => togglePreference('notificationsEnabled')
    },
    { 
      icon: Moon, 
      label: t('profile.darkMode'), 
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10', 
      toggle: true,
      active: theme === 'dark',
      onToggle: toggleTheme
    },
    { 
      icon: isMuted ? VolumeX : Volume2, 
      label: 'Mute Sounds', 
      color: 'text-pink-500', 
      bg: 'bg-pink-500/10', 
      toggle: true,
      active: isMuted,
      onToggle: toggleMute
    },
    { 
      icon: Globe, 
      label: t('profile.language'), 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-500/10', 
      value: language === 'bn' ? 'Bangla' : 'English',
      onClick: () => setLanguage(language === 'en' ? 'bn' : 'en')
    },
    { 
      icon: Palette, 
      label: 'Chat Background', 
      color: 'text-pink-500', 
      bg: 'bg-pink-500/10',
      onClick: () => setSubView('chat-background')
    },
    { 
      icon: HelpCircle, 
      label: t('profile.helpSupport'), 
      color: 'text-gray-500', 
      bg: 'bg-muted/10',
      onClick: () => setSubView('help')
    },
  ];

  if (deferredPrompt) {
    menuItems.unshift({
      icon: Download,
      label: 'Install OC-CHAT',
      color: 'text-primary',
      bg: 'bg-primary/10',
      onToggle: handleInstallClick
    } as any);
  }

  if (subView === 'set-pin') {
    return <PinLock isSetting onSetPin={handleSetPin} onCancel={() => setSubView('main')} onUnlock={() => {}} />;
  }

  if (subView === 'account') {
    return (
      <main className="flex-1 overflow-y-auto pb-24 bg-background">
        <div className="p-4 flex items-center gap-4 border-b border-border bg-background sticky top-0 z-10">
          <button onClick={() => setSubView('settings')} className="p-2 hover:bg-surface rounded-xl transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-lg font-extrabold">{t('profile.accountSettings')}</h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">{t('profile.email')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-surface border border-border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">{t('profile.phone')}</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-surface border border-border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">{t('profile.password')}</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full bg-surface border border-border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          <button
            onClick={async () => {
              if (!currentUser) return;
              setIsSaving(true);
              try {
                updateDoc(doc(db, 'users', currentUser.uid), {
                  email: editEmail,
                  phone: editPhone
                }).catch(e => console.error("Error updating account:", e));
                // Password change requires re-auth, so we'll just show a message for now
                if (editPassword) {
                  alert("Password update requires re-authentication. Please use the 'Forgot Password' flow if needed.");
                }
                setSubView('settings');
              } catch (error) {
                console.error("Error updating account:", error);
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
            {t('profile.saveChanges')}
          </button>
        </div>
      </main>
    );
  }

  if (subView === 'help') {
    return (
      <main className="flex-1 overflow-y-auto pb-24 bg-background">
        <div className="p-4 flex items-center gap-4 border-b border-border bg-background sticky top-0 z-10">
          <button onClick={() => setSubView('settings')} className="p-2 hover:bg-surface rounded-xl transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-lg font-extrabold">{t('profile.helpSupport')}</h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-muted">{t('profile.faq')}</h3>
            {[
              { q: t('profile.faq_q1') || 'How do I enable App Lock?', a: t('profile.faq_a1') || 'Go to Profile > App Lock and set a 4-digit PIN.' },
              { q: t('profile.faq_q2') || 'What is Privacy Mode?', a: t('profile.faq_a2') || 'It prevents screenshots and screen recordings of your chats.' },
              { q: t('profile.faq_q3') || 'How do I change my language?', a: t('profile.faq_a3') || 'Tap the Language option in settings to toggle between English and Bangla.' },
            ].map((faq, i) => (
              <div key={i} className="bg-surface p-4 rounded-2xl border border-border/50">
                <h4 className="text-sm font-bold text-text mb-1">{faq.q}</h4>
                <p className="text-xs text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-muted">{t('profile.contactUs')}</h3>
            <button className="w-full flex items-center gap-4 p-4 bg-surface rounded-2xl border border-border/50 hover:bg-border/20 transition-colors">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                <MessageCircle size={20} />
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold text-text">{t('profile.liveChat')}</span>
                <span className="text-[10px] text-muted font-medium">Available 24/7</span>
              </div>
            </button>
            <button className="w-full flex items-center gap-4 p-4 bg-surface rounded-2xl border border-border/50 hover:bg-border/20 transition-colors">
              <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                <AlertCircle size={20} />
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold text-text">{t('profile.reportProblem')}</span>
                <span className="text-[10px] text-muted font-medium">Help us improve</span>
              </div>
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (subView === 'chat-background') {
    return (
      <main className="flex-1 overflow-y-auto pb-24 bg-background">
        <div className="p-4 flex items-center gap-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <button onClick={() => setSubView('settings')} className="p-2 hover:bg-border rounded-full transition-colors">
            <ChevronLeft size={24} className="text-text" />
          </button>
          <h2 className="text-lg font-extrabold text-text">Chat Background</h2>
        </div>

        <div className="p-4 space-y-6">
          <div className="bg-surface rounded-2xl p-6 border border-border/50">
            <h3 className="text-sm font-bold text-text mb-4">Select Theme</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'theme-default', name: 'Default', class: 'bg-background' },
                { id: 'theme-gradient-waves', name: 'Gradient Waves', class: 'bg-gradient-to-br from-[#5f2c82] via-[#49a09d] to-[#ff4b8b]' },
                { id: 'theme-glass', name: 'Glass-morphism', class: 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900' },
                { id: 'theme-solid-dark', name: 'Solid Dark', class: 'bg-[#121212]' },
                { id: 'theme-ocean', name: 'Ocean Depth', class: 'bg-gradient-to-b from-[#0f2027] via-[#203a43] to-[#2c5364]' },
              ].map((themeOption) => (
                <div 
                  key={themeOption.id}
                  onClick={() => {
                    if (currentUser) {
                      updateDoc(doc(db, 'users', currentUser.uid), {
                        'preferences.chatTheme': themeOption.id
                      });
                    }
                  }}
                  className={cn(
                    "cursor-pointer rounded-xl overflow-hidden border-2 transition-all",
                    currentUser?.preferences?.chatTheme === themeOption.id ? "border-primary scale-105 shadow-lg shadow-primary/20" : "border-transparent hover:border-border"
                  )}
                >
                  <div className={cn("h-32 w-full", themeOption.class)}></div>
                  <div className="p-3 text-center bg-surface">
                    <span className="text-xs font-bold text-text">{themeOption.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (subView === 'settings') {
    return (
      <main className="flex-1 overflow-y-auto pb-24 bg-[#F0F2F5]">
        <div className="p-4 flex items-center gap-4 border-b border-border bg-white sticky top-0 z-10 shadow-sm">
          <button onClick={() => setSubView('main')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-lg font-extrabold">Settings & Privacy</h2>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden card-3d">
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                onClick={item.onClick || item.onToggle}
                className={cn(
                  "w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all active:scale-[0.99] group",
                  index !== menuItems.length - 1 && "border-b border-gray-100"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-2 rounded-full", item.bg, item.color)}>
                    <item.icon size={20} />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.value && <span className="text-xs font-medium text-gray-500">{item.value}</span>}
                  {item.toggle ? (
                    <div className={cn(
                      "w-10 h-6 rounded-full relative p-1 transition-colors",
                      item.active ? "bg-blue-600" : "bg-gray-300"
                    )}>
                      <div className={cn(
                        "w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                        item.active ? "translate-x-4" : "translate-x-0"
                      )}></div>
                    </div>
                  ) : (
                    <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-4 p-4 bg-white text-red-600 rounded-xl shadow-sm hover:bg-red-50 transition-all active:scale-[0.99]"
          >
            <div className="p-2 bg-red-100 rounded-full">
              <LogOut size={20} />
            </div>
            <span className="text-sm font-bold">{t('common.logout')}</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto pb-24 bg-[#F0F2F5]">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => handlePhotoUpload(e, 'avatar')} 
        className="hidden" 
        accept="image/*"
      />
      <input 
        type="file" 
        ref={coverInputRef} 
        onChange={(e) => handlePhotoUpload(e, 'cover')} 
        className="hidden" 
        accept="image/*"
      />

      <input 
        type="file" 
        ref={storyInputRef} 
        onChange={handleStoryUpload} 
        className="hidden" 
        accept="video/*"
      />

      <input 
        type="file" 
        ref={signatureInputRef} 
        onChange={(e) => handlePhotoUpload(e, 'signature')} 
        className="hidden" 
        accept="image/*"
      />

      {/* Facebook Style Header */}
      <div className="bg-white shadow-sm">
        {/* Cover Photo */}
        <div className="relative h-48 md:h-64 bg-gray-300 overflow-hidden group">
          <img
            src={profileUser?.coverURL || "https://picsum.photos/seed/cover/1200/400"}
            alt="Cover"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-4 right-4 p-2 bg-white/80 backdrop-blur-sm text-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-xs font-bold"
          >
            <Camera size={16} />
            Edit Cover
          </button>
          
          {/* Settings Gear Icon */}
          <button 
            onClick={() => setSubView('settings')}
            className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/40 transition-colors z-20"
          >
            <Settings size={24} />
          </button>
        </div>

        {/* Profile Info Section */}
        <div className="px-4 pb-4 relative">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-16 mb-4">
            {/* Profile Picture */}
            <div className="relative inline-block">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-white shadow-xl overflow-hidden">
                <img
                  src={profileUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser?.uid}`}
                  alt={profileUser?.displayName}
                  className="w-full h-full rounded-full object-cover border-4 border-white"
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <Loader2 className="text-white animate-spin" size={24} />
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-2 right-2 p-2 bg-gray-200 text-gray-800 rounded-full border-2 border-white hover:bg-gray-300 transition-colors shadow-md"
                >
                  <Camera size={20} />
                </button>
              )}
            </div>

            {/* Name & Bio */}
            <div className="flex-1 pt-2">
              <div className="flex items-center gap-2">
                <h2 className={cn("text-2xl md:text-3xl font-extrabold text-gray-900", globalSettings.fontFamily, globalSettings.fontWeight)}>{profileUser?.displayName}</h2>
                {profileUser?.verified && (
                  <CheckCircle2 className="text-blue-500 fill-blue-500" size={20} />
                )}
              </div>
              {profileUser?.bio ? (
                <p className={cn("text-gray-600 font-semibold mt-1", globalSettings.fontFamily)}>{profileUser.bio}</p>
              ) : isOwnProfile && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className={cn("text-blue-600 font-bold text-sm hover:underline mt-1", globalSettings.fontFamily)}
                >
                  Add Bio
                </button>
              )}
              {/* Public Identity Info */}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 font-medium">
                {profileUser?.sex && (
                  <span className="flex items-center gap-1">
                    <Fingerprint size={12} /> {profileUser.sex}
                  </span>
                )}
                {profileUser?.birthYear && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> Born {profileUser.birthYear}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {isOwnProfile ? (
              <>
                <button 
                  onClick={() => storyInputRef.current?.click()}
                  disabled={isUploadingStory}
                  className="flex-1 md:flex-none px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isUploadingStory ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                  Add to Story
                </button>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex-1 md:flex-none px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors"
                >
                  <Edit3 size={18} />
                  Edit Profile
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => navigate(`/chat/${profileUser?.uid}`)}
                  className="flex-1 md:flex-none px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                >
                  <MessageCircle size={18} />
                  Message
                </button>
                <button className="flex-1 md:flex-none px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors">
                  <UserPlus size={18} />
                  Add Friend
                </button>
              </>
            )}
            <button className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 card-3d">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
              <UserIcon size={18} className="text-gray-500" />
              About
            </h3>
            {(isOwnProfile || currentUser?.role === 'admin') && (
              <button 
                onClick={() => setIsEditingIdentity(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>
          
          <div className="space-y-1">
            {/* Public Info */}
            <InfoItem icon={<UserIcon size={16} />} label="Name (Bangla)" value={identity.nameBangla} />
            <InfoItem icon={<UserIcon size={16} />} label="Name (English)" value={identity.nameEnglish} />
            <InfoItem icon={<UserIcon size={16} />} label="Sex" value={identity.sex} />
            <InfoItem icon={<Clock size={16} />} label="Birth Year" value={identity.birthYear?.toString()} />

            {/* Private Info (Owner or Admin only) */}
            {(isOwnProfile || currentUser?.role === 'admin') && (
              <>
                <InfoItem icon={<Users size={16} />} label="Father's Name" value={identity.fatherName} />
                <InfoItem icon={<Users size={16} />} label="Mother's Name" value={identity.motherName} />
                <InfoItem icon={<MapPin size={16} />} label="Address" value={identity.address} />
                <InfoItem icon={<Fingerprint size={16} />} label="OC ID" value={identity.ocId} valueClass="text-blue-600 font-medium" />
                <InfoItem icon={<CreditCard size={16} />} label="NID No" value={identity.nidNo} />
                <InfoItem icon={<Droplets size={16} />} label="Blood Group" value={identity.bloodGroup} valueClass="text-red-600 font-medium" />
                
                {identity.signatureURL && (
                  <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 flex-shrink-0">
                      <Edit3 size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Signature</p>
                      <div className="h-10 mt-1">
                        <img src={identity.signatureURL} className="h-full object-contain" alt="Signature" />
                      </div>
                    </div>
                  </div>
                )}
                
                {identity.barcode && (
                  <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 flex-shrink-0">
                      <QrCode size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Barcode</p>
                      <p className="text-sm font-mono text-gray-900">{identity.barcode}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 space-y-4 card-3d">
          <h3 className="text-lg font-extrabold text-gray-900">Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Friends', value: '248', icon: UserPlus },
              { label: 'Matches', value: '12', icon: Heart },
              { label: 'Groups', value: '8', icon: MessageCircle },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="p-2 bg-gray-100 rounded-full text-gray-600">
                  <stat.icon size={20} />
                </div>
                <div>
                  <span className="block text-sm font-bold text-gray-900">{stat.value} {stat.label}</span>
                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">View All</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reels Section */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-4 card-3d">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-gray-900">Reels</h3>
            <button 
              onClick={() => storyInputRef.current?.click()}
              className="text-blue-600 text-sm font-bold hover:underline"
            >
              Create
            </button>
          </div>
          
          {stories.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {stories.map((story, index) => (
                <button 
                  key={story.id}
                  onClick={() => setSelectedStoryIndex(index)}
                  className="relative aspect-[9/16] bg-gray-200 rounded-lg overflow-hidden group"
                >
                  <video 
                    src={story.videoUrl} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <PlayIcon size={24} className="text-white opacity-80" fill="white" />
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold">
                    <PlayIcon size={10} fill="white" />
                    {story.views}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100 rounded-xl">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
                <Video size={24} />
              </div>
              <p className="text-sm font-bold text-gray-900">No Reels Yet</p>
              <p className="text-xs text-gray-500">Share your first short video</p>
            </div>
          )}
        </div>
      </div>

      {/* Story Player Modal */}
      {selectedStoryIndex !== null && (
        <StoryPlayer 
          stories={stories} 
          initialIndex={selectedStoryIndex} 
          onClose={() => setSelectedStoryIndex(null)} 
        />
      )}

      {/* Identity Edit Modal */}
      <AnimatePresence>
        {isEditingIdentity && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <h3 className="text-lg font-extrabold">Identity Verification</h3>
                <button onClick={() => setIsEditingIdentity(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Name (Bangla)</label>
                    <input
                      type="text"
                      value={identity.nameBangla}
                      onChange={(e) => setIdentity(prev => ({ ...prev, nameBangla: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Name (English)</label>
                    <input
                      type="text"
                      value={identity.nameEnglish}
                      onChange={(e) => setIdentity(prev => ({ ...prev, nameEnglish: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Father's Name</label>
                    <input
                      type="text"
                      value={identity.fatherName}
                      onChange={(e) => setIdentity(prev => ({ ...prev, fatherName: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Mother's Name</label>
                    <input
                      type="text"
                      value={identity.motherName}
                      onChange={(e) => setIdentity(prev => ({ ...prev, motherName: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                  </div>
                  <div className="col-span-full space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Address</label>
                    <textarea
                      value={identity.address}
                      onChange={(e) => setIdentity(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm h-20 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">OC ID</label>
                    <input
                      type="text"
                      value={identity.ocId}
                      onChange={(e) => setIdentity(prev => ({ ...prev, ocId: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">NID No</label>
                    <input
                      type="text"
                      value={identity.nidNo}
                      onChange={(e) => setIdentity(prev => ({ ...prev, nidNo: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Blood Group</label>
                    <select
                      value={identity.bloodGroup}
                      onChange={(e) => setIdentity(prev => ({ ...prev, bloodGroup: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    >
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Sex</label>
                    <select
                      value={identity.sex}
                      onChange={(e) => setIdentity(prev => ({ ...prev, sex: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Birth Year</label>
                    <input
                      type="number"
                      value={identity.birthYear}
                      onChange={(e) => setIdentity(prev => ({ ...prev, birthYear: parseInt(e.target.value) }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Barcode/Verification Code</label>
                    <input
                      type="text"
                      value={identity.barcode}
                      onChange={(e) => setIdentity(prev => ({ ...prev, barcode: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Signature Image</label>
                    <button 
                      onClick={() => signatureInputRef.current?.click()}
                      className="w-full py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold border border-dashed border-gray-300 hover:bg-gray-200 transition-colors"
                    >
                      {identity.signatureURL ? 'Change Signature' : 'Upload Signature'}
                    </button>
                    {identity.signatureURL && (
                      <div className="h-10 bg-white rounded border border-gray-100 flex items-center justify-center">
                        <img src={identity.signatureURL} className="h-full object-contain" alt="Signature Preview" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={handleSaveIdentity}
                  disabled={isSaving}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                  Save Identity Data
                </button>
                <p className="text-[10px] text-center text-gray-400 mt-4">
                  All fields must be filled to receive the Blue Verified Badge.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="py-10 text-center opacity-30">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">OC Chat v1.0.0</span>
      </div>
    </main>
  );
}

function InfoItem({ icon, label, value, valueClass = "text-gray-900" }: { icon: React.ReactNode, label: string, value?: string, valueClass?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-medium ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}
