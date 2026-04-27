import React from 'react';
import { 
  ChevronRight, 
  ChevronLeft,
  Key, 
  ShieldCheck, 
  Eye,
  Smartphone,
  Monitor
} from 'lucide-react';
import { SettingsView } from './SettingsNavigator';

interface PasswordSecurityProps {
  onNavigate: (view: SettingsView) => void;
  onBack: () => void;
}

export default function PasswordSecurity({ onNavigate, onBack }: PasswordSecurityProps) {
  const securityItems = [
    { id: 'change_password', label: "Change Password", icon: <Key size={22} />, view: 'change_password' as SettingsView },
    { id: '2fa', label: "Two-Factor Authentication", icon: <ShieldCheck size={22} />, view: 'two_factor' as SettingsView },
    { id: 'login_activity', label: "Login Activity", icon: <Monitor size={22} />, view: 'login_activity' as SettingsView },
    { id: 'saved_login', label: "Saved Login", icon: <Smartphone size={22} />, view: 'home' as SettingsView },
  ];

  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 sticky top-0 bg-white z-10 border-b border-gray-50">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">Password and security</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 mt-6">
        <section className="mb-8">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Login & Recovery</h3>
          <div className="space-y-1">
            {securityItems.map((item) => (
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

        <section className="mb-8">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Security Checks</h3>
          <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 active:scale-[0.98] transition-transform text-left">
            <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
               <Eye size={24} />
            </div>
            <div className="flex-1">
              <div className="font-bold">Security Checkup</div>
              <div className="text-xs text-gray-500 font-medium">Review your security settings to help keep your account safe.</div>
            </div>
            <ChevronRight size={20} className="text-gray-300" />
          </button>
        </section>
      </div>
    </div>
  );
}
