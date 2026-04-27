import React, { useState } from 'react';
import { 
  ChevronLeft,
  User,
  AtSign,
  Mail,
  Phone,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';

export default function PersonalInfo({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showOTP, setShowOTP] = useState(false);

  const fields = [
    { id: 'name', label: "Name", value: user?.displayName || 'Set Name', icon: <User size={20} /> },
    { id: 'username', label: "Username", value: user?.uid?.slice(0, 8) || 'Not set', icon: <AtSign size={20} /> },
    { id: 'email', label: "Email", value: user?.email || 'Not set', icon: <Mail size={20} /> },
    { id: 'phone', label: "Phone", value: "+880 1XXX-XXXXXX", icon: <Phone size={20} /> },
  ];

  const handleEdit = (id: string) => {
    if (id === 'email') {
      setShowOTP(true);
    } else {
      setEditingField(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 sticky top-0 bg-white z-10 border-b border-gray-50">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">Personal details</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mb-6 px-2">
          <p className="text-sm text-gray-500">OC-CHAT uses this info to verify your identity and keep our community safe. You decide what more info you want to provide.</p>
        </div>

        <div className="space-y-4">
          {fields.map((field) => (
            <button 
              key={field.id}
              onClick={() => handleEdit(field.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-[0.99] transition-all text-left"
            >
              <div className="text-gray-400">
                {field.icon}
              </div>
              <div className="flex-1">
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest">{field.label}</div>
                <div className="font-bold">{field.value}</div>
              </div>
              <div className="text-blue-600 font-black text-xs">EDIT</div>
            </button>
          ))}
        </div>
      </div>

      {/* OTP Overlay for Email Change */}
      <AnimatePresence>
        {showOTP && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[110] flex flex-col"
          >
            <div className="p-4 flex items-center gap-4">
              <button onClick={() => setShowOTP(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <ChevronLeft size={24} />
              </button>
              <h1 className="text-xl font-black">Verify your email</h1>
            </div>
            
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-8">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600">
                <Mail size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black">Check your email</h2>
                <p className="text-gray-500">We've sent a 6-digit code to your current email to verify it's you.</p>
              </div>
              
              <div className="w-full max-w-xs">
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="000000"
                  className="w-full bg-gray-100 rounded-2xl py-4 text-3xl font-black text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button 
                  onClick={() => setShowOTP(false)}
                  className="w-full bg-black text-white py-4 rounded-2xl font-black mt-6 shadow-xl shadow-black/10 active:scale-95 transition-transform"
                >
                  Verify & Continue
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
