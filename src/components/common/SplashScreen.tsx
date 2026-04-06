import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export default function SplashScreen() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-primary overflow-hidden relative">
      {/* Background Decorative Elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.5, 1],
          rotate: [0, -90, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-40 -right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"
      />

      {/* Logo Container */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.2
        }}
        className="w-48 h-48 flex items-center justify-center mb-8 relative z-10"
      >
        <img 
          src="https://res.cloudinary.com/dxiolmmdv/image/upload/v1774764015/1000000295-removebg-preview_pviysv.png" 
          alt="OC Chat Logo" 
          className="w-full h-full object-contain drop-shadow-2xl animate-pulse-logo"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      {/* Text Elements */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center z-10"
      >
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">OC Chat</h1>
        <p className="text-white/60 font-medium tracking-widest uppercase text-[10px]">Connect • Match • Call</p>
      </motion.div>

      {/* Loading Indicator */}
      <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-4">
        <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
          />
        </div>
        <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Initializing Secure Session...</span>
      </div>
    </div>
  );
}
