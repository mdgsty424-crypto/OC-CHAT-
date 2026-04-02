import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Declare webtoapp functions for TypeScript
declare global {
  interface Window {
    getNotificationToken?: () => Promise<{ token: string }>;
    executeWhenAppReady?: (callback: () => void) => void;
    receivePushNotificationToken?: (token: string) => void;
  }
}

export function useNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const saveTokenToFirestore = async (appToken: string) => {
      if (!appToken) return;
      console.log('Captured app token:', appToken);
      
      try {
        // Store token directly in Firestore
        const tokenRef = doc(db, 'user_tokens', appToken);
        await setDoc(tokenRef, {
          userId: user.uid,
          token: appToken,
          updatedAt: serverTimestamp()
        });
        console.log('Token saved to Firestore successfully.');
      } catch (error) {
        console.error('Failed to save notification token to Firestore:', error);
      }
    };

    // 1. Legacy Support (Pre-August 2021 apps)
    window.receivePushNotificationToken = (token: string) => {
      saveTokenToFirestore(token);
    };

    // 2. Modern Support (Post-August 2021 apps)
    const registerToken = async () => {
      if (typeof window.getNotificationToken !== 'function') {
        console.log('webtoapp getNotificationToken not available (likely not in app)');
        return;
      }

      try {
        const response = await window.getNotificationToken();
        if (response && response.token) {
          await saveTokenToFirestore(response.token);
        }
      } catch (error) {
        console.error('Failed to capture notification token:', error);
      }
    };

    if (typeof window.executeWhenAppReady === 'function') {
      window.executeWhenAppReady(registerToken);
    } else {
      // Fallback if executeWhenAppReady is not available but getNotificationToken might be
      registerToken();
    }
  }, [user]);

  const sendNotification = async (params: {
    targetUserId: string;
    title: string;
    message: string;
    image?: string;
    link?: string;
    priority?: 'high' | 'normal';
    sound?: string;
    requireInteraction?: boolean;
    actions?: Array<{ title: string; action: 'open_url' | 'dismiss'; url?: string }>;
  }) => {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to send notification:', error);
      return { success: false, error };
    }
  };

  return { sendNotification };
}
