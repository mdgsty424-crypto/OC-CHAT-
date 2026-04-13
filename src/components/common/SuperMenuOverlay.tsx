import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, PlaySquare, BarChart2, Shield, Megaphone, ShoppingCart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SuperMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SuperMenuOverlay({ isOpen, onClose }: SuperMenuOverlayProps) {
  const navigate = useNavigate();

  const menuItems = [
    { id: 'books', icon: <BookOpen size={32} />, label: 'Books', sub: 'Social Feed', color: 'bg-blue-500', route: '/books' },
    { id: 'story', icon: <PlaySquare size={32} />, label: 'Story', sub: 'Reels', color: 'bg-pink-500', route: '/story' },
    { id: 'dashboard', icon: <BarChart2 size={32} />, label: 'Dashboard', sub: 'Creator Studio', color: 'bg-purple-500', route: '/dashboard' },
    { id: 'admin', icon: <Shield size={32} />, label: 'Admin Panel', sub: 'Control Center', color: 'bg-red-500', route: '/admin' },
    { id: 'ads', icon: <Megaphone size={32} />, label: 'Ads/Promote', sub: 'Self-service', color: 'bg-yellow-500', route: '/ads' },
    { id: 'dhukan', icon: <ShoppingCart size={32} />, label: 'Dhukan', sub: 'Marketplace', color: 'bg-green-500', route: '/dhukan' },
  ];

  const handleNavigate = (route: string, openUpload: boolean = false) => {
    onClose();
    navigate(route, { state: { openUpload } });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center p-6"
        >
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleNavigate(item.route, ['books', 'story', 'ads', 'dhukan'].includes(item.id))}
                className="flex flex-col items-center justify-center gap-4 p-6 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
              >
                <div className={`w-20 h-20 rounded-2xl ${item.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <div className="text-center">
                  <h3 className="text-white font-bold text-lg">{item.label}</h3>
                  <p className="text-white/60 text-sm">{item.sub}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
