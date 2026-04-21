import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { doc, setDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import OneSignal from 'react-onesignal';

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
    // Initialize OneSignal
    const initOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: import.meta.env.VITE_ONESIGNAL_APP_ID || "77b000e4-b044-4010-ac1e-9e73704baefa",
          allowLocalhostAsSecureOrigin: true,
        });
        
        if (user) {
          console.log('[OneSignal] User detected, waiting 3s for SDK stability...');
          
          setTimeout(async () => {
            console.log('[OneSignal] Checking for Subscription ID...');
            try {
              // Get current subscription ID
              const subId = OneSignal.User?.PushSubscription?.id;
              
              if (subId) {
                console.log('[OneSignal] Captured Subscription ID:', subId);
                
                // Save to Firestore under users collection
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                  onesignalIds: arrayUnion(subId),
                  lastNotificationLink: serverTimestamp()
                });
                console.log('[OneSignal] Subscription ID saved to Firestore.');
              } else {
                console.warn('[OneSignal] No Subscription ID found yet. Requesting permission...');
                await OneSignal.Notifications.requestPermission();
              }
            } catch (err) {
              console.error('[OneSignal] Error saving sub ID:', err);
            }
          }, 3000);
        } else {
          console.log('[OneSignal] No user, logging out');
          await OneSignal.logout();
        }
      } catch (error) {
        console.error('[OneSignal] Initialization error:', error);
      }
    };

    initOneSignal();
  }, [user?.uid]);

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
      console.log('Pushing notification via server:', params);
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Push Notification Result:', data);
        return data;
      } else {
        const text = await response.text();
        console.error('Expected JSON but received:', text.substring(0, 100));
        return { success: false, error: 'Non-JSON response received', status: response.status };
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      return { success: false, error };
    }
  };

  return { sendNotification };
}
