import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { LogIn, Mail, ArrowRight, ShieldCheck, Globe, Heart, MessageCircle, Lock, User as UserIcon, X } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-background flex flex-col items-center justify-between p-8 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-primary rounded-b-[4rem] -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
      </div>

      {/* Top Content */}
      <div className="flex flex-col items-center mt-12 text-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-24 h-24 flex items-center justify-center mb-6"
        >
          <img 
            src="https://res.cloudinary.com/dxiolmmdv/image/upload/v1774764015/1000000295-removebg-preview_pviysv.png" 
            alt="OC Chat Logo" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </motion.div>
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-black text-white tracking-tight mb-2"
        >
          OC Chat
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
      {!showEmailForm && (
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
              className="bg-surface p-4 rounded-3xl flex flex-col items-center gap-2 border border-border/50"
            >
              <item.icon className={item.color} size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{item.label}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Email Form Modal */}
      <AnimatePresence>
        {showEmailForm && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute inset-0 z-50 bg-background p-8 flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-text">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
              <button onClick={() => setShowEmailForm(false)} className="p-2 bg-surface rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-2">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-surface border border-border rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-surface border border-border rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-surface border border-border rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-500 font-medium ml-2">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="mt-auto text-center pb-8">
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm font-bold text-primary hover:underline"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Actions */}
      <div className="w-full max-w-xs space-y-4 mb-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={signInWithGoogle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
          <span>Continue with Google</span>
          <ArrowRight size={18} className={cn("transition-transform", isHovered ? "translate-x-1" : "")} />
        </motion.button>

        <button 
          onClick={() => setShowEmailForm(true)}
          className="w-full py-4 bg-surface text-text border border-border rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-border/20 transition-all"
        >
          <Mail size={18} className="text-muted" />
          <span>Login with Email</span>
        </button>

        <div className="flex items-center justify-center gap-2 pt-4">
          <span className="text-xs text-muted">By continuing, you agree to our Terms</span>
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
