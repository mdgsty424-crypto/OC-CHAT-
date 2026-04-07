import React from 'react';
import { cn } from '../../lib/utils';

interface AvatarGalleryProps {
  onSelect: (url: string) => void;
  selectedUrl?: string;
}

const AVATARS = Array.from({ length: 32 }, (_, i) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 100}`);

export const AvatarGallery: React.FC<AvatarGalleryProps> = ({ onSelect, selectedUrl }) => {
  return (
    <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2">
      {AVATARS.map((url) => (
        <button
          key={url}
          onClick={() => onSelect(url)}
          className={cn(
            "w-full aspect-square rounded-full overflow-hidden border-2 transition-all",
            selectedUrl === url ? "border-primary scale-105" : "border-transparent hover:border-border"
          )}
        >
          <img src={url} alt="Avatar" className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
};
