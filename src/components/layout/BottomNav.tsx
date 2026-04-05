import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageCircle, Phone, Sparkles, Users, User, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const { user } = useAuth();
  const items = [
    { icon: MessageCircle, label: 'Chats', path: '/' },
    { icon: Phone, label: 'Calls', path: '/calls' },
    { icon: Sparkles, label: 'Discover', path: '/discovery' },
    { icon: Users, label: 'Community', path: '/community' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  if (user?.role === 'admin') {
    items.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }

  return (
    <nav className="md:hidden absolute bottom-0 left-0 right-0 w-full glass-3d border-t border-border flex justify-around items-center py-2 px-4 z-50">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 p-2 transition-all duration-300",
              isActive ? "text-primary" : "text-muted hover:text-primary/70"
            )
          }
        >
          {({ isActive }) => (
            <motion.div
              whileHover={{ scale: 1.15, y: -5 }}
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "drop-shadow-md" : ""} />
              <span className="text-[10px] font-extrabold uppercase tracking-wider mt-1">{item.label}</span>
            </motion.div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
