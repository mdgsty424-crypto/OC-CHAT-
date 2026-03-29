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
        <div className="w-8 h-8 flex items-center justify-center">
          <img 
            src="https://res.cloudinary.com/dxiolmmdv/image/upload/v1774764015/1000000295-removebg-preview_pviysv.png" 
            alt="OC Chat Logo" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-xl font-black text-text tracking-tighter">{title}</h1>
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
