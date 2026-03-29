import React from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { User } from '../../types';
import { Heart, X, MapPin, Info } from 'lucide-react';

interface SwipeCardProps {
  profile: User;
  onSwipe: (direction: 'right' | 'left') => void;
  key?: any;
}

export default function SwipeCard({ profile, onSwipe }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-50, -150], [0, 1]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <div className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl bg-white border border-border">
        {/* Profile Image */}
        <img
          src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`}
          alt={profile.displayName}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />

        {/* Swipe Indicators */}
        <motion.div 
          style={{ opacity: likeOpacity }}
          className="absolute top-10 left-10 border-4 border-green-500 rounded-xl px-4 py-2 rotate-[-20deg] z-20"
        >
          <span className="text-4xl font-black text-green-500 uppercase">LIKE</span>
        </motion.div>
        <motion.div 
          style={{ opacity: nopeOpacity }}
          className="absolute top-10 right-10 border-4 border-red-500 rounded-xl px-4 py-2 rotate-[20deg] z-20"
        >
          <span className="text-4xl font-black text-red-500 uppercase">NOPE</span>
        </motion.div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

        {/* Info Area */}
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="flex items-end gap-3 mb-2">
            <h2 className="text-3xl font-black tracking-tight">{profile.displayName}, {profile.age || 24}</h2>
            <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center mb-1">
              <Star size={14} fill="white" className="text-white" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-4 opacity-80">
            <MapPin size={16} />
            <span className="text-sm font-medium">{profile.location || 'Nearby'}</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {(profile.interests || ['Music', 'Travel', 'Coffee']).map((interest) => (
              <span key={interest} className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider">
                {interest}
              </span>
            ))}
          </div>

          <p className="text-sm line-clamp-2 opacity-90 leading-relaxed">
            {profile.bio || "No bio yet. Let's match and find out more!"}
          </p>
        </div>

        <button className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all">
          <Info size={20} />
        </button>
      </div>
    </motion.div>
  );
}

function Star({ size, fill, className }: { size: number, fill: string, className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
