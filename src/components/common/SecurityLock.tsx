import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Shield, Lock, Loader2, ArrowRight, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

export default function SecurityLock() {
  const { verifySecurityOTP, logout } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError(false);
    const success = await verifySecurityOTP(otp);
    if (!success) {
      setError(true);
      setLoading(false);
      setOtp('');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 text-black">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col items-center text-center space-y-8"
      >
        {/* Animated Shield */}
        <div className="relative">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
            <Lock className="text-red-600" size={48} />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-black rounded-full flex items-center justify-center animate-bounce">
            <Shield className="text-white" size={16} />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight">Suspicious Login</h1>
          <p className="text-gray-500 font-medium">A new device was detected. For your security, please enter the 6-digit verification code sent to your notification.</p>
        </div>

        {/* OTP Input */}
        <div className="w-full space-y-6">
          <div className="relative group">
            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black" size={24} />
            <input 
              type="text" 
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="000000"
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-6 pl-14 pr-6 text-3xl font-black tracking-[0.5em] text-center focus:outline-none focus:border-black transition-all"
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 font-bold"
            >
              Invalid verification code. Please try again.
            </motion.p>
          )}

          <button 
            onClick={handleVerify}
            disabled={otp.length !== 6 || loading}
            className="w-full bg-black text-white py-5 rounded-3xl font-black text-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-black/10"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : (
              <>
                Verify Security Code
                <ArrowRight size={24} />
              </>
            )}
          </button>

          <button 
            onClick={logout}
            className="text-gray-400 font-bold hover:text-black transition-colors"
          >
            Logout and secure account
          </button>
        </div>
      </motion.div>

      {/* Security Footer */}
      <div className="mt-20 flex items-center gap-2 text-gray-300">
        <Shield size={16} />
        <span className="text-xs font-bold uppercase tracking-widest">End-to-End Encrypted Protection</span>
      </div>
    </div>
  );
}
