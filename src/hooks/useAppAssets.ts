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
  // Using reliable public URLs as defaults since local files might be missing
  ringtone: 'https://res.cloudinary.com/demo/video/upload/v1626343568/sample_audio.mp3',
  sent: 'https://actions.google.com/sounds/v1/multimedia/message_sent.ogg',
  received: 'https://actions.google.com/sounds/v1/multimedia/notification_high_intensity.ogg',
  typing: 'https://actions.google.com/sounds/v1/foley/keyboard_typing_fast.ogg'
};

export function useAppAssets() {
  const [assets, setAssets] = useState<AppAssets>(defaultAssets);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'app_settings', 'assets'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setAssets(prev => {
          const newAssets = { ...prev };
          if (data.ringtone) newAssets.ringtone = data.ringtone;
          if (data.sent) newAssets.sent = data.sent;
          if (data.received) newAssets.received = data.received;
          if (data.typing) newAssets.typing = data.typing;
          return newAssets;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return assets;
}
