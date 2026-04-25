import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageCircle, Phone, Users, Heart, Settings, Search, LogOut, Shield, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { settings: globalSettings } = useGlobalSettings();

  const navItems = [
    { icon: MessageCircle, label: 'Chats', path: '/' },
    { icon: Phone, label: 'Calls', path: '/calls' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Heart, label: 'People', path: '/dating' },
    { icon: Users, label: 'Groups', path: '/community' },
    { icon: Settings, label: 'Settings', path: '/profile' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }

  return (
    <aside className={cn("hidden md:flex flex-col w-72 h-full bg-background/80 backdrop-blur-md border-r border-border p-6 z-50", globalSettings.blurIntensity)}>
      {/* Logo Section */}
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 flex items-center justify-center">
          <img 
            src="https://res.cloudinary.com/dxiolmmdv/image/upload/v1774764015/1000000295-removebg-preview_pviysv.png" 
            alt="OC Chat Logo" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className={cn("text-xl font-black text-text tracking-tighter", globalSettings.fontFamily)}>OC Chat</h1>
      </div>

      {/* Profile Section */}
      <div className={cn("flex items-center gap-4 mb-10 p-2 rounded-2xl bg-surface border border-border", globalSettings.borderRadius)}>
        <div className="relative">
          <img
            src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
            alt="Profile"
            className={cn("rounded-2xl object-cover border-2 border-primary/20", globalSettings.profileSize)}
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={cn("text-sm font-black text-text truncate", globalSettings.userNameSize, globalSettings.fontWeight, globalSettings.fontFamily)}>{user?.displayName}</h2>
          <p className={cn("text-[10px] font-bold text-muted uppercase tracking-widest", globalSettings.fontFamily)}>Online</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          type="text"
          placeholder="Search..."
          className={cn("w-full bg-background border border-border rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all", globalSettings.fontFamily)}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        <p className={cn("text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-4 ml-2", globalSettings.fontFamily)}>Discovery</p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group",
                isActive 
                  ? "bg-primary text-white" 
                  : "text-muted hover:bg-surface hover:text-primary",
                globalSettings.borderRadius
              )
            }
          >
            <item.icon size={20} className="transition-transform group-hover:scale-110" />
            <span className={cn("text-sm font-bold", globalSettings.fontFamily)}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={logout}
        className={cn("mt-auto flex items-center gap-4 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm", globalSettings.fontFamily, globalSettings.borderRadius)}
      >
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </aside>
  );
}
