import React, { useState } from 'react';
import { ChevronLeft, HardDrive, Zap, Signal, Monitor } from 'lucide-react';

export default function DataUsageSettings({ onBack }: { onBack: () => void }) {
  const [dataSaver, setDataSaver] = useState(false);
  const [videoQuality, setVideoQuality] = useState<'low' | 'medium' | 'high'>('medium');

  const qualities = [
    { id: 'low', label: 'Low', desc: 'Saves the most data', icon: <Signal size={18} /> },
    { id: 'medium', label: 'Medium', desc: 'Balanced experience', icon: <Monitor size={18} /> },
    { id: 'high', label: 'High', desc: 'Highest quality videos', icon: <Zap size={18} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-white text-black">
      <div className="flex items-center gap-4 p-4 border-b border-gray-100">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">Data usage</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {/* Data Saver Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <HardDrive className="text-blue-600" size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold">Data Saver</span>
                <span className="text-[10px] text-gray-500">Reduce data usage while browsing</span>
              </div>
            </div>
            <button 
              onClick={() => setDataSaver(!dataSaver)}
              className={`w-12 h-6 rounded-full relative transition-colors ${dataSaver ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${dataSaver ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
          <p className="px-4 text-xs text-gray-400">
            When Data Saver is on, videos won't load in high resolution and may not auto-play.
          </p>
        </section>

        {/* Video Quality Section */}
        <section className="space-y-4">
          <h3 className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Media Quality</h3>
          <div className="space-y-2">
            {qualities.map((q) => (
              <button
                key={q.id}
                onClick={() => setVideoQuality(q.id as any)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                  videoQuality === q.id 
                    ? 'border-blue-600 bg-blue-50/50' 
                    : 'border-transparent bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className={`p-2 rounded-lg ${videoQuality === q.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-400'}`}>
                    {q.icon}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{q.label}</div>
                    <div className="text-[10px] text-gray-500">{q.desc}</div>
                  </div>
                </div>
                {videoQuality === q.id && (
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
