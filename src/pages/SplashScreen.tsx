import React from 'react';
import { motion } from 'motion/react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#001F3F] to-[#003366] flex flex-col items-center justify-center z-[9999]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: [0.8, 1.1, 1],
          opacity: 1 
        }}
        transition={{ 
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-6">
          <span className="text-4xl font-black text-[#001F3F]">OC</span>
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-white">OC CHAT</h1>
        <p className="text-white/50 text-sm mt-2 font-medium tracking-widest uppercase">Prothom Protikhya</p>
      </motion.div>
      
      <div className="absolute bottom-12">
        <div className="flex gap-1.5">
          <motion.div 
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            className="w-2 h-2 bg-white rounded-full" 
          />
          <motion.div 
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            className="w-2 h-2 bg-white rounded-full" 
          />
          <motion.div 
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            className="w-2 h-2 bg-white rounded-full" 
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
