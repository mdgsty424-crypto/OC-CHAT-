import React, { createContext, useContext, useEffect, useState } from 'react';
import { getQueue, removeFromQueue } from '../lib/db';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface NetworkContextType {
  isOnline: boolean;
  isReconnecting: boolean;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: navigator.onLine,
  isReconnecting: false,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsReconnecting(true);
      syncQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsReconnecting(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncQueue = async () => {
    try {
      const queue = await getQueue();
      for (const item of queue) {
        if (item.type === 'message') {
          await addDoc(collection(db, `chats/${item.chatId}/messages`), {
            ...item.data,
            timestamp: serverTimestamp(),
          });
          await removeFromQueue(item.id);
        }
      }
    } catch (error) {
      console.error('Failed to sync queue:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <NetworkContext.Provider value={{ isOnline, isReconnecting }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
