import React from 'react';
import { cn } from '../../lib/utils';

interface VerifiedBadgeProps {
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className }) => {
  return (
    <div className={cn("relative inline-flex items-center justify-center overflow-hidden rounded-full", className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          <linearGradient id="pureGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFDF00" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#996515" />
          </linearGradient>
          <filter id="gold3D" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.3" />
            <feBevel in="SourceAlpha" dx="1" dy="1" stdDeviation="1" surfaceScale="2" specularConstant="1" specularExponent="10" lightingColor="#ffffff" result="bevel" />
            <feComposite in="bevel" in2="SourceAlpha" operator="in" result="bevel" />
            <feBlend in="bevel" in2="SourceGraphic" mode="screen" />
          </filter>
        </defs>
        
        {/* Rosette Shape */}
        <path
          d="M12 1.5l2.4 2.2 3.2-.8 1.2 3 2.8 1.6-1.2 3 1.2 3-2.8 1.6-1.2 3-3.2-.8-2.4 2.2-2.4-2.2-3.2.8-1.2-3-2.8-1.6 1.2-3-1.2-3 2.8-1.6 1.2-3 3.2.8L12 1.5z"
          fill="url(#pureGold)"
          filter="url(#gold3D)"
        />
        
        {/* Inner Circle for contrast */}
        <circle cx="12" cy="12" r="6.5" fill="#FFFFFF" className="drop-shadow-sm" />
        
        {/* Gold Tick Mark */}
        <path
          d="M10 14.5l-2.5-2.5 1-1 1.5 1.5 4-4 1 1-5 5z"
          fill="url(#pureGold)"
          filter="url(#gold3D)"
        />
      </svg>
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12" />
    </div>
  );
};
