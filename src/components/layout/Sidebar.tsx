import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageCircle, Phone, Users, Heart, Settings, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const navItems = [
    { icon: MessageCircle, label: 'Chats', path: '/' },
    { icon: Phone, label: 'Calls', path: '/calls' },
    { icon: Heart, label: 'People', path: '/dating' },
    { icon: Users, label: 'Groups', path: '/community' },
    { icon: Settings, label: 'Settings', path: '/profile' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 h-full bg-white border-r border-border p-6 z-50">
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
        <h1 className="text-xl font-black text-text tracking-tighter">OC Chat</h1>
      </div>

      {/* Profile Section */}
      <div className="flex items-center gap-4 mb-10 p-2 rounded-2xl bg-gray-50 border border-gray-100">
        <div className="relative">
          <img
            src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
            alt="Profile"
            className="w-12 h-12 rounded-2xl object-cover border-2 border-primary/20"
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-black text-text truncate">{user?.displayName}</h2>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Online</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          type="text"
          placeholder="Search..."
          className="w-full bg-background border border-border rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-4 ml-2">Discovery</p>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group",
                isActive 
                  ? "bg-primary text-white" 
                  : "text-muted hover:bg-background hover:text-primary"
              )
            }
          >
            <item.icon size={20} className="transition-transform group-hover:scale-110" />
            <span className="text-sm font-bold">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={logout}
        className="mt-auto flex items-center gap-4 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm"
      >
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </aside>
  );
}
