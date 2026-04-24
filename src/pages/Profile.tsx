import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Helmet } from 'react-helmet-async';
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
  Palette,
  ShoppingCart,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, updateDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, getDoc, setDoc, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import PinLock from '../components/common/PinLock';
import { useSettings } from '../hooks/useSettings';
import { motion, AnimatePresence } from 'motion/react';
import { Story, User } from '../types';
import { AvatarGallery } from '../components/common/AvatarGallery';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import StoryPlayer from '../components/stories/StoryPlayer';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

type SubView = 'main' | 'account' | 'security' | 'notifications' | 'language' | 'help' | 'set-pin' | 'settings';

export type AboutEntry = {
  id: string;
  type: 'work' | 'school' | 'college' | 'university';
  institution: string;
  role: string;
  startDate: string;
  endDate: string;
  location: string;
};

function MenuButton({ icon, label, subLabel, onClick, isDestructive }: { icon: React.ReactNode, label: string, subLabel?: string, onClick: () => void, isDestructive?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left",
        isDestructive ? "text-red-600" : "text-gray-900"
      )}
    >
      <div className={cn("p-2 rounded-full", isDestructive ? "bg-red-50" : "bg-gray-100")}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-bold text-lg">{label}</div>
        {subLabel && <div className="text-sm text-gray-500">{subLabel}</div>}
      </div>
      <ChevronRight size={20} className="text-gray-400" />
    </button>
  );
}

import NotFound from './NotFound';

