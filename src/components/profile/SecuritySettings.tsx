import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  MapPin, 
  Monitor, 
  Smartphone, 
  Clock, 
  LogOut, 
  ChevronLeft,
  Loader2,
  Lock,
  Smartphone as PhoneIcon,
  Globe
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getActiveSessions, logoutAllDevices, SessionInfo } from '../../lib/security';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export default function SecuritySettings({ onBack }: { onBack: () => void }) {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadSessions = async () => {
      const data = await getActiveSessions(user.uid);
      setSessions(data);
      setLoading(false);
    };
    loadSessions();
  }, [user]);

  const handleLogoutAll = async () => {
    if (!user || !window.confirm('Are you sure you want to log out from all other devices?')) return;
    setIsLoggingOutAll(true);
    try {
      const currentSession = sessions.find(s => s.isCurrent);
      await logoutAllDevices(user.uid, currentSession?.deviceId);
      const data = await getActiveSessions(user.uid);
      setSessions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black">Security & Login</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-24">
        {/* Verification Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest pl-2">Security Checklist</h3>
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex items-center gap-4">
            <div className="p-4 bg-blue-600 rounded-2xl">
              <Shield className="text-white" size={32} />
            </div>
            <div>
              <h4 className="font-black text-blue-900">Your account is safe</h4>
              <p className="text-sm text-blue-700">We constantly monitor for suspicious logins to keep your data protected.</p>
            </div>
          </div>
        </section>

        {/* Active Sessions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Where you're logged in</h3>
            <button 
              onClick={handleLogoutAll}
              disabled={isLoggingOutAll || sessions.length <= 1}
              className="text-red-500 font-black text-sm disabled:opacity-50"
            >
              Logout all
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-gray-300" size={32} />
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4 border border-gray-100">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    {session.deviceName === 'Mobile Device' ? <Smartphone size={24} /> : <Monitor size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold truncate">{session.deviceName}</span>
                      {session.isCurrent && (
                        <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">Current</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} />
                      {session.city}, {session.country} • {session.ip}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      Last active: {session.lastActive ? formatDistanceToNow(session.lastActive.toDate(), { addSuffix: true }) : 'Just now'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Advance Settings */}
        <section className="space-y-4">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest pl-2">Extra Security</h3>
          <div className="space-y-2">
            <div className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left rounded-2xl border border-gray-100">
              <div className="p-2 rounded-full bg-orange-50 text-orange-600">
                <Smartphone size={20} />
              </div>
              <div className="flex-1">
                <div className="font-bold">Two-Factor Authentication</div>
                <div className="text-xs text-gray-500">Require code for sensitive actions</div>
              </div>
              <div className="w-12 h-6 bg-gray-200 rounded-full relative">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>

            <div className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left rounded-2xl border border-gray-100">
              <div className="p-2 rounded-full bg-purple-50 text-purple-600">
                <Globe size={20} />
              </div>
              <div className="flex-1">
                <div className="font-bold">Login Alerts</div>
                <div className="text-xs text-gray-500">Notify me about new device logins</div>
              </div>
              <div className="w-12 h-6 bg-green-500 rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {isLoggingOutAll && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-red-600" size={48} />
            <p className="font-black">Securing your account...</p>
          </div>
        </div>
      )}
    </div>
  );
}
