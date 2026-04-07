import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface GlobalSettings {
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  userNameSize: string;
  blurIntensity: string;
  borderRadius: string;
  profileSize: string;
  storyCircleSize: string;
}

const defaultSettings: GlobalSettings = {
  fontSize: 'text-sm',
  fontWeight: 'font-medium',
  fontFamily: 'font-sans',
  userNameSize: 'text-base',
  blurIntensity: 'backdrop-blur-md',
  borderRadius: 'rounded-2xl',
  profileSize: 'w-12 h-12',
  storyCircleSize: 'w-16 h-16',
};

interface GlobalSettingsContextType {
  settings: GlobalSettings;
  updateSettings: (newSettings: Partial<GlobalSettings>) => Promise<void>;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextType>({
  settings: defaultSettings,
  updateSettings: async () => {},
});

export const useGlobalSettings = () => useContext(GlobalSettingsContext);

export const GlobalSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ ...defaultSettings, ...docSnap.data() } as GlobalSettings);
      } else {
        // Initialize if not exists
        setDoc(doc(db, 'app_settings', 'global'), defaultSettings);
      }
    });
    return () => unsub();
  }, []);

  const updateSettings = async (newSettings: Partial<GlobalSettings>) => {
    await setDoc(doc(db, 'app_settings', 'global'), { ...settings, ...newSettings }, { merge: true });
  };

  return (
    <GlobalSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </GlobalSettingsContext.Provider>
  );
};
