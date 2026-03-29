import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus, QrCode, History, ShieldCheck, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';

export default function Wallet() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'balance' | 'history'>('balance');

  const transactions = [
    { id: 1, type: 'received', amount: 500, from: 'John Doe', date: '2026-03-28 14:30', status: 'completed' },
    { id: 2, type: 'sent', amount: 200, to: 'Jane Smith', date: '2026-03-27 09:15', status: 'completed' },
    { id: 3, type: 'received', amount: 1200, from: 'Company Payout', date: '2026-03-25 18:45', status: 'completed' },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-primary px-6 pt-12 pb-8 rounded-b-[3rem] shadow-2xl">
        <div className="flex items-center justify-between text-white mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
              <WalletIcon size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tighter">OC PAY</h1>
          </div>
          <button className="p-2 bg-white/20 rounded-full backdrop-blur-md">
            <QrCode size={20} />
          </button>
        </div>

        <div className="text-white text-center">
          <p className="text-sm opacity-70 mb-1 font-bold uppercase tracking-widest">Total Balance</p>
          <h2 className="text-5xl font-black mb-6">৳ {user?.walletBalance?.toLocaleString() || '0.00'}</h2>
          
          <div className="flex justify-center gap-4">
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 bg-white text-primary rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Plus size={24} strokeWidth={3} />
              </div>
              <span className="text-[10px] font-black uppercase">Add Money</span>
            </button>
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 bg-white text-primary rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <ArrowUpRight size={24} strokeWidth={3} />
              </div>
              <span className="text-[10px] font-black uppercase">Send</span>
            </button>
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 bg-white text-primary rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <CreditCard size={24} strokeWidth={3} />
              </div>
              <span className="text-[10px] font-black uppercase">Cards</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 -mt-4">
        <div className="bg-white rounded-[2rem] shadow-xl border border-border p-6 min-h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black flex items-center gap-2">
              <History size={20} className="text-primary" />
              RECENT ACTIVITY
            </h3>
            <button className="text-xs font-bold text-primary">View All</button>
          </div>

          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border/50 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    tx.type === 'received' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {tx.type === 'received' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{tx.type === 'received' ? `From ${tx.from}` : `To ${tx.to}`}</h4>
                    <p className="text-[10px] text-muted">{tx.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-black",
                    tx.type === 'received' ? "text-green-500" : "text-red-500"
                  )}>
                    {tx.type === 'received' ? '+' : '-'} ৳{tx.amount}
                  </p>
                  <span className="text-[8px] font-bold uppercase text-muted tracking-widest">{tx.status}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold">Secure Payments</h4>
              <p className="text-[10px] text-muted">All transactions are encrypted and protected by OC-Shield.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
