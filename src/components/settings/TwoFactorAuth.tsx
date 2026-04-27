import React, { useState } from 'react';
import { 
  ChevronLeft,
  ShieldCheck,
  MessageSquare,
  Smartphone,
  Key,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TwoFactorAuth({ onBack }: { onBack: () => void }) {
  const [method, setMethod] = useState<'none' | 'sms' | 'app'>('none');
  const [step, setStep] = useState<'main' | 'enable'>('main');

  const methods = [
    { 
      id: 'app', 
      label: "Authentication app", 
      desc: "Use an app like Google Authenticator or Duo Mobile to generate codes.",
      icon: <ShieldCheck size={24} className="text-blue-500" /> 
    },
    { 
      id: 'sms', 
      label: "Text message (SMS)", 
      desc: "Use text messages to receive verification codes.",
      icon: <MessageSquare size={24} className="text-teal-500" /> 
    },
    { 
      id: 'security', 
      label: "Security keys", 
      desc: "Use a physical security key to protect your account.",
      icon: <Key size={24} className="text-orange-500" /> 
    }
  ];

  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-gray-50">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">Two-factor authentication</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="text-center mb-10 space-y-4">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mx-auto shadow-sm">
             <ShieldCheck size={40} />
          </div>
          <div className="space-y-1 px-4">
            <h2 className="text-xl font-black leading-tight">Add extra security to your account</h2>
            <p className="text-sm text-gray-500 leading-relaxed font-medium">
              We'll ask for a login code if we see an attempted login from a device or browser we don't recognize.
            </p>
          </div>
        </div>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 leading-none">Choose your security method</h3>
          
          <div className="space-y-3">
            {methods.map((m) => (
              <button 
                key={m.id}
                onClick={() => {
                  setMethod(m.id as any);
                  setStep('enable');
                }}
                className="w-full flex items-start gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all text-left border border-gray-50"
              >
                <div className="mt-1">{m.icon}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm mb-0.5">{m.label}</div>
                  <div className="text-xs text-gray-500 leading-relaxed font-medium">{m.desc}</div>
                </div>
                <ChevronRight size={18} className="text-gray-300 mt-1" />
              </button>
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {step === 'enable' && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-[120] flex flex-col"
          >
             <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <button onClick={() => setStep('main')} className="p-2 hover:bg-gray-100 rounded-full font-bold">Cancel</button>
                <span className="font-black">Backup Codes</span>
                <div className="w-10" />
             </div>

             <div className="flex-1 p-8 text-center space-y-8 overflow-y-auto">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto">
                   <CheckCircle2 size={32} />
                </div>
                <div className="space-y-2">
                   <h2 className="text-2xl font-black">2FA is Enabled</h2>
                   <p className="text-sm text-gray-500 font-medium">Save these backup codes in a safe place. You can use them to log in if you lose access to your {method === 'sms' ? 'phone' : 'auth app'}.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   {['8372 1928', '9912 0038', '2219 4482', '5510 3928', '1102 9983', '4401 2291'].map(code => (
                     <div key={code} className="bg-gray-50 p-4 rounded-xl font-mono font-bold text-lg">{code}</div>
                   ))}
                </div>

                <button className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-black text-sm">
                   COPY CODES
                </button>

                <button 
                  onClick={() => onBack()}
                  className="w-full bg-black text-white py-4 rounded-2xl font-black shadow-xl shadow-black/10"
                >
                   Done
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
