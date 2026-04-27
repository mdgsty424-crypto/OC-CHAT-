import React, { useState } from 'react';
import { ChevronLeft, Briefcase, TrendingUp, Presentation, HelpCircle, BarChart3, Users, Globe, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProfessionalAccountSettings({ onBack }: { onBack: () => void }) {
  const [accountType, setAccountType] = useState<'personal' | 'creator' | 'business'>('personal');
  const [showSwitch, setShowSwitch] = useState(false);
  const [pendingType, setPendingType] = useState<'personal' | 'creator' | 'business' | null>(null);

  const stats = [
    { label: 'Accounts reached', value: '12.4K', change: '+14%', icon: <BarChart3 className="text-blue-500" /> },
    { label: 'Total followers', value: '8.2K', change: '+2.1%', icon: <Users className="text-purple-500" /> },
    { label: 'Profile visits', value: '2.1K', change: '+8%', icon: <Globe className="text-teal-500" /> },
  ];

  const tools = [
    { id: 'insights', label: 'Insights', desc: 'See how your content is performing', icon: <TrendingUp /> },
    { id: 'promotions', label: 'Ad Tools', desc: 'Boost your posts reach', icon: <Presentation /> },
    { id: 'help', label: 'Creator Support', desc: 'Get help with your account', icon: <HelpCircle /> },
  ];

  const handleSwitchRequest = (type: 'personal' | 'creator' | 'business') => {
    if (type === accountType) return;
    setPendingType(type);
    setShowSwitch(true);
  };

  const confirmSwitch = () => {
    if (pendingType) {
      setAccountType(pendingType);
      setShowSwitch(false);
      setPendingType(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-black">
      <div className="flex items-center gap-4 p-4 border-b border-gray-100">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">Professional</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {/* Insights Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Insights Overview</h3>
            <span className="text-[10px] text-blue-600 font-bold">Last 30 days</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
             {stats.map((stat, i) => (
               <div key={i} className="p-4 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm">{stat.icon}</div>
                    <span className="text-[10px] font-bold text-gray-500">{stat.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black">{stat.value}</span>
                    <span className="text-[10px] font-black text-green-500">{stat.change}</span>
                  </div>
               </div>
             ))}
          </div>
        </section>

        {/* Tools Section */}
        <section className="space-y-4">
          <h3 className="px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Professional Tools</h3>
          <div className="space-y-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-black/5 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-blue-600">
                    {tool.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{tool.label}</span>
                    <span className="text-[10px] text-gray-400">{tool.desc}</span>
                  </div>
                </div>
                <ArrowRight size={18} className="text-gray-300" />
              </button>
            ))}
          </div>
        </section>

        {/* Account Type Section */}
        <section className="space-y-4">
          <h3 className="px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Type</h3>
          <div className="flex p-1 bg-gray-100 rounded-2xl">
            {(['personal', 'creator', 'business'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleSwitchRequest(type)}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all capitalize ${
                  accountType === type 
                    ? 'bg-white shadow-sm scale-[1.02]' 
                    : 'text-gray-400 hover:text-gray-500'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <p className="px-2 text-[10px] text-gray-400 text-center leading-relaxed italic">
            Switching account types may change the tools and insights available to you.
          </p>
        </section>
      </div>

      {/* Switch Confirmation */}
      <AnimatePresence>
        {showSwitch && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="text-blue-600" size={32} />
                </div>
                <h3 className="text-xl font-black mb-2 uppercase">Switch Account?</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to switch to a <span className="font-bold text-black uppercase">{pendingType}</span> account? This will update your features and profile tools.
                </p>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={confirmSwitch}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl active:scale-[0.98] transition-transform"
                  >
                    Switch to {pendingType}
                  </button>
                  <button 
                    onClick={() => setShowSwitch(false)}
                    className="w-full py-3 font-bold text-gray-400 hover:text-black transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
