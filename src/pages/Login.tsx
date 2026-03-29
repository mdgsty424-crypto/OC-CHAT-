import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { LogIn, Mail, ArrowRight, ShieldCheck, Globe, Heart, MessageCircle } from 'lucide-react';

export default function Login() {
  const { signIn } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="h-screen w-screen bg-background flex flex-col items-center justify-between p-8 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-primary rounded-b-[4rem] -z-10 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
      </div>

      {/* Top Content */}
      <div className="flex flex-col items-center mt-12 text-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6"
        >
          <span className="text-primary text-3xl font-black">OC</span>
        </motion.div>
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-black text-white tracking-tight mb-2"
        >
          Welcome Back
        </motion.h1>
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/70 text-sm max-w-[240px]"
        >
          The most premium way to connect with the people you love.
        </motion.p>
      </div>

      {/* Features Grid (Visual) */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs my-8">
        {[
          { icon: MessageCircle, label: 'Chat', color: 'text-purple-500' },
          { icon: Heart, label: 'Match', color: 'text-red-500' },
          { icon: Globe, label: 'Explore', color: 'text-blue-500' },
          { icon: ShieldCheck, label: 'Secure', color: 'text-green-500' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="bg-white p-4 rounded-3xl shadow-soft flex flex-col items-center gap-2 border border-border/50"
          >
            <item.icon className={item.color} size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{item.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="w-full max-w-xs space-y-4 mb-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={signIn}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 flex items-center justify-center gap-3 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
          <span>Continue with Google</span>
          <ArrowRight size={18} className={cn("transition-transform", isHovered ? "translate-x-1" : "")} />
        </motion.button>

        <button className="w-full py-4 bg-white text-text border border-border rounded-2xl font-bold shadow-sm flex items-center justify-center gap-3 hover:bg-border/20 transition-all">
          <Mail size={18} className="text-muted" />
          <span>Login with Email</span>
        </button>

        <div className="flex items-center justify-center gap-2 pt-4">
          <span className="text-xs text-muted">Don't have an account?</span>
          <button className="text-xs font-bold text-primary hover:underline">Sign Up</button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center opacity-30 pb-4">
        <p className="text-[8px] font-bold uppercase tracking-[0.3em]">Privacy Policy • Terms of Service</p>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
