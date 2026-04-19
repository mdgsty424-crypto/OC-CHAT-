import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <Helmet>
        <title>404 - Page Not Found | OC-CHAT</title>
      </Helmet>

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 relative inline-block">
          <div className="w-32 h-32 bg-yellow-400 rounded-[2rem] border-4 border-black flex items-center justify-center shadow-[8px_8px_0px_#000]">
            <AlertCircle size={64} strokeWidth={3} className="text-black" />
          </div>
          <div className="absolute -top-4 -right-4 bg-red-500 text-white font-black px-4 py-2 rounded-xl border-4 border-black rotate-12 shadow-[4px_4px_0px_#000]">
            404
          </div>
        </div>

        <h1 className="text-4xl font-black text-black mb-4 tracking-tighter uppercase">Oops! Page Lost.</h1>
        <p className="text-xl font-bold text-black/60 mb-10 leading-tight">
          The link you followed may be broken, or the page may have been removed.
        </p>

        <button 
          onClick={() => navigate('/')}
          className="w-full bg-black text-white rounded-[2rem] p-6 font-black text-2xl flex items-center justify-center gap-4 border-4 border-black shadow-[8px_8px_0px_#4A90E2] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
        >
          <Home size={32} strokeWidth={3} />
          BACK TO HOME
        </button>

        <div className="mt-12 flex flex-col items-center gap-2 opacity-30">
          <p className="font-black text-sm uppercase tracking-widest tracking-tighter">OC-CHAT SOCIAL NETWORK</p>
          <div className="w-12 h-1.5 bg-black rounded-full" />
        </div>
      </motion.div>
    </div>
  );
}
