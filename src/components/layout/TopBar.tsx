import React, { useState } from 'react';
import { Search, Plus, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';
import { cn } from '../../lib/utils';
import SuperMenuOverlay from '../common/SuperMenuOverlay';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings: globalSettings } = useGlobalSettings();
  const [isSuperMenuOpen, setIsSuperMenuOpen] = useState(false);

  return (
    <>
      <header className={cn("md:hidden sticky top-0 left-0 right-0 bg-background/80 backdrop-blur-md border-b border-border py-6 px-6 flex items-center justify-between z-50", globalSettings.blurIntensity)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img 
              src="https://res.cloudinary.com/dxiolmmdv/image/upload/v1774764015/1000000295-removebg-preview_pviysv.png" 
              alt="OC Chat Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className={cn("text-xl font-black text-text tracking-tighter", globalSettings.fontFamily)}>{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/notifications')}
            className="p-2 bg-surface rounded-full hover:bg-border transition-colors relative"
          >
            <Bell size={20} className="text-muted" />
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-background rounded-full"></span>
          </button>
          <button 
            onClick={() => navigate('/search')}
            className="p-2 bg-surface rounded-full hover:bg-border transition-colors"
          >
            <Search size={20} className="text-muted" />
          </button>
          <button 
            onClick={() => setIsSuperMenuOpen(true)}
            className="p-2 bg-primary text-white rounded-full hover:opacity-90 transition-all active:scale-95"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>
      
      <SuperMenuOverlay isOpen={isSuperMenuOpen} onClose={() => setIsSuperMenuOpen(false)} />
    </>
  );
}
