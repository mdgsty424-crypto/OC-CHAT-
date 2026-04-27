import React, { useState, useEffect } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const languages = [
  { id: 'en', name: 'English', native: 'English' },
  { id: 'bn', name: 'Bangla', native: 'বাংলা' },
  { id: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { id: 'es', name: 'Spanish', native: 'Español' },
  { id: 'fr', name: 'French', native: 'Français' },
  { id: 'ar', name: 'Arabic', native: 'العربية' },
];

export default function LanguageSettings({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(user?.language || 'en');

  useEffect(() => {
    if (user?.language) {
      setSelected(user.language);
    }
  }, [user?.language]);

  const handleSelect = async (langId: string) => {
    setSelected(langId);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          language: langId
        });
      } catch (e) {
        console.error("Error updating language:", e);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-black">
      <div className="flex items-center gap-4 p-4 border-b border-gray-100">
        <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black">Language</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-1">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider px-2 mb-4">Suggested</p>
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => handleSelect(lang.id)}
              className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="flex flex-col items-start">
                <span className="font-bold">{lang.native}</span>
                <span className="text-xs text-gray-500">{lang.name}</span>
              </div>
              {selected === lang.id && (
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-8 text-center border-t border-gray-50">
          <p className="text-xs text-gray-400">
            When you select a language, parts of your experience will be translated immediately. Some features may still appear in English.
          </p>
        </div>
      </div>
    </div>
  );
}
