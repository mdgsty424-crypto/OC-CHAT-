import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Edit3, 
  MapPin, 
  Link as LinkIcon, 
  Globe, 
  Calendar, 
  Mail, 
  Phone, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Check, 
  X, 
  Loader2,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  Hash,
  Search,
  ExternalLink,
  ShieldCheck,
  Eye,
  Lock,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType } from '../../types';
import { doc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { sendOTP } from '../../services/emailService';

interface EditProfileProps {
  user: UserType;
  onBack: () => void;
}

type EditView = 
  | 'main' 
  | 'photo' 
  | 'cover' 
  | 'bio' 
  | 'details' 
  | 'location' 
  | 'links' 
  | 'professional' 
  | 'username' 
  | 'email_verify'
  | 'preview';

export default function EditProfile({ user, onBack }: EditProfileProps) {
  const [view, setView] = useState<EditView>('main');
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    bio: user.bio || '',
    username: user.username || '',
    gender: user.sex || user.gender || '',
    birthYear: user.birthYear || new Date().getFullYear() - 20,
    city: user.location?.split(',')[0] || '',
    country: user.location?.split(',')[1]?.trim() || '',
    email: user.email || '',
    phone: user.phone || user.sellerInfo?.phone || '',
    website: user.status || '', // Reusing status as website/status placeholder for now
    links: [] as { title: string, url: string }[],
    work: [] as string[],
    education: [] as string[],
    skills: [] as string[]
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  const [toast, setToast] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPhotoOptions, setShowPhotoOptions] = useState<'avatar' | 'cover' | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');

  const handleSendOtp = async () => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setToast('Please enter a valid email');
      return;
    }

    setIsSendingOtp(true);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);

    try {
      await sendOTP(formData.email, formData.displayName || user.displayName, newOtp);
      setOtpSent(true);
      setToast('Verification code sent!');
    } catch (error) {
      setToast('Failed to send code. Try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyAndSave = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp !== generatedOtp) {
      setToast('Invalid verification code');
      return;
    }

    await handleSaveMain();
    setOtpSent(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle username availability check with debounce
  useEffect(() => {
    if (view !== 'username' || !formData.username || formData.username === user.username) {
      setUsernameStatus('idle');
      return;
    }

    const checkUsername = async () => {
      // Basic validation
      if (!/^[a-z0-9_]{3,20}$/.test(formData.username)) {
        setUsernameStatus('invalid');
        return;
      }

      setIsCheckingUsername(true);
      try {
        const q = query(collection(db, 'users'), where('username', '==', formData.username));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setUsernameStatus('taken');
        } else {
          setUsernameStatus('available');
        }
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [formData.username, view, user.username]);

  const handleUpdateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveMain = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: formData.displayName,
        bio: formData.bio,
        username: formData.username,
        sex: formData.gender,
        birthYear: Number(formData.birthYear),
        location: `${formData.city}, ${formData.country}`,
        email: formData.email,
        phone: formData.phone,
        status: formData.website, // Direct status update
        aboutInfo: {
          status: formData.bio, // Sync bio to status if needed, or just use separate
          website: formData.website,
          entries: [
            ...formData.work.map(w => ({ id: `w-${Date.now()}-${w}`, type: 'work', institution: w, role: 'Employee', startDate: '', endDate: '', location: formData.city })),
            ...formData.education.map(e => ({ id: `e-${Date.now()}-${e}`, type: 'university', institution: e, role: 'Student', startDate: '', endDate: '', location: formData.city }))
          ]
        },
        socialLinks: formData.links,
        skills: formData.skills
      });
      setToast('Saved successfully!');
      setTimeout(onBack, 500);
    } catch (error) {
      console.error("Error saving profile:", error);
      setToast('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setShowPhotoOptions(null);

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dxiolmmdv';
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: cloudinaryFormData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      const updateData = type === 'avatar' ? { photoURL: data.secure_url } : { coverURL: data.secure_url };
      
      await updateDoc(doc(db, 'users', user.uid), updateData);
      
      // Auto-post to Books feed like Facebook
      try {
        await addDoc(collection(db, 'books_posts'), {
          authorId: user.uid,
          authorName: user.displayName || 'OC-CHAT User',
          authorPhoto: type === 'avatar' ? data.secure_url : (user.photoURL || ''),
          title: `${user.displayName || 'User'} updated their ${type === 'avatar' ? 'profile picture' : 'cover photo'}.`,
          description: type === 'avatar' ? 'Updated my profile picture! 📸' : 'New cover photo just dropped! ✨',
          mediaUrl: data.secure_url,
          mediaType: 'image',
          mediaItems: [{ url: data.secure_url, type: 'image' }],
          likes: [],
          comments: [],
          createdAt: serverTimestamp(),
        });
      } catch (postError) {
        console.error("Error creating feed post for photo update:", postError);
      }

      setToast(`${type === 'avatar' ? 'Profile picture' : 'Cover photo'} updated!`);
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      setToast(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const renderSectionHeader = (title: string, backView?: EditView) => (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => backView ? setView(backView) : onBack()} 
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft size={24} className="text-black" />
        </button>
        <h1 className="text-xl font-black text-black uppercase tracking-tight">{title}</h1>
      </div>
      <button 
        onClick={handleSaveMain}
        disabled={isSaving}
        className="px-4 py-1.5 bg-blue-600 text-white rounded-full font-black text-sm uppercase tracking-wider hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
      >
        {isSaving && <Loader2 size={16} className="animate-spin" />}
        Save
      </button>
    </div>
  );

  const SectionCard = ({ icon: Icon, title, onClick, value }: { icon: any, title: string, onClick: () => void, value?: string }) => (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all text-left border-b border-gray-50"
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-gray-50 rounded-2xl text-gray-600">
          <Icon size={20} />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-gray-900">{title}</span>
          {value && <span className="text-sm text-gray-500 font-medium line-clamp-1">{value}</span>}
        </div>
      </div>
      <ChevronRight size={20} className="text-gray-300" />
    </button>
  );

  if (view === 'main') {
    return (
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 z-20 bg-white">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-black uppercase tracking-tight">Edit Profile</h1>
          </div>
          <button 
            onClick={() => setView('preview')}
            className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-all"
          >
            <Eye size={14} />
            Preview
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-10 bg-gray-50/50">
          {/* Profile & Cover Photos Section */}
          <div className="p-4">
            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100">
              <div 
                className="h-32 bg-gray-200 relative cursor-pointer"
                onClick={() => setShowPhotoOptions('cover')}
              >
                {user.coverURL ? (
                  <img src={user.coverURL} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-full">
                    <Camera className="text-white" size={24} />
                  </div>
                </div>
              </div>
              
              <div className="px-6 pb-6 flex flex-col items-center -mt-16">
                <div 
                  className="w-32 h-32 rounded-full border-4 border-white bg-gray-100 overflow-hidden relative cursor-pointer shadow-lg group"
                  onClick={() => setShowPhotoOptions('avatar')}
                >
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={32} />
                  </div>
                </div>
                <h2 className="mt-4 text-2xl font-black text-center">{formData.displayName}</h2>
                <p className="text-gray-500 font-bold text-sm tracking-tight">@{formData.username}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4">
            {/* Bio Section */}
            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 p-2">
              <SectionCard 
                icon={Edit3} 
                title="Bio / Intro" 
                value={formData.bio || "Describe yourself..."} 
                onClick={() => setView('bio')}
              />
            </div>

            {/* Details Section */}
            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-4 border-b border-gray-50">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Personal Details</h3>
               </div>
               <SectionCard icon={User} title="Name" value={formData.displayName} onClick={() => setView('details')} />
               <SectionCard icon={Hash} title="Username" value={formData.username} onClick={() => setView('username')} />
               <SectionCard icon={User} title="Gender" value={formData.gender || "Select Gender"} onClick={() => setView('details')} />
               <SectionCard icon={Calendar} title="Birthday" value={`Born ${formData.birthYear}`} onClick={() => setView('details')} />
            </div>

            {/* Location & Contact */}
            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-4 border-b border-gray-50">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Contact & Location</h3>
               </div>
               <SectionCard icon={MapPin} title="Location" value={formData.city ? `${formData.city}, ${formData.country}` : "Add Location"} onClick={() => setView('location')} />
               <SectionCard icon={Mail} title="Email" value={formData.email} onClick={() => setView('email_verify')} />
               <SectionCard icon={Phone} title="Phone" value={formData.phone || "Add Phone"} onClick={() => setView('location')} />
            </div>

            {/* Links Section */}
            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-4 border-b border-gray-50">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Links & Social</h3>
               </div>
               <SectionCard icon={Globe} title="Website" value={formData.website || "Add Website"} onClick={() => setView('links')} />
               <SectionCard icon={LinkIcon} title="Social Links" value={`${formData.links.length} links added`} onClick={() => setView('links')} />
            </div>

            {/* Professional Section */}
            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-4 border-b border-gray-50">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Professional Info</h3>
               </div>
               <SectionCard icon={Briefcase} title="Work Experience" onClick={() => setView('professional')} />
               <SectionCard icon={GraduationCap} title="Education" onClick={() => setView('professional')} />
               <SectionCard icon={Award} title="Skills" onClick={() => setView('professional')} />
            </div>
          </div>
        </div>

        {/* Photo Options Modal */}
        <AnimatePresence>
          {showPhotoOptions && (
            <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPhotoOptions(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative bg-white w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] overflow-hidden p-8 shadow-2xl"
              >
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 sm:hidden" />
                <h3 className="text-2xl font-black mb-8 text-center uppercase tracking-tight">
                  Update {showPhotoOptions === 'avatar' ? 'Profile Picture' : 'Cover Photo'}
                </h3>
                
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => {
                      if (showPhotoOptions === 'avatar') fileInputRef.current?.click();
                      else coverInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="p-2 bg-white rounded-xl shadow-sm text-blue-600">
                      <ImageIcon size={24} />
                    </div>
                    <span className="font-bold">Upload from Gallery</span>
                  </button>
                  <button className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-colors">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-green-600">
                      <Camera size={24} />
                    </div>
                    <span className="font-bold">Take Photo</span>
                  </button>
                  <button 
                    className="w-full flex items-center gap-4 p-4 bg-red-50 rounded-3xl hover:bg-red-100 transition-colors text-red-600"
                  >
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Trash2 size={24} />
                    </div>
                    <span className="font-bold">Remove Current</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Hidden File Inputs */}
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

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 50, x: '-50%' }}
              className="fixed bottom-10 left-1/2 z-[3000] bg-black text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 whitespace-nowrap"
            >
              <Check size={18} className="text-green-400" />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (view === 'bio') {
    return (
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col">
        {renderSectionHeader("Bio", 'main')}
        <div className="p-6 flex-1 bg-gray-50/30">
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Personal Intro</label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleUpdateField('bio', e.target.value.slice(0, 150))}
              placeholder="Tell us about yourself..."
              className="w-full h-40 text-xl font-bold bg-transparent outline-none resize-none placeholder:text-gray-200"
              autoFocus
            />
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-50">
               <span className="flex items-center gap-2 text-gray-300">
                 <AlertCircle size={14} />
                 <span className="text-[10px] font-bold uppercase tracking-tighter">Emoji Supported</span>
               </span>
               <span className={cn(
                 "text-sm font-black italic",
                 formData.bio.length > 140 ? "text-red-500" : "text-gray-300"
               )}>
                 {formData.bio.length}/150
               </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'details') {
    return (
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col">
        {renderSectionHeader("Details", 'main')}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-gray-50/30">
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-2">Full Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleUpdateField('displayName', e.target.value)}
                className="w-full py-4 px-6 bg-gray-50 rounded-[24px] font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-2">Gender</label>
              <div className="flex gap-2">
                {['Male', 'Female', 'Other'].map(g => (
                  <button
                    key={g}
                    onClick={() => handleUpdateField('gender', g)}
                    className={cn(
                      "flex-1 py-4 rounded-[24px] font-black text-xs uppercase tracking-wider transition-all",
                      formData.gender === g 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                        : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-2 flex justify-between">
                <span>Birth Year</span>
                <Lock size={12} className="text-gray-300" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.birthYear}
                  onChange={(e) => handleUpdateField('birthYear', e.target.value)}
                  className="w-full py-4 px-6 bg-gray-50 rounded-[24px] font-black text-lg outline-none"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600 uppercase">Privacy: Only Me</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50 rounded-[32px] p-6 border border-blue-100 flex gap-4">
             <ShieldCheck className="text-blue-600 shrink-0" size={24} />
             <div className="flex flex-col gap-1">
                <span className="font-black text-blue-900 text-sm tracking-tight">Identity Protection</span>
                <p className="text-[10px] text-blue-800/70 font-medium leading-relaxed uppercase">
                  Some details like birthday are kept private by default for security. 
                  You can change visibility in settings.
                </p>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'username') {
    return (
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col">
        {renderSectionHeader("Username", 'main')}
        <div className="p-6 flex-1 bg-gray-50/30">
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Your Handle</h2>
            <p className="text-gray-500 text-sm font-medium mb-8">
              Unique username used for mentions and your clean profile link.
            </p>

            <div className="relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xl">@</div>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleUpdateField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="w-full py-6 pl-14 pr-20 bg-gray-50 rounded-[32px] font-black text-xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all italic"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                {isCheckingUsername ? (
                  <Loader2 className="animate-spin text-blue-600" size={20} />
                ) : (
                  <>
                    {usernameStatus === 'available' && <Check size={24} className="text-green-500" />}
                    {usernameStatus === 'taken' && <X size={24} className="text-red-500" />}
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              {usernameStatus === 'taken' && (
                <div className="flex items-center gap-2 text-red-600 px-4">
                  <AlertCircle size={14} />
                  <span className="text-[10px] font-black uppercase tracking-tight">Username already taken</span>
                </div>
              )}
              {usernameStatus === 'invalid' && (
                <div className="flex items-center gap-2 text-orange-600 px-4">
                  <AlertCircle size={14} />
                  <span className="text-[10px] font-black uppercase tracking-tight">3-20 chars, a-z, 0-9, _ only</span>
                </div>
              )}
              {usernameStatus === 'available' && (
                <div className="flex items-center gap-2 text-green-600 px-4">
                  <Check size={14} />
                  <span className="text-[10px] font-black uppercase tracking-tight">Username available</span>
                </div>
              )}
            </div>

            <div className="mt-12 pt-8 border-t border-gray-50 flex gap-4">
               <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Lock size={20} />
               </div>
               <div className="flex flex-col">
                  <span className="text-xs font-black text-blue-900 uppercase tracking-tight">7-Day Cooling Period</span>
                  <p className="text-[10px] text-blue-800/60 font-medium tracking-tight uppercase">
                    You can only change your username once every 7 days.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'email_verify') {
    return (
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col">
        {renderSectionHeader("Email Verification", 'main')}
        <div className="p-6 flex-1 bg-gray-50/30">
          <AnimatePresence mode="wait">
            {!otpSent ? (
               <motion.div 
                 key="email-input"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100"
               >
                 <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Update Email</h2>
                 <p className="text-gray-500 text-sm font-medium mb-8">
                   We'll send a 6-digit verification code to your new email address.
                 </p>
                 
                 <div className="space-y-4">
                   <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleUpdateField('email', e.target.value)}
                        placeholder="new.email@example.com"
                        className="w-full py-5 pl-14 pr-6 bg-gray-50 rounded-[28px] font-bold text-lg outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                   </div>
                   <button 
                     onClick={handleSendOtp}
                     disabled={isSendingOtp}
                     className="w-full py-5 bg-black text-white rounded-[28px] font-black uppercase tracking-widest hover:bg-gray-900 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     {isSendingOtp && <Loader2 size={20} className="animate-spin" />}
                     Send OTP
                   </button>
                 </div>
               </motion.div>
            ) : (
              <motion.div 
                 key="otp-input"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100"
               >
                 <button onClick={() => setOtpSent(false)} className="mb-6 text-blue-600 font-black text-xs uppercase tracking-widest flex items-center gap-1">
                   <ChevronLeft size={14} strokeWidth={3} />
                   Back to Email
                 </button>
                 <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Verify Code</h2>
                 <p className="text-gray-500 text-sm font-medium mb-8">
                   Enter the code sent to <span className="text-black font-bold">{formData.email}</span>
                 </p>

                 <div className="flex justify-between gap-2 max-w-xs mx-auto mb-10">
                   {otp.map((digit, i) => (
                     <input
                       key={i}
                       type="text"
                       maxLength={1}
                       value={digit}
                       onChange={(e) => {
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         const newOtp = [...otp];
                         newOtp[i] = val;
                         setOtp(newOtp);
                         if (val && i < 5) {
                           const next = e.target.nextElementSibling as HTMLInputElement;
                           next?.focus();
                         }
                       }}
                       className="w-11 h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl text-center font-black text-2xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
                     />
                   ))}
                 </div>

                 <button 
                   onClick={handleVerifyAndSave}
                   className="w-full py-5 bg-blue-600 text-white rounded-[28px] font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
                 >
                   Verify & Save
                 </button>

                 <p className="mt-8 text-center text-xs font-bold text-gray-400 tracking-tight">
                   Didn't receive the code? <button className="text-blue-600 uppercase underline ml-1">Resend in 1:59</button>
                 </p>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (view === 'location') {
    return (
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col">
        {renderSectionHeader("Location & Contact", 'main')}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-gray-50/30">
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-2">City</label>
              <div className="relative">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleUpdateField('city', e.target.value)}
                  placeholder="e.g. Dhaka"
                  className="w-full py-4 pl-14 pr-6 bg-gray-50 rounded-[24px] font-bold text-lg outline-none"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-2">Country</label>
              <div className="relative">
                <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleUpdateField('country', e.target.value)}
                  placeholder="e.g. Bangladesh"
                  className="w-full py-4 pl-14 pr-6 bg-gray-50 rounded-[24px] font-bold text-lg outline-none"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-2">Phone</label>
              <div className="relative">
                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleUpdateField('phone', e.target.value)}
                  placeholder="+880 1XXX-XXXXXX"
                  className="w-full py-4 pl-14 pr-6 bg-gray-50 rounded-[24px] font-bold text-lg outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'links') {
    return (
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col">
        {renderSectionHeader("Links & Social", 'main')}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-gray-50/30">
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-2">Website</label>
              <div className="relative">
                <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleUpdateField('website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full py-4 pl-14 pr-6 bg-gray-50 rounded-[24px] font-bold text-lg outline-none"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Social Links</label>
                <button 
                  onClick={() => handleUpdateField('links', [...formData.links, { title: '', url: '' }])}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest"
                >
                  + Add Link
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.links.map((link, index) => (
                  <div key={index} className="bg-gray-50 rounded-3xl p-4 space-y-3 relative group">
                    <button 
                      onClick={() => handleUpdateField('links', formData.links.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    <input
                      type="text"
                      placeholder="Title (e.g. Instagram)"
                      value={link.title}
                      onChange={(e) => {
                        const newLinks = [...formData.links];
                        newLinks[index].title = e.target.value;
                        handleUpdateField('links', newLinks);
                      }}
                      className="w-full bg-white border border-gray-100 rounded-2xl py-2 px-4 text-sm font-bold outline-none"
                    />
                    <input
                      type="url"
                      placeholder="URL (https://...)"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...formData.links];
                        newLinks[index].url = e.target.value;
                        handleUpdateField('links', newLinks);
                      }}
                      className="w-full bg-white border border-gray-100 rounded-2xl py-2 px-4 text-sm font-medium outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'professional') {
    return (
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col">
        {renderSectionHeader("Professional Info", 'main')}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-gray-50/30">
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 space-y-10">
            {/* Work */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="text-gray-400" size={16} />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Work Experience</label>
                </div>
                <button 
                  onClick={() => handleUpdateField('work', [...formData.work, ''])}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {formData.work.map((w, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      value={w}
                      onChange={(e) => {
                        const newWork = [...formData.work];
                        newWork[index] = e.target.value;
                        handleUpdateField('work', newWork);
                      }}
                      placeholder="Role at Company"
                      className="flex-1 py-4 px-6 bg-gray-50 rounded-[20px] font-bold text-sm outline-none"
                    />
                    <button 
                      onClick={() => handleUpdateField('work', formData.work.filter((_, i) => i !== index))}
                      className="p-3 bg-red-50 text-red-600 rounded-[20px]"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Education */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="text-gray-400" size={16} />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Education</label>
                </div>
                <button 
                  onClick={() => handleUpdateField('education', [...formData.education, ''])}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {formData.education.map((e, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      value={e}
                      onChange={(e) => {
                        const newEdu = [...formData.education];
                        newEdu[index] = e.target.value;
                        handleUpdateField('education', newEdu);
                      }}
                      placeholder="University or School"
                      className="flex-1 py-4 px-6 bg-gray-50 rounded-[20px] font-bold text-sm outline-none"
                    />
                    <button 
                      onClick={() => handleUpdateField('education', formData.education.filter((_, i) => i !== index))}
                      className="p-3 bg-red-50 text-red-600 rounded-[20px]"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Award className="text-gray-400" size={16} />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Skills</label>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <div key={index} className="bg-gray-50 text-gray-600 px-4 py-2 rounded-full flex items-center gap-2 border border-gray-100">
                    <span className="text-xs font-bold uppercase tracking-tight">{skill}</span>
                    <button onClick={() => handleUpdateField('skills', formData.skills.filter((_, i) => i !== index))}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.skill as HTMLInputElement;
                    if (input.value) {
                      handleUpdateField('skills', [...formData.skills, input.value]);
                      input.value = '';
                    }
                  }}
                  className="flex-1 min-w-[120px]"
                >
                  <input
                    name="skill"
                    placeholder="+ Add Skill"
                    className="w-full bg-white border-2 border-dashed border-gray-200 rounded-full px-4 py-1.5 text-xs font-bold outline-none focus:border-blue-500"
                  />
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'preview') {
    return (
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('main')} className="p-1 hover:bg-gray-100 rounded-full">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-black uppercase tracking-tight">Preview Profile</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          <div className="relative h-48 bg-gradient-to-br from-blue-600 to-indigo-700">
             {user.coverURL && <img src={user.coverURL} className="w-full h-full object-cover" />}
             <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="px-6 flex flex-col items-center -mt-16">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-xl">
               <img 
                 src={user.photoURL || `https://ui-avatars.com/api/?name=${formData.displayName}`} 
                 className="w-full h-full object-cover" 
               />
            </div>
            <div className="mt-4 text-center">
               <h2 className="text-3xl font-black tracking-tight">{formData.displayName}</h2>
               <p className="text-blue-600 font-bold">@{formData.username}</p>
               <p className="mt-4 text-gray-600 font-medium max-w-sm px-4 leading-relaxed">{formData.bio || "No bio yet."}</p>
            </div>

            <div className="mt-8 w-full border-t border-gray-100 pt-8 space-y-6 pb-20">
               <div className="flex items-center gap-4 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                  <MapPin size={16} />
                  <span>{formData.city ? `${formData.city}, ${formData.country}` : "Unspecified"}</span>
               </div>
               <div className="flex items-center gap-4 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                  <Mail size={16} />
                  <span>{formData.email}</span>
               </div>
               {formData.website && (
                  <div className="flex items-center gap-4 text-blue-600 font-bold uppercase tracking-widest text-[10px]">
                    <Globe size={16} />
                    <span className="underline">{formData.website}</span>
                  </div>
               )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// Simple spin animation for the placeholder
const Settings = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
