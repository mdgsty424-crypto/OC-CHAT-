import React from 'react';
import { 
  ChevronRight, 
  ChevronLeft,
  UserCircle, 
  ShieldCheck, 
  Key,
  Users,
  Settings,
  CreditCard
} from 'lucide-react';
import { SettingsView } from './SettingsNavigator';

interface AccountCenterProps {
  onNavigate: (view: SettingsView) => void;
  onBack: () => void;
}

export default function AccountCenter({ onNavigate, onBack }: AccountCenterProps) {
  const accountSettings = [
    { id: 'personal', label: "Personal details", icon: <UserCircle size={22} />, view: 'personal_info' as SettingsView },
    { id: 'password', label: "Password and security", icon: <ShieldCheck size={22} />, view: 'password_security' as SettingsView },
    { id: 'info', label: "Your information and permissions", icon: <Key size={22} />, view: 'info_permissions' as SettingsView },
    { id: 'accounts', label: "Accounts", icon: <Users size={22} />, view: 'accounts_list' as SettingsView },
  ];

  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <img 
            src="https://res.cloudinary.com/dpk4rcz0f/image/upload/v1777297964/1000000745-removebg-preview_c6yccc.png" 
            alt="Logo" 
            className="h-6 w-auto"
            referrerPolicy="no-referrer"
          />
          <span className="text-xl font-black">Account Center</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10">
        <div className="mb-8">
          <h2 className="text-2xl font-black mb-2">Manage your account settings</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Manage your account details and security settings across OC-CHAT platforms.
          </p>
        </div>

        {/* Profiles Section */}
        <section className="mb-8">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Profiles</h3>
          <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 active:scale-[0.98] transition-transform text-left">
            <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="font-bold">Felix</div>
              <div className="text-xs text-gray-500">OC-CHAT</div>
            </div>
            <ChevronRight size={20} className="text-gray-300" />
          </button>
        </section>

        {/* Account Settings List */}
        <section className="mb-8">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Account settings</h3>
          <div className="space-y-1">
            {accountSettings.map((item) => (
              <button 
                key={item.id}
                onClick={() => onNavigate(item.view)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div className="text-gray-600">
                  {item.icon}
                </div>
                <span className="flex-1 font-bold text-sm">{item.label}</span>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            ))}
          </div>
        </section>

        {/* Security Specific section if viewed as security */}
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="text-blue-600" size={24} />
            <h4 className="font-black text-blue-900">Security Checkup</h4>
          </div>
          <p className="text-sm text-blue-700 leading-snug mb-4">
            We've detected that your password has not been changed in 6 months. Review your security settings.
          </p>
          <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-black text-xs active:scale-95 transition-transform">
            START CHECKUP
          </button>
        </div>
      </div>
    </div>
  );
}
