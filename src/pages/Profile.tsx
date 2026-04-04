import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
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
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import PinLock from '../components/common/PinLock';
import { useSettings } from '../hooks/useSettings';

type SubView = 'main' | 'account' | 'security' | 'notifications' | 'language' | 'help' | 'set-pin';

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, language, toggleTheme, setLanguage, t } = useSettings();
  const [subView, setSubView] = useState<SubView>('main');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for account settings
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editPassword, setEditPassword] = useState('');

  useEffect(() => {
    if (user) {
      setEditName(user.displayName || '');
      setEditBio(user.bio || '');
      setEditEmail(user.email || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

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
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editName,
        bio: editBio
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: data.url
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSecuritySetting = async (key: string) => {
    if (!user) return;
    const currentSettings = user.securitySettings || { appLockEnabled: false, twoStepVerificationEnabled: false, privacyModeEnabled: false };
    
    // If enabling app lock, check if PIN is set
    if (key === 'appLockEnabled' && !currentSettings.appLockEnabled && !currentSettings.pin) {
      setSubView('set-pin');
      return;
    }

    const newSettings = { ...currentSettings, [key]: !currentSettings[key as keyof typeof currentSettings] };
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        securitySettings: newSettings
      });
    } catch (error) {
      console.error("Error updating security settings:", error);
    }
  };

  const togglePreference = async (key: string) => {
    if (!user) return;
    const currentPrefs = user.preferences || { theme: 'light', language: 'en', notificationsEnabled: true };
    
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
      await updateDoc(doc(db, 'users', user.uid), {
        preferences: newPrefs
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
    }
  };

  const handleSetPin = async (pin: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'securitySettings.pin': pin,
        'securitySettings.appLockEnabled': true
      });
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
      active: user?.securitySettings?.appLockEnabled,
      onToggle: () => toggleSecuritySetting('appLockEnabled')
    },
    { 
      icon: Shield, 
      label: t('profile.twoStep'), 
      color: 'text-orange-500', 
      bg: 'bg-orange-500/10', 
      toggle: true, 
      active: user?.securitySettings?.twoStepVerificationEnabled,
      onToggle: () => toggleSecuritySetting('twoStepVerificationEnabled')
    },
    { 
      icon: Camera, 
      label: t('profile.privacyMode'), 
      color: 'text-red-500', 
      bg: 'bg-red-500/10', 
      toggle: true, 
      active: user?.securitySettings?.privacyModeEnabled,
      onToggle: () => toggleSecuritySetting('privacyModeEnabled')
    },
    { 
      icon: Bell, 
      label: t('profile.notifications'), 
      color: 'text-orange-500', 
      bg: 'bg-orange-500/10',
      toggle: true,
      active: user?.preferences?.notificationsEnabled,
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
      icon: Globe, 
      label: t('profile.language'), 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-500/10', 
      value: language === 'bn' ? 'Bangla' : 'English',
      onClick: () => setLanguage(language === 'en' ? 'bn' : 'en')
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
          <button onClick={() => setSubView('main')} className="p-2 hover:bg-surface rounded-xl transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-lg font-black">{t('profile.accountSettings')}</h2>
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
              if (!user) return;
              setIsSaving(true);
              try {
                await updateDoc(doc(db, 'users', user.uid), {
                  email: editEmail,
                  phone: editPhone
                });
                // Password change requires re-auth, so we'll just show a message for now
                if (editPassword) {
                  alert("Password update requires re-authentication. Please use the 'Forgot Password' flow if needed.");
                }
                setSubView('main');
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
          <button onClick={() => setSubView('main')} className="p-2 hover:bg-surface rounded-xl transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-lg font-black">{t('profile.helpSupport')}</h2>
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

  return (
    <main className="flex-1 overflow-y-auto pb-24 bg-background">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handlePhotoUpload} 
        className="hidden" 
        accept="image/*"
      />

      {/* Profile Header */}
      <div className="px-6 py-8 flex flex-col items-center text-center bg-surface border-b border-border relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-primary/5 -z-10"></div>
        
        <div className="relative mb-4">
          <div className="w-28 h-28 rounded-[2.5rem] p-1 border-4 border-primary/20 bg-surface">
            <img
              src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
              alt={user?.displayName}
              className="w-full h-full rounded-[2rem] object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 rounded-[2rem] flex items-center justify-center">
                <Loader2 className="text-white animate-spin" size={24} />
              </div>
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-2xl border-2 border-surface hover:scale-110 transition-transform active:scale-95 disabled:opacity-50"
          >
            <Camera size={18} />
          </button>
        </div>
        
        {isEditing ? (
          <div className="w-full max-w-xs space-y-3">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your Name"
              className="w-full text-center text-xl font-black bg-surface border border-border rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full text-center text-sm bg-surface border border-border rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
            />
            <div className="flex gap-2 justify-center">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-primary text-white rounded-2xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {t('common.save')}
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditName(user?.displayName || '');
                  setEditBio(user?.bio || '');
                }}
                className="px-6 py-2 bg-red-500/10 text-red-500 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-red-500/20 transition-all active:scale-95"
              >
                <X size={16} />
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 justify-center">
              <h2 className="text-2xl font-black text-text tracking-tight">{user?.displayName}</h2>
              {user?.verified && (
                <Shield className="text-secondary fill-secondary" size={20} />
              )}
            </div>
            <p className="text-sm text-muted font-medium mb-2">ID: {user?.uid.slice(0, 8).toUpperCase()}</p>
            {user?.bio && <p className="text-sm text-text/70 max-w-[240px] mb-4">{user.bio}</p>}
            
            <div className="flex gap-3">
              <button 
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-primary text-white rounded-2xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95"
              >
                <Edit3 size={16} />
                {t('profile.editProfile')}
              </button>
              <button className="px-4 py-2 bg-surface text-text rounded-2xl text-sm font-bold border border-border hover:bg-border transition-all active:scale-95">
                {t('common.share')}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="px-6 py-6 grid grid-cols-3 gap-4">
        {[
          { label: 'Friends', value: '248' },
          { label: 'Matches', value: '12' },
          { label: 'Groups', value: '8' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface p-4 rounded-3xl text-center border border-border/50">
            <span className="block text-lg font-black text-primary">{stat.value}</span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div className="px-6 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick || item.onToggle}
            className="w-full flex items-center justify-between p-4 bg-surface rounded-2xl hover:bg-border/30 transition-all active:scale-[0.99] group"
          >
            <div className="flex items-center gap-4">
              <div className={cn("p-2 rounded-xl", item.bg, item.color)}>
                <item.icon size={20} />
              </div>
              <span className="text-sm font-bold text-text group-hover:text-primary transition-colors">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.value && <span className="text-xs font-medium text-muted">{item.value}</span>}
              {item.toggle ? (
                <div className={cn(
                  "w-10 h-6 rounded-full relative p-1 transition-colors",
                  item.active ? "bg-primary" : "bg-border"
                )}>
                  <div className={cn(
                    "w-4 h-4 bg-background rounded-full transition-transform",
                    item.active ? "translate-x-4" : "translate-x-0"
                  )}></div>
                </div>
              ) : (
                <ChevronRight size={18} className="text-border group-hover:text-primary transition-colors" />
              )}
            </div>
          </button>
        ))}

        <button
          onClick={logout}
          className="w-full flex items-center gap-4 p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all active:scale-[0.99] mt-6"
        >
          <div className="p-2 bg-surface rounded-xl">
            <LogOut size={20} />
          </div>
          <span className="text-sm font-bold">{t('common.logout')}</span>
        </button>
      </div>

      <div className="py-10 text-center opacity-30">
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">OC Chat v1.0.0</span>
      </div>
    </main>
  );
}
