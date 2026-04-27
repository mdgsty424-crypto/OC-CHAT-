import React, { useState } from 'react';
import { 
  ChevronLeft,
  AlertTriangle,
  Lock,
  ChevronRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';

export default function DangerZone({ onBack }: { onBack: () => void }) {
  const { logout } = useAuth();
  const [confirmView, setConfirmView] = useState<'none' | 'deactivate' | 'delete'>('none');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      logout();
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-gray-50">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">Danger Zone</h1>
      </div>

      <div className="flex-1 p-6 space-y-8">
        <div className="p-6 bg-red-50 rounded-3xl border border-red-100 flex flex-col items-center text-center space-y-4">
           <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={32} />
           </div>
           <div className="space-y-1">
              <h2 className="text-xl font-black text-red-900">Handle with Care</h2>
              <p className="text-sm text-red-700 font-medium leading-relaxed">
                 These actions are permanent or can significantly limit your account access. Please proceed with extreme caution.
              </p>
           </div>
        </div>

        <div className="space-y-3">
           <button 
             onClick={() => setConfirmView('deactivate')}
             className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all text-left group"
           >
              <div>
                 <div className="font-bold">Deactivate account</div>
                 <div className="text-xs text-gray-400 group-hover:text-red-400">Temporary disable your profile</div>
              </div>
              <ChevronRight size={20} className="text-gray-300" />
           </button>

           <button 
             onClick={() => setConfirmView('delete')}
             className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-2xl hover:bg-red-600 hover:text-white transition-all text-left shadow-sm group"
           >
              <div>
                 <div className="font-bold">Delete account</div>
                 <div className="text-xs text-gray-400 group-hover:text-red-200">Permanently remove all your data</div>
              </div>
              <ShieldAlert size={20} className="text-gray-300 group-hover:text-white" />
           </button>
        </div>
      </div>

      <AnimatePresence>
        {confirmView !== 'none' && (
          <motion.div 
             initial={{ y: '100%' }}
             animate={{ y: 0 }}
             exit={{ y: '100%' }}
             className="fixed inset-0 bg-white z-[150] flex flex-col p-6 space-y-8"
          >
             <div className="flex justify-center">
                <div className="w-12 h-1 bg-gray-200 rounded-full" />
             </div>

             <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center">
                   <Lock size={40} />
                </div>
                <div className="space-y-2">
                   <h2 className="text-2xl font-black uppercase tracking-tight">Security Confirmation</h2>
                   <p className="text-gray-500 font-medium">To {confirmView} your account, please enter your password to confirm identity.</p>
                </div>

                <div className="w-full space-y-4">
                   <input 
                     type="password" 
                     placeholder="Password"
                     className="w-full bg-gray-100 rounded-2xl p-4 font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-600"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                   />
                   <button 
                     onClick={handleAction}
                     disabled={!password || loading}
                     className="w-full bg-red-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
                   >
                      {loading ? <Loader2 className="animate-spin mx-auto" /> : `CONFIRM ${confirmView.toUpperCase()}`}
                   </button>
                   <button 
                     onClick={() => setConfirmView('none')}
                     className="text-gray-400 font-bold hover:text-black transition-colors"
                   >
                      Cancel action
                   </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
