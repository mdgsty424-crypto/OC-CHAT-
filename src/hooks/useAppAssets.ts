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
  ringtone: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_b20253457a.mp3?filename=incoming-call-95743.mp3',
  sent: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_3d44111394.mp3?filename=message-sent-7111.mp3',
  received: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_9593bd6c57.mp3?filename=message-received-7110.mp3',
  typing: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_730635e985.mp3?filename=keyboard-typing-59910.mp3'
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
