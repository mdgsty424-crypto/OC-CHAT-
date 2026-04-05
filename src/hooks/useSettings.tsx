import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { translations, Language } from '../lib/translations';

type Theme = 'light' | 'dark';

interface SettingsContextType {
  theme: Theme;
  language: Language;
  isMuted: boolean;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  toggleMute: () => void;
  t: (path: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Initialize from localStorage for instant load
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });
  
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('isMuted');
    return saved === 'true';
  });

  // Sync with user preferences when user loads
  useEffect(() => {
    if (user?.preferences) {
      if (user.preferences.theme && user.preferences.theme !== theme) {
        setTheme(user.preferences.theme as Theme);
        localStorage.setItem('theme', user.preferences.theme);
      }
      if (user.preferences.language && user.preferences.language !== language) {
        setLanguageState(user.preferences.language as Language);
        localStorage.setItem('language', user.preferences.language);
      }
      if (user.preferences.isMuted !== undefined && user.preferences.isMuted !== isMuted) {
        setIsMuted(user.preferences.isMuted);
        localStorage.setItem('isMuted', String(user.preferences.isMuted));
      }
    }
  }, [user?.uid, user?.preferences?.theme, user?.preferences?.language, user?.preferences?.isMuted]);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply language to localStorage
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Apply mute to localStorage
  useEffect(() => {
    localStorage.setItem('isMuted', String(isMuted));
  }, [isMuted]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          'preferences.theme': newTheme
        });
      } catch (error) {
        console.error("Error updating theme preference:", error);
      }
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          'preferences.language': lang
        });
      } catch (error) {
        console.error("Error updating language preference:", error);
      }
    }
  };

  const toggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          'preferences.isMuted': newMuted
        });
      } catch (error) {
        console.error("Error updating mute preference:", error);
      }
    }
  };

  // Simple translation helper
  const t = (path: string) => {
    const keys = path.split('.');
    let result: any = translations[language];
    
    for (const key of keys) {
      if (result && result[key]) {
        result = result[key];
      } else {
        return path; // Fallback to path if not found
      }
    }
    
    return typeof result === 'string' ? result : path;
  };

  return (
    <SettingsContext.Provider value={{ theme, language, isMuted, toggleTheme, setLanguage, toggleMute, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
