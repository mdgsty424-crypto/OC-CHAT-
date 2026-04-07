import React, { useEffect } from 'react';
import { motion } from 'motion/react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="h-screen w-screen gradient-wave flex flex-col items-center justify-center relative overflow-hidden">
      {/* Top wave */}
      <div className="absolute top-0 w-full h-[120px] bg-[#5f2c82] rounded-b-[80px]" />

      {/* Logo container */}
      <div className="text-center z-10">
        <motion.img 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          src="https://res.cloudinary.com/dxiolmmdv/image/upload/v1775542629/1000000366-removebg-preview_qkffmo.png" 
          alt="logo"
          className="w-[110px] h-[110px] rounded-[25px] shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
          referrerPolicy="no-referrer"
        />
        <div className="mt-2.5 text-2xl tracking-[6px] animate-pulse text-white">•••</div>
      </div>

      {/* Bottom blob */}
      <div className="absolute -bottom-[60px] -right-[60px] w-[220px] h-[220px] bg-[#ff4b8b] rounded-full blur-[10px]" />
    </div>
  );
}
