import React, { useState } from 'react';
import { ChevronLeft, MessageCircle, AtSign, MessageSquare, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

type InteractionType = 'messages' | 'tags' | 'comments';

interface InteractionSettingsProps {
  type: InteractionType;
  onBack: () => void;
}

export default function InteractionSettings({ type, onBack }: InteractionSettingsProps) {
  const [selected, setSelected] = useState('everyone');
  const [aiFilter, setAiFilter] = useState(true);

  const config = {
    messages: {
      title: 'Messages and Replies',
      icon: <MessageCircle className="text-pink-600" />,
      desc: 'Control who can send you messages and replies to your stories.',
      options: [
        { id: 'everyone', label: 'Everyone', desc: 'Anyone can send you message requests' },
        { id: 'followed', label: 'People you follow', desc: 'Only accounts you follow can message you' },
        { id: 'followers', label: 'Followers', desc: 'Your followers can send you message requests' },
        { id: 'none', label: 'No one', desc: 'Disable all new message requests' },
      ]
    },
    tags: {
      title: 'Tags and Mentions',
      icon: <AtSign className="text-orange-600" />,
      desc: 'Choose who can tag or mention you in their content.',
      options: [
        { id: 'everyone', label: 'Everyone', desc: 'Anyone can tag or mention you' },
        { id: 'followed', label: 'People you follow', desc: 'Only people you follow can tag or mention you' },
        { id: 'none', label: 'No one', desc: 'Disable tags and mentions from everyone' },
      ]
    },
    comments: {
      title: 'Comments',
      icon: <MessageSquare className="text-purple-600" />,
      desc: 'Manage who can comment on your posts and how they are filtered.',
      options: [
        { id: 'everyone', label: 'Everyone', desc: 'Anyone can comment on your posts' },
        { id: 'followers', label: 'Followers', desc: 'Only your followers can comment' },
        { id: 'none', label: 'No one', desc: 'Disable all comments on your posts' },
      ]
    }
  }[type];

  return (
    <div className="flex flex-col h-full bg-white text-black">
      <div className="flex items-center gap-4 p-4 border-b border-gray-100">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">{config.title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        <div className="px-2">
          <p className="text-sm text-gray-500 leading-relaxed italic">{config.desc}</p>
        </div>

        <div className="space-y-2">
          <h3 className="px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Allow access from</h3>
          {config.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                selected === opt.id 
                  ? 'border-blue-600 bg-blue-50/50' 
                  : 'border-transparent bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-bold text-sm">{opt.label}</span>
                <span className="text-[10px] text-gray-400">{opt.desc}</span>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 ${selected === opt.id ? 'border-blue-600 bg-blue-600' : 'border-gray-200'}`}>
                {selected === opt.id && <div className="m-1 w-2 h-2 bg-white rounded-full" />}
              </div>
            </button>
          ))}
        </div>

        {type === 'comments' && (
          <section className="space-y-4">
            <h3 className="px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Advanced Filtering</h3>
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Sparkles className="text-purple-600" size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">AI Content Filter</span>
                    <span className="text-[10px] text-purple-600 font-medium">Auto-hide offensive comments</span>
                  </div>
                </div>
                <button 
                  onClick={() => setAiFilter(!aiFilter)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${aiFilter ? 'bg-purple-600' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${aiFilter ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <p className="text-[10px] text-purple-800/70 leading-relaxed font-medium">
                Our AI analyzes comments in real-time to hide content that might be offensive or spammy. This works automatically in English, Bangla, and Hindi.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