export default function Profile() {
  const { id, username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileUid, setProfileUid] = useState<string | null>(null);
  const isOwnProfile = (!id && !username) || id === currentUser?.uid;

  useEffect(() => {
    if (username) {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setProfileUid(snapshot.docs[0].id);
        } else {
          setProfileUid('not-found');
        }
      });
      return () => unsub();
    } else {
      setProfileUid(id || (isOwnProfile ? currentUser?.uid : null));
    }
  }, [username, id, isOwnProfile, currentUser?.uid]);

  const { theme, language, isMuted, toggleTheme, setLanguage, toggleMute, t } = useSettings();
  const { settings: globalSettings } = useGlobalSettings();
  const [subView, setSubView] = useState<SubView>('main');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [isBecomeSellerOpen, setIsBecomeSellerOpen] = useState(false);
  const [sellerForm, setSellerForm] = useState({ shopName: '', phone: '', address: '' });
  
  // Basic Profile States
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editUsername, setEditUsername] = useState('');
  
  // New States for Profile Screen
  const [activeTab, setActiveTab] = useState<'about' | 'story' | 'books'>('about');
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutInfo, setAboutInfo] = useState({
    status: '',
    website: '',
    entries: [] as AboutEntry[]
  });
  const [showAllAbout, setShowAllAbout] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AboutEntry | null>(null);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [showBottomMenu, setShowBottomMenu] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);

  const [friendRequestStatus, setFriendRequestStatus] = useState<'none' | 'requested' | 'friends'>('none');
  const [books, setBooks] = useState<any[]>([]);
  const [isUploadingBook, setIsUploadingBook] = useState(false);
  const [bookForm, setBookForm] = useState({ title: '', description: '', mentions: '', file: null as File | null });
  const [toast, setToast] = useState<string | null>(null);
  const bookInputRef = useRef<HTMLInputElement>(null);

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
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);
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
    if (!profileUid || profileUid === 'not-found') return;

    if (isOwnProfile && currentUser && profileUid === currentUser.uid) {
      setEditName(currentUser.displayName || '');
      setEditBio(currentUser.bio || '');
      setEditUsername(currentUser.username || '');
      setEditEmail(currentUser.email || '');
      setEditPhone(currentUser.phone || '');
      setIdentity(prev => ({
        ...prev,
        sex: currentUser.sex || '',
        birthYear: currentUser.birthYear || new Date().getFullYear() - 20
      }));

      const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setProfileUser({ uid: doc.id, ...data } as User);
          if (data.aboutInfo) setAboutInfo(data.aboutInfo);
        }
      });
      return () => unsub();
    } else {
      const unsub = onSnapshot(doc(db, 'users', profileUid), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setProfileUser({ uid: doc.id, ...data } as User);
          if (data.aboutInfo) setAboutInfo(data.aboutInfo);
        }
      });
      
      // Check friend request status
      if (currentUser) {
        const reqUnsub = onSnapshot(doc(db, 'users', profileUid, 'friendRequests', currentUser.uid), (doc) => {
          if (doc.exists()) {
            setFriendRequestStatus('requested');
          } else {
            setFriendRequestStatus('none');
          }
        });
        return () => {
          unsub();
          reqUnsub();
        };
      }
      return () => unsub();
    }
  }, [profileUid, currentUser, isOwnProfile]);

  useEffect(() => {
    if (!profileUid || profileUid === 'not-found') return;
    const targetUid = profileUid;
    if (targetUid && (isOwnProfile || currentUser?.role === 'admin')) {
      const unsub = onSnapshot(doc(db, 'users', targetUid, 'private', 'identity'), (doc) => {
        if (doc.exists()) {
          setIdentity(prev => ({ ...prev, ...doc.data() }));
        }
      });
      return () => unsub();
    }
  }, [isOwnProfile, currentUser?.uid, profileUid, currentUser?.role]);

  useEffect(() => {
    if (!profileUid || profileUid === 'not-found') return;
    const targetUid = profileUid;
    if (!targetUid) return;

    const q = query(collection(db, 'stories'), where('authorId', '==', targetUid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setStories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story)));
    });

    return () => unsub();
  }, [profileUid, isOwnProfile]);

  useEffect(() => {
    if (!profileUid || profileUid === 'not-found') return;
    const targetUid = profileUid;
    if (!targetUid) return;

    const q = query(collection(db, 'books_posts'), where('authorId', '==', targetUid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [profileUid, isOwnProfile]);

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

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
      if (editUsername && editUsername !== currentUser.username) {
        // Simple check: format
        if (!/^[a-z0-9_]{3,20}$/.test(editUsername)) {
          alert("Username must be 3-20 characters long and contain only letters, numbers, and underscores.");
          setIsSaving(false);
          return;
        }

        const q = query(collection(db, 'users'), where('username', '==', editUsername));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          alert("Username is already taken. Please choose another one.");
          setIsSaving(false);
          return;
        }
      }

      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: editName,
        bio: editBio,
        username: editUsername
      });
      setIsEditing(false);
      setToast('Profile updated successfully!');
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
    // 1. Blob Conversion for WebView reliability
    const fileBlob = new Blob([file], { type: file.type });
    formData.append('file', fileBlob, file.name || `upload_${Date.now()}`);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

    try {
      console.log(`Starting ${type} direct Cloudinary upload...`);
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dxiolmmdv';
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const status = response.status;
        console.error(`Cloudinary upload error status: ${status}`);
        let errorMsg = `Upload failed: ${status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error?.message || errorMsg;
        } catch (e) {
          const text = await response.text().catch(() => '');
          console.error('Cloudinary upload error text:', text);
        }
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      console.log(`${type} upload success:`, data.secure_url);
      
      if (type === 'signature') {
        setIdentity(prev => ({ ...prev, signatureURL: data.secure_url }));
      } else {
        const updateData = type === 'avatar' ? { photoURL: data.secure_url } : { coverURL: data.secure_url };
        await updateDoc(doc(db, 'users', currentUser.uid), updateData);
      }
      setToast(`${type === 'avatar' ? 'Profile picture' : type === 'cover' ? 'Cover photo' : 'Signature'} updated!`);
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      alert(`Failed to upload ${type}: ${error.message || 'Unknown error'}`);
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

  const handleSaveAboutInfo = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        aboutInfo
      });
      setIsEditingAbout(false);
    } catch (error) {
      console.error("Error saving about info:", error);
      alert("Failed to save about info");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEntry = () => {
    if (!editingEntry) return;
    
    setAboutInfo(prev => {
      const newEntries = isAddingEntry 
        ? [...(prev.entries || []), { ...editingEntry, id: Date.now().toString() }]
        : (prev.entries || []).map(e => e.id === editingEntry.id ? editingEntry : e);
      
      return { ...prev, entries: newEntries };
    });
    
    setEditingEntry(null);
    setIsAddingEntry(false);
  };

  const handleDeleteEntry = (id: string) => {
    setAboutInfo(prev => ({
      ...prev,
      entries: (prev.entries || []).filter(e => e.id !== id)
    }));
  };

  const handleFriendRequest = async () => {
    if (!currentUser || !id) return;
    try {
      await setDoc(doc(db, 'users', id, 'friendRequests', currentUser.uid), {
        from: currentUser.uid,
        timestamp: serverTimestamp()
      });
      setFriendRequestStatus('requested');
    } catch (error) {
      console.error("Error sending friend request:", error);
      alert("Failed to send friend request");
    }
  };

  const handleBookUpload = async () => {
    if (!currentUser || !bookForm.file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      // Blob conversion for WebView
      const fileBlob = new Blob([bookForm.file], { type: bookForm.file.type });
      formData.append('file', fileBlob, bookForm.file.name || `upload_${Date.now()}`);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

      console.log('Starting book post direct Cloudinary upload...');
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dxiolmmdv';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { 
        method: 'POST', 
        body: formData
      });

      if (!res.ok) {
        const status = res.status;
        console.error(`Cloudinary Book upload error status: ${status}`);
        let errorMsg = `Upload failed: ${status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error?.message || errorMsg;
        } catch (e) {
          const text = await res.text().catch(() => '');
          console.error('Cloudinary Book upload error text:', text);
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      console.log('Book media uploaded:', data.secure_url);

      if (data.secure_url) {
        const mentions = (bookForm.mentions || '').split(' ').filter(m => m.startsWith('@')).map(m => m.slice(1));
        await addDoc(collection(db, 'books_posts'), {
          authorId: currentUser.uid || '',
          authorName: currentUser.displayName || 'Anonymous',
          authorPhoto: currentUser.photoURL || null,
          isVerified: currentUser.role === 'admin' || currentUser.isVerified || false,
          title: bookForm.title || 'Untitled Post',
          description: bookForm.description || '',
          mediaUrl: data.secure_url || '',
          mediaType: (bookForm.file?.type || '').startsWith('video/') ? 'video' : 'image',
          mediaItems: [{ 
            url: data.secure_url || '', 
            publicId: data.public_id || null, 
            type: (bookForm.file?.type || '').startsWith('video/') ? 'video' : 'image' 
          }],
          likes: [],
          comments: [],
          mentions,
          type: 'books',
          createdAt: serverTimestamp()
        });
        setIsUploadingBook(false);
        setBookForm({ title: '', description: '', mentions: '', file: null });
        setToast('Book post published successfully!');
      }
    } catch (error: any) {
      console.error('Error uploading book:', error);
      alert(`Failed to upload book: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploadingStory(true);
    const formData = new FormData();
    // Blob conversion for WebView
    const fileBlob = new Blob([file], { type: file.type });
    formData.append('file', fileBlob, file.name || `upload_${Date.now()}`);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

    try {
      console.log('Starting story direct Cloudinary upload...');
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dxiolmmdv';
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const status = response.status;
        console.error(`Cloudinary Story upload error status: ${status}`);
        let errorMsg = `Upload failed: ${status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error?.message || errorMsg;
        } catch (e) {
          const text = await response.text().catch(() => '');
          console.error('Cloudinary Story upload error text:', text);
        }
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      console.log('Story upload success:', data.secure_url);
      
      await addDoc(collection(db, 'stories'), {
        authorId: currentUser.uid || '',
        authorName: currentUser.displayName || 'Anonymous',
        authorPhoto: currentUser.photoURL || null,
        mediaUrl: data.secure_url || '',
        publicId: data.public_id || null,
        mediaType: (file.type || '').startsWith('video/') ? 'video' : 'image',
        type: 'story',
        description: `My new Story!`,
        likes: [],
        views: 0,
        createdAt: serverTimestamp(),
        comments: []
      });
      setToast('Story shared successfully!');
    } catch (error: any) {
      console.error("Error uploading story:", error);
      alert(`Failed to share story: ${error.message || 'Unknown error'}`);
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

  if (profileUid === 'not-found') {
    return <NotFound />;
  }

  if (!profileUid) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-black mb-4" size={48} />
        <p className="font-black text-xl tracking-tighter uppercase">Finding profile...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto pb-24 bg-white relative">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[4000] bg-black text-white px-8 py-4 rounded-3xl font-black shadow-2xl flex items-center gap-3 border-2 border-white/10"
          >
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <Check size={20} className="text-green-400" />
            </div>
            <span className="text-lg tracking-tight">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <Helmet>
        <title>{profileUser?.displayName || 'Chat Profile'} on OC-CHAT</title>
        <meta name="description" content={profileUser?.bio || 'Check out my profile on OC-CHAT'} />
        <meta property="og:title" content={`${profileUser?.displayName || 'User'}'s Profile on OC-CHAT`} />
        <meta property="og:description" content={profileUser?.bio || 'Connect with me on OC-CHAT'} />
        <meta property="og:image" content={profileUser?.photoURL || `https://ui-avatars.com/api/?name=${profileUser?.displayName}`} />
        <meta property="og:url" content={`https://occhat.ocsthael.com/u/${profileUser?.username || profileUser?.uid}`} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary" />
      </Helmet>
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

      {/* Top Header & Banner */}
      <div className="relative h-[280px] bg-gradient-to-br from-[#8A2BE2] via-[#4169E1] to-[#1E90FF] overflow-hidden">
        {/* Back Arrow */}
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 z-20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        {/* Settings Gear and ID Card */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
          <button onClick={() => setShowIdCard(true)} className="p-2">
            <CreditCard className="text-white" size={32} />
          </button>
          <button onClick={() => setSubView('settings')} className="p-2">
            <Settings className="text-white" size={32} />
          </button>
        </div>

        {/* Text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full z-10">
          <h1 className="text-5xl font-black text-white tracking-wider drop-shadow-md">OC-CHAT</h1>
          <p className="text-white/90 text-lg font-bold mt-1">Connect · Chat · Share</p>
        </div>

        {/* Small Profiles (Floating) */}
        <div className="absolute top-12 left-12 w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 opacity-80">
          <img src="https://i.pravatar.cc/100?img=1" alt="user" className="w-full h-full object-cover" />
        </div>
        <div className="absolute top-24 right-16 w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 opacity-80">
          <img src="https://i.pravatar.cc/100?img=2" alt="user" className="w-full h-full object-cover" />
        </div>
        <div className="absolute bottom-20 right-28 w-14 h-14 rounded-full overflow-hidden border-2 border-white/50 opacity-80">
          <img src="https://i.pravatar.cc/100?img=3" alt="user" className="w-full h-full object-cover" />
        </div>
        <div className="absolute bottom-12 left-20 w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 opacity-80">
          <img src="https://i.pravatar.cc/100?img=4" alt="user" className="w-full h-full object-cover" />
        </div>

        {/* Bottom white wave/curve */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-[50px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C50.41,108.15,103.42,115.84,158.51,115.84,213.59,115.84,267.5,107.13,321.39,56.44Z" fill="#ffffff"></path>
          </svg>
        </div>
      </div>

      {/* Profile Identity */}
      <div className="flex flex-col items-center px-4 -mt-24 relative z-10">
        {/* Profile Picture */}
        <div className="relative cursor-pointer" onClick={() => setShowIdCard(true)}>
          <div className="w-44 h-44 rounded-full bg-white overflow-hidden relative border-4 border-blue-800">
            <img
              src={profileUser?.photoURL || "https://i.pravatar.cc/300"}
              alt={profileUser?.displayName || "MENA AKTER"}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          {/* Green Online Status Dot */}
          <div className="absolute top-4 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
          {/* Golden Badge */}
          <div className="absolute bottom-2 right-2">
            <VerifiedBadge className="w-10 h-10 text-yellow-400 animate-pulse" />
          </div>
        </div>

        {/* Details */}
        <div className="mt-4 flex flex-col items-center w-full">
            <div className="flex items-center gap-1">
              <h2 className="text-4xl font-black text-black tracking-tight">
                {profileUser?.displayName || "MENA AKTER"}
              </h2>
              <VerifiedBadge className="w-8 h-8 text-yellow-400" />
              {isOwnProfile && (
                <button onClick={() => setIsEditing(true)} className="ml-2 p-1 bg-gray-100 rounded-full hover:bg-gray-200">
                  <Edit3 size={20} className="text-gray-600" />
                </button>
              )}
            </div>
            <div className="text-2xl font-bold text-black mt-1 flex items-center gap-2">
              Bio
              {isOwnProfile && (
                <button onClick={() => setIsEditing(true)} className="p-1 bg-gray-100 rounded-full hover:bg-gray-200">
                  <Edit3 size={16} className="text-gray-600" />
                </button>
              )}
            </div>
            <div className="text-xl text-gray-800">{profileUser?.bio || "I am Mena akter"}</div>
            
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-black">{profileUser?.sex || "Female"}</span>
                <VerifiedBadge className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-2xl font-bold text-black">Born {profileUser?.birthYear || ""}</span>
            </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 px-4 mt-8">
        <button 
          onClick={() => navigate(`/chat/${profileUser?.uid}`)}
          className="flex-1 bg-[#00008B] text-white text-4xl font-bold py-3 rounded-md active:scale-95 transition-transform"
        >
          Chat
        </button>
        <button 
          onClick={handleFriendRequest}
          disabled={friendRequestStatus !== 'none'}
          className={cn(
            "flex-1 text-white text-4xl font-bold py-3 rounded-md active:scale-95 transition-transform",
            friendRequestStatus === 'none' ? "bg-[#5C7CFA]" : "bg-gray-400"
          )}
        >
          {friendRequestStatus === 'requested' ? 'Requested' : friendRequestStatus === 'friends' ? 'Friends' : 'Friends'}
        </button>
        <button onClick={() => setShowBottomMenu(true)} className="p-2">
          <MoreHorizontal size={40} className="text-black" />
        </button>
      </div>

      {/* Green Line Separator */}
      <div className="w-full h-1 bg-green-500 mt-6"></div>

      {/* Tabs */}
      <div className="flex items-center gap-6 px-4 mt-4 border-b border-gray-300">
        <button 
          onClick={() => setActiveTab('about')}
          className={cn("text-2xl font-bold pb-2", activeTab === 'about' ? "text-[#00008B] border-b-4 border-[#00008B]" : "text-gray-500")}
        >
          About
        </button>
        <button 
          onClick={() => setActiveTab('story')}
          className={cn("text-2xl font-bold pb-2", activeTab === 'story' ? "text-[#00008B] border-b-4 border-[#00008B]" : "text-gray-500")}
        >
          Story
        </button>
        <button 
          onClick={() => setActiveTab('books')}
          className={cn("text-2xl font-bold pb-2", activeTab === 'books' ? "text-[#00008B] border-b-4 border-[#00008B]" : "text-gray-500")}
        >
          Books
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'about' && (
        <div className="px-4 mt-4 flex flex-col gap-4 text-black pb-20">
          {/* Status and Website */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded" onClick={() => isOwnProfile && setIsEditingAbout(true)}>
              <span className="text-xl font-bold">{aboutInfo.status || "Add status"}</span>
              {isOwnProfile && <Edit3 size={20} className="text-gray-400" />}
            </div>
            <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded" onClick={() => isOwnProfile && setIsEditingAbout(true)}>
              <span className="text-xl font-bold">{aboutInfo.website || "Add social or website"}</span>
              {isOwnProfile && <Edit3 size={20} className="text-gray-400" />}
            </div>
          </div>

          {/* Entries */}
          <div className="flex flex-col gap-2">
            {(showAllAbout ? (aboutInfo.entries || []) : (aboutInfo.entries || []).slice(0, 2)).map(entry => (
              <div key={entry.id} className="flex items-start justify-between p-2 hover:bg-gray-50 rounded">
                <div>
                  <div className="text-xl font-bold">{entry.role}</div>
                  <div className="text-gray-600">{entry.institution}</div>
                  <div className="text-sm text-gray-500">{entry.startDate} - {entry.endDate} • {entry.location}</div>
                </div>
                {isOwnProfile && (
                  <button onClick={() => { setEditingEntry(entry); setIsAddingEntry(false); }} className="p-2">
                    <Edit3 size={20} className="text-gray-400" />
                  </button>
                )}
              </div>
            ))}
            
            {isOwnProfile && (
              <button 
                onClick={() => {
                  setEditingEntry({ id: '', type: 'work', institution: '', role: '', startDate: '', endDate: '', location: '' });
                  setIsAddingEntry(true);
                }}
                className="text-[#5C7CFA] p-2 font-bold text-left"
              >
                + Add Work/Education
              </button>
            )}
            
            {(aboutInfo.entries || []).length > 2 && !showAllAbout && (
              <button onClick={() => setShowAllAbout(true)} className="text-[#5C7CFA] p-2 font-bold text-left">
                .... more
              </button>
            )}
            {showAllAbout && (
              <button onClick={() => setShowAllAbout(false)} className="text-[#5C7CFA] p-2 font-bold text-left">
                Show less
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'story' && (
        <div className="p-4 pb-20">
          <div className="grid grid-cols-3 gap-2">
            {isOwnProfile && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[9/16] bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:bg-gray-200 transition-colors"
              >
                {isUploadingStory ? <Loader2 className="animate-spin text-blue-600" /> : <Plus className="text-gray-400" size={32} />}
                <span className="text-xs font-bold text-gray-500">Upload</span>
              </button>
            )}
            {stories.map((story, index) => (
              <div 
                key={story.id} 
                onClick={() => setSelectedStoryIndex(index)}
                className="aspect-[9/16] bg-gray-200 rounded-xl overflow-hidden relative cursor-pointer group"
              >
                {story.mediaType === 'video' ? (
                  <video src={story.mediaUrl} className="w-full h-full object-cover" />
                ) : (
                  <img src={story.mediaUrl} className="w-full h-full object-cover" alt="" />
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'books' && (
        <div className="p-4 pb-20 space-y-4">
          {isOwnProfile && (
            <button 
              onClick={() => setIsUploadingBook(true)}
              className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center gap-2 font-bold border-2 border-dashed border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <Plus size={24} />
              Post to Books
            </button>
          )}
          {books.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Plus size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">No posts in Books yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {books.map(post => (
                <div key={post.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="aspect-video bg-gray-100">
                    {post.mediaType === 'video' ? (
                      <video src={post.mediaUrl} className="w-full h-full object-cover" />
                    ) : (
                      <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-sm line-clamp-1">{post.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{post.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Book Upload Modal */}
      <AnimatePresence>
        {isUploadingBook && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Post to Books</h2>
                <button onClick={() => setIsUploadingBook(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Title (Bold)" 
                  value={bookForm.title} 
                  onChange={e => setBookForm({...bookForm, title: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500" 
                />
                <textarea 
                  placeholder="Description" 
                  value={bookForm.description} 
                  onChange={e => setBookForm({...bookForm, description: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none h-24 resize-none focus:ring-2 focus:ring-blue-500" 
                />
                <input 
                  type="text" 
                  placeholder="Mentions (e.g. @friend1)" 
                  value={bookForm.mentions} 
                  onChange={e => setBookForm({...bookForm, mentions: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500" 
                />
                
                <div 
                  onClick={() => bookInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition-colors"
                >
                  {bookForm.file ? (
                    <span className="font-medium text-blue-600">{bookForm.file.name}</span>
                  ) : (
                    <>
                      <Plus size={32} className="mb-2" />
                      <span>Select Photo or Video</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={bookInputRef} 
                  onChange={e => setBookForm({...bookForm, file: e.target.files?.[0] || null})} 
                  className="hidden" 
                  accept="image/*,video/*"
                />

                <button 
                  onClick={handleBookUpload} 
                  disabled={isUploading || !bookForm.file || !bookForm.title}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={20} /> : 'Publish Post'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === 'story' && (
        <div className="mt-6">
          <div className="flex items-center justify-between px-4 mb-4">
            <h3 className="text-5xl font-black text-black">Story</h3>
            {isOwnProfile && (
              <button 
                onClick={() => storyInputRef.current?.click()}
                className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2"
              >
                <Camera size={20} />
                Upload
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 px-2">
            {stories.map((story, index) => (
              <div key={story.id} onClick={() => setSelectedStoryIndex(index)} className="w-full aspect-square bg-gray-200 relative overflow-hidden cursor-pointer">
                <video src={story.videoUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <PlayIcon size={24} className="text-white opacity-80" fill="white" />
                </div>
              </div>
            ))}
            {/* Placeholders if few stories */}
            {Array.from({ length: Math.max(0, 4 - stories.length) }).map((_, i) => (
              <div key={`placeholder-${i}`} className="w-full aspect-square bg-[#D9F0FF] relative overflow-hidden">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-4 bg-white rounded-full"></div>
                <div className="absolute top-3 left-1/3 w-6 h-3 bg-white rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-[150%] h-[60%] bg-[#8BC34A] rounded-t-[100%] origin-bottom-left -translate-x-1/4 translate-y-1/4"></div>
                <div className="absolute bottom-0 right-0 w-[150%] h-[50%] bg-[#689F38] rounded-t-[100%] origin-bottom-right translate-x-1/4 translate-y-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'books' && (
        <div className="mt-6 mb-8">
          <div className="flex items-center justify-between px-4 mb-4">
            <h3 className="text-5xl font-black text-black">Books</h3>
            {isOwnProfile && (
              <>
                <input 
                  type="file" 
                  ref={bookInputRef} 
                  onChange={handleBookUpload} 
                  className="hidden" 
                  accept="video/*,image/*"
                />
                <button 
                  onClick={() => bookInputRef.current?.click()}
                  className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                  <Camera size={20} />
                  Post
                </button>
              </>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 px-2">
            {books.map((book) => (
              <div key={book.id} className="w-full aspect-square bg-gray-200 relative overflow-hidden">
                {book.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video src={book.mediaUrl} className="w-full h-full object-cover" />
                ) : (
                  <img src={book.mediaUrl} className="w-full h-full object-cover" alt="Post" />
                )}
              </div>
            ))}
            {/* Placeholders if few books */}
            {Array.from({ length: Math.max(0, 4 - books.length) }).map((_, i) => (
              <div key={`placeholder-${i}`} className="w-full aspect-square bg-[#D9F0FF] relative overflow-hidden">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-4 bg-white rounded-full"></div>
                <div className="absolute top-3 left-1/3 w-6 h-3 bg-white rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-[150%] h-[60%] bg-[#8BC34A] rounded-t-[100%] origin-bottom-left -translate-x-1/4 translate-y-1/4"></div>
                <div className="absolute bottom-0 right-0 w-[150%] h-[50%] bg-[#689F38] rounded-t-[100%] origin-bottom-right translate-x-1/4 translate-y-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Story Player Modal */}
      {selectedStoryIndex !== null && (
        <StoryPlayer 
          stories={stories} 
          initialIndex={selectedStoryIndex} 
          onClose={() => setSelectedStoryIndex(null)} 
        />
      )}

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="text-lg font-extrabold">Edit Profile</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="username"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium ml-1">Unique handle for your clean profile URL</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-24 resize-none"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit About Info Modal */}
      <AnimatePresence>
        {isEditingAbout && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="text-lg font-extrabold">Edit Status & Website</h3>
                <button onClick={() => setIsEditingAbout(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Status</label>
                  <input
                    type="text"
                    value={aboutInfo.status}
                    onChange={(e) => setAboutInfo(prev => ({ ...prev, status: e.target.value }))}
                    placeholder="Add status"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Social or Website</label>
                  <input
                    type="text"
                    value={aboutInfo.website}
                    onChange={(e) => setAboutInfo(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="Add social or website"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={handleSaveAboutInfo}
                  disabled={isSaving}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit About Entry Modal */}
      <AnimatePresence>
        {editingEntry && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="text-lg font-extrabold">{isAddingEntry ? 'Add' : 'Edit'} Experience/Education</h3>
                <button onClick={() => { setEditingEntry(null); setIsAddingEntry(false); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto no-scrollbar">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Type</label>
                  <select
                    value={editingEntry.type}
                    onChange={(e) => setEditingEntry(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="work">Work</option>
                    <option value="school">School</option>
                    <option value="college">College</option>
                    <option value="university">University</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Institution Name</label>
                  <input
                    type="text"
                    value={editingEntry.institution}
                    onChange={(e) => setEditingEntry(prev => prev ? { ...prev, institution: e.target.value } : null)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Degree/Role</label>
                  <input
                    type="text"
                    value={editingEntry.role}
                    onChange={(e) => setEditingEntry(prev => prev ? { ...prev, role: e.target.value } : null)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Start Date</label>
                    <input
                      type="text"
                      placeholder="e.g. 2020"
                      value={editingEntry.startDate}
                      onChange={(e) => setEditingEntry(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">End Date</label>
                    <input
                      type="text"
                      placeholder="e.g. Present"
                      value={editingEntry.endDate}
                      onChange={(e) => setEditingEntry(prev => prev ? { ...prev, endDate: e.target.value } : null)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Location</label>
                  <input
                    type="text"
                    value={editingEntry.location}
                    onChange={(e) => setEditingEntry(prev => prev ? { ...prev, location: e.target.value } : null)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
                {!isAddingEntry && (
                  <button
                    onClick={() => { handleDeleteEntry(editingEntry.id); setEditingEntry(null); handleSaveAboutInfo(); }}
                    className="py-3 px-4 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all active:scale-95"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => { handleSaveEntry(); setTimeout(handleSaveAboutInfo, 100); }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
                >
                  <Check size={20} />
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Bottom Menu */}
      <AnimatePresence>
        {showBottomMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBottomMenu(false)}
              className="fixed inset-0 bg-black/50 z-[1000] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[1001] overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-gray-100 flex justify-center sticky top-0 bg-white">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
              <div className="overflow-y-auto pb-8">
                <div className="p-2">
                  <MenuButton icon={<Settings size={24} />} label="Settings" subLabel="Account, Privacy, Notifications" onClick={() => { setShowBottomMenu(false); setSubView('settings'); }} />
                  {currentUser?.isSeller ? (
                    <MenuButton icon={<ShoppingCart size={24} />} label="Seller Dashboard" subLabel="Manage products and orders" onClick={() => { setShowBottomMenu(false); navigate('/seller-dashboard'); }} />
                  ) : (
                    <MenuButton icon={<ShoppingCart size={24} />} label="Become Seller" subLabel="Start selling on Dhukan" onClick={() => { setShowBottomMenu(false); setIsBecomeSellerOpen(true); }} />
                  )}
                  <MenuButton icon={<Edit3 size={24} />} label="Edit Profile" subLabel="Name, Bio, Username, Photo, Verified Badge Request" onClick={() => { setShowBottomMenu(false); setIsEditing(true); }} />
                  <MenuButton icon={<Shield size={24} />} label="Privacy & Security" subLabel="Blocked Users, 2FA, Devices" onClick={() => { setShowBottomMenu(false); setSubView('security'); }} />
                  <MenuButton icon={<MessageCircle size={24} />} label="Chat Settings" subLabel="Wallpaper, Font Size, Auto-delete" onClick={() => { setShowBottomMenu(false); }} />
                  <MenuButton icon={<VerifiedBadge className="w-6 h-6 text-yellow-500" />} label="OC Pro" subLabel="Premium Badges, No Ads, Extra Storage" onClick={() => { setShowBottomMenu(false); }} />
                  <MenuButton icon={<CreditCard size={24} />} label="Storage & Data" subLabel="Cache Clear, Media Manager" onClick={() => { setShowBottomMenu(false); }} />
                  <MenuButton icon={<Globe size={24} />} label="Language" subLabel="Multi-language selector" onClick={() => { setShowBottomMenu(false); setSubView('language'); }} />
                  <MenuButton icon={<HelpCircle size={24} />} label="Help & Support" subLabel="FAQ, Report, Contact" onClick={() => { setShowBottomMenu(false); setSubView('help'); }} />
                  <MenuButton icon={<UserPlus size={24} />} label="Invite Friends" subLabel="Referral Link" onClick={() => { setShowBottomMenu(false); }} />
                  <MenuButton icon={<AlertCircle size={24} />} label="Terms & Policies" onClick={() => { setShowBottomMenu(false); }} />
                  <MenuButton icon={<LogOut size={24} />} label="Logout" onClick={() => { setShowBottomMenu(false); logout(); }} isDestructive />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Become Seller Modal */}
      <AnimatePresence>
        {isBecomeSellerOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="text-lg font-extrabold">Become a Seller</h3>
                <button onClick={() => setIsBecomeSellerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Shop Name</label>
                  <input
                    type="text"
                    value={sellerForm.shopName}
                    onChange={(e) => setSellerForm(prev => ({ ...prev, shopName: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Phone Number</label>
                  <input
                    type="text"
                    value={sellerForm.phone}
                    onChange={(e) => setSellerForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Address</label>
                  <textarea
                    value={sellerForm.address}
                    onChange={(e) => setSellerForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none h-24"
                  />
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={async () => {
                    if (currentUser) {
                      await updateDoc(doc(db, 'users', currentUser.uid), {
                        isSeller: true,
                        sellerInfo: sellerForm
                      });
                      setIsBecomeSellerOpen(false);
                      alert('You are now a seller!');
                    }
                  }}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
                >
                  <Check size={20} />
                  Register Shop
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Digital ID Card Modal */}
      <AnimatePresence>
        {showIdCard && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowIdCard(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, rotateY: 90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.9, opacity: 0, rotateY: -90 }}
              transition={{ type: 'spring', damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-2xl shadow-2xl overflow-hidden relative border border-white/20"
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-white/10 skew-y-6 transform origin-top-left"></div>
              <div className="p-6 relative z-10 flex flex-col items-center">
                <h2 className="text-white font-black text-2xl tracking-widest mb-6">OC-CHAT ID</h2>
                <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden mb-4 shadow-lg">
                  <img src={profileUser?.photoURL || "https://i.pravatar.cc/300"} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-bold text-2xl">{profileUser?.displayName || "MENA AKTER"}</h3>
                  <VerifiedBadge className="w-6 h-6 text-yellow-400" />
                </div>
                <p className="text-blue-200 font-medium mb-6">@{profileUser?.displayName?.toLowerCase().replace(/\s+/g, '') || "menaakter"}</p>
                
                <div className="w-full bg-white/10 rounded-xl p-4 flex justify-between items-center backdrop-blur-md border border-white/10">
                  <div>
                    <p className="text-blue-200 text-xs uppercase tracking-wider mb-1">Member Since</p>
                    <p className="text-white font-bold">2026</p>
                  </div>
                  <div className="w-16 h-16 bg-white rounded-lg p-1">
                    <QrCode className="w-full h-full text-black" />
                  </div>
                </div>
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
