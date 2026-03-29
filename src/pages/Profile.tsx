import React, { useState, useRef } from 'react';
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
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Profile() {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const menuItems = [
    { icon: Settings, label: 'Account Settings', color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Shield, label: 'Privacy & Security', color: 'text-green-500', bg: 'bg-green-50' },
    { icon: Bell, label: 'Notifications', color: 'text-orange-500', bg: 'bg-orange-50' },
    { icon: Moon, label: 'Dark Mode', color: 'text-purple-500', bg: 'bg-purple-50', toggle: true },
    { icon: Globe, label: 'Language', color: 'text-indigo-500', bg: 'bg-indigo-50', value: 'English' },
    { icon: Heart, label: 'Dating Preferences', color: 'text-red-500', bg: 'bg-red-50' },
    { icon: HelpCircle, label: 'Help & Support', color: 'text-gray-500', bg: 'bg-gray-50' },
  ];

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
      <div className="px-6 py-8 flex flex-col items-center text-center bg-white border-b border-border shadow-soft relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-primary/5 -z-10"></div>
        
        <div className="relative mb-4">
          <div className="w-28 h-28 rounded-[2.5rem] p-1 border-4 border-primary/20 shadow-xl bg-white">
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
            className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-2xl shadow-lg border-2 border-white hover:scale-110 transition-transform active:scale-95 disabled:opacity-50"
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
              className="w-full text-center text-xl font-black bg-background border border-border rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full text-center text-sm bg-background border border-border rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
            />
            <div className="flex gap-2 justify-center">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Save
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditName(user?.displayName || '');
                  setEditBio(user?.bio || '');
                }}
                className="px-6 py-2 bg-red-50 text-red-500 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-red-100 transition-all active:scale-95"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-black text-text tracking-tight mb-1">{user?.displayName}</h2>
            <p className="text-sm text-muted font-medium mb-2">ID: {user?.uid.slice(0, 8).toUpperCase()}</p>
            {user?.bio && <p className="text-sm text-text/70 max-w-[240px] mb-4">{user.bio}</p>}
            
            <div className="flex gap-3">
              <button 
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:opacity-90 transition-all active:scale-95"
              >
                <Edit3 size={16} />
                Edit Profile
              </button>
              <button className="px-4 py-2 bg-background text-text rounded-2xl text-sm font-bold border border-border hover:bg-border transition-all active:scale-95">
                Share
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
          <div key={stat.label} className="bg-white p-4 rounded-3xl text-center shadow-soft border border-border/50">
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
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl hover:bg-border/30 transition-all active:scale-[0.99] group"
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
                <div className="w-10 h-6 bg-border rounded-full relative p-1">
                  <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              ) : (
                <ChevronRight size={18} className="text-border group-hover:text-primary transition-colors" />
              )}
            </div>
          </button>
        ))}

        <button
          onClick={logout}
          className="w-full flex items-center gap-4 p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all active:scale-[0.99] mt-6"
        >
          <div className="p-2 bg-white rounded-xl">
            <LogOut size={20} />
          </div>
          <span className="text-sm font-bold">Logout Account</span>
        </button>
      </div>

      <div className="py-10 text-center opacity-30">
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">OC Chat v1.0.0</span>
      </div>
    </main>
  );
}
