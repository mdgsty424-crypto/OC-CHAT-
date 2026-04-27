import React, { useState } from 'react';
import { 
  ChevronLeft,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function ChangePassword({ onBack }: { onBack: () => void }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(onBack, 2000);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-gray-50">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">Change password</h1>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {success ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-black">Password changed!</h2>
            <p className="text-gray-500">Your password has been updated across all your devices.</p>
          </div>
        ) : (
          <>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex gap-3">
              <AlertCircle className="text-blue-500 shrink-0" size={20} />
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Your password must be at least 6 characters and include a combination of numbers, letters and special characters (e.g. !$@%).
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Current password</label>
                <div className="relative">
                  <input 
                    type={showCurrent ? "text" : "password"}
                    className="w-full bg-gray-100 rounded-2xl p-4 pr-12 focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                  />
                  <button 
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">New password</label>
                <div className="relative">
                  <input 
                    type={showNew ? "text" : "password"}
                    className="w-full bg-gray-100 rounded-2xl p-4 pr-12 focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                  />
                  <button 
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Confirm new password</label>
                <div className="relative">
                  <input 
                    type={showNew ? "text" : "password"}
                    className="w-full bg-gray-100 rounded-2xl p-4 pr-12 focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg active:scale-95 transition-transform disabled:opacity-50"
              >
                {loading ? "SAVING..." : "Save password"}
              </button>
              <button 
                className="w-full mt-4 text-blue-600 font-bold text-sm"
              >
                Forgotten your password?
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
