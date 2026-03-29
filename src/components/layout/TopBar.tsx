import React from 'react';
import { Search, Plus, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { user } = useAuth();

  return (
    <header className="md:hidden sticky top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-border py-4 px-6 flex items-center justify-between z-50">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
            alt="Profile"
            className="w-10 h-10 rounded-full border-2 border-primary/20 object-cover"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        <h1 className="text-2xl font-bold text-text tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 bg-background rounded-full hover:bg-border transition-colors">
          <Search size={20} className="text-muted" />
        </button>
        <button className="p-2 bg-primary text-white rounded-full shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95">
          <Plus size={20} />
        </button>
      </div>
    </header>
  );
}
