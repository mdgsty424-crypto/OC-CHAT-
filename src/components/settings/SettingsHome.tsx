import React, { useState } from 'react';
import { 
  Search, 
  ChevronRight, 
  UserCircle, 
  ShieldCheck, 
  Lock, 
  Bell, 
  HelpCircle, 
  Trash2, 
  ChevronLeft,
  Settings,
  Info,
  Star,
  Ban,
  MessageCircle,
  AtSign,
  MessageSquare,
  Heart,
  VolumeX,
  Languages,
  HardDrive,
  Users,
  Briefcase
} from 'lucide-react';
import { SettingsView } from './SettingsNavigator';

interface SettingsHomeProps {
  onNavigate: (view: SettingsView) => void;
  onBack: () => void;
}

export default function SettingsHome({ onNavigate, onBack }: SettingsHomeProps) {
  const [search, setSearch] = useState('');

  const sections = [
    {
      title: "How you use OC-CHAT",
      items: [
        { id: 'notifications', label: "Notifications", icon: <Bell size={20} className="text-blue-500" />, view: 'notifications' as SettingsView },
        { id: 'data_usage', label: "Data usage and media quality", icon: <HardDrive size={20} className="text-blue-500" />, view: 'data_usage' as SettingsView },
      ]
    },
    {
      title: "Who can see your content",
      items: [
        { id: 'account_privacy', label: "Account Privacy", icon: <Lock size={20} className="text-teal-500" />, view: 'account_privacy' as SettingsView },
        { id: 'close_friends', label: "Close Friends", icon: <Star size={20} className="text-green-500" />, view: 'close_friends' as SettingsView },
        { id: 'blocked', label: "Blocked", icon: <Ban size={20} className="text-red-500" />, view: 'blocked' as SettingsView },
      ]
    },
    {
      title: "How others can interact with you",
      items: [
        { id: 'messages', label: "Messages and story replies", icon: <MessageCircle size={20} className="text-pink-500" />, view: 'messages_replies' as SettingsView },
        { id: 'tags', label: "Tags and mentions", icon: <AtSign size={20} className="text-orange-500" />, view: 'tags_mentions' as SettingsView },
        { id: 'comments', label: "Comments", icon: <MessageSquare size={20} className="text-purple-500" />, view: 'comments' as SettingsView },
      ]
    },
    {
      title: "What you see",
      items: [
        { id: 'favorites', label: "Favorites", icon: <Heart size={20} className="text-red-500" />, view: 'favorites' as SettingsView },
        { id: 'muted', label: "Muted accounts", icon: <VolumeX size={20} className="text-gray-500" />, view: 'muted' as SettingsView },
      ]
    },
    {
      title: "Your app and media",
      items: [
        { id: 'language', label: "Language", icon: <Languages size={20} className="text-indigo-500" />, view: 'language' as SettingsView },
      ]
    },
    {
      title: "For families",
      items: [
        { id: 'supervision', label: "Supervision", icon: <Users size={20} className="text-blue-400" />, view: 'home' as SettingsView },
      ]
    },
    {
      title: "Professional",
      items: [
        { id: 'prof_account', label: "Account type and tools", icon: <Briefcase size={20} className="text-yellow-600" />, view: 'professional' as SettingsView },
      ]
    },
    {
      title: "More info and support",
      items: [
        { id: 'help', label: "Help", icon: <HelpCircle size={20} className="text-gray-500" />, view: 'help' as SettingsView },
        { id: 'about', label: "About", icon: <Info size={20} className="text-gray-500" />, view: 'about' as SettingsView },
      ]
    },
    {
      title: "Danger Zone",
      items: [
        { id: 'danger', label: "Account Actions", icon: <Trash2 size={20} className="text-red-600" />, view: 'danger_zone' as SettingsView },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 text-black">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-black">Settings & Privacy</h1>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search settings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {/* Account Center Meta Card */}
        <div className="p-4">
          <div 
            onClick={() => onNavigate('account_center')}
            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <img 
                src="https://res.cloudinary.com/dpk4rcz0f/image/upload/v1777297964/1000000745-removebg-preview_c6yccc.png" 
                alt="Logo" 
                className="h-6 w-auto"
                referrerPolicy="no-referrer"
              />
            </div>
            <h2 className="text-lg font-black mb-1">Account Center</h2>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">Manage your connected experiences and account settings across OC-CHAT platforms.</p>
            
            <div className="space-y-3">
              <button 
                onClick={(e) => { e.stopPropagation(); onNavigate('personal_info'); }}
                className="flex items-center gap-3 text-sm font-bold text-gray-700 hover:text-black w-full"
              >
                <UserCircle size={18} />
                <span>Personal details</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onNavigate('password_security'); }}
                className="flex items-center gap-3 text-sm font-bold text-gray-700 hover:text-black w-full"
              >
                <ShieldCheck size={18} />
                <span>Password and security</span>
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-50 text-blue-600 text-xs font-black flex items-center justify-between">
              SEE MORE IN ACCOUNT CENTER
              <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* Categories */}
        {sections.map((section, idx) => (
          <div key={idx} className="mt-4">
            <h3 className="px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              {section.title}
            </h3>
            <div className="bg-white border-y border-gray-100">
              {section.items.map((item, i) => (
                <button 
                  key={item.id}
                  onClick={() => onNavigate(item.view)}
                  className={`w-full flex items-center gap-4 px-6 py-4 text-left active:bg-gray-50 transition-colors ${i !== section.items.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <div className="p-2 rounded-lg bg-gray-50">
                    {item.icon}
                  </div>
                  <span className="flex-1 font-bold text-sm">{item.label}</span>
                  <ChevronRight size={18} className="text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
