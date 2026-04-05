import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface AppAssets {
  ringtone: string;
  sent: string;
  received: string;
  typing: string;
}

const defaultAssets: AppAssets = {
  ringtone: '/assets/sounds/ringtone.mp3',
  sent: '/assets/sounds/sent.mp3',
  received: '/assets/sounds/received.mp3',
  typing: '/assets/sounds/typing.mp3'
};

export function useAppAssets() {
  const [assets, setAssets] = useState<AppAssets>(defaultAssets);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'app_settings', 'assets'), (snapshot) => {
      if (snapshot.exists()) {
        setAssets(prev => ({ ...prev, ...snapshot.data() }));
      }
    });

    return () => unsubscribe();
  }, []);

  return assets;
}
