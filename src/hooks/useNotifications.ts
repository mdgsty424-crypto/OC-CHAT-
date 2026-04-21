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
          console.log('[OneSignal] User detected. Forcing External ID link:', user.uid);
          
          try {
            // 1. Immediate Login
            await OneSignal.login(user.uid);
            
            // 2. Backup: Add user_id as a tag
            await OneSignal.User.addTag("user_id", user.uid);
            console.log('[OneSignal] Login and Tagging initiated for:', user.uid);

            // 3. Verification Log after delay
            setTimeout(() => {
              console.log('[OneSignal] Current External ID:', OneSignal.User.externalId);
              console.log('[OneSignal] Current User Tags:', OneSignal.User.getTags());
            }, 2000);

            const syncSubscriptionId = async (subId: string | undefined | null) => {
              if (!subId || !user) return;
              console.log('[OneSignal] Syncing ID to Firestore:', subId);
              try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                  onesignalIds: arrayUnion(subId),
                  lastNotificationLink: serverTimestamp()
                });
                console.log('[OneSignal] ID successfully synced.');
              } catch (err) {
                console.error('[OneSignal] Sync error:', err);
              }
            };

            // Initial Check
            const initialId = OneSignal.User?.PushSubscription?.id;
            if (initialId) {
               console.log('[OneSignal] Initial ID found:', initialId);
               await syncSubscriptionId(initialId);
            }

            // Event Listener for subscription changes
            OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
              console.log('[OneSignal] Subscription changed. New ID:', event.current.id);
              if (event.current.id) {
                syncSubscriptionId(event.current.id);
              }
            });

            // Force Permission Check
            const checkPermission = async () => {
              if (!user) return;
              const permissionStatus = OneSignal.Notifications.permission;
              if (!permissionStatus) {
                 console.log('[OneSignal] Prompting for notification permission...');
                 await OneSignal.Notifications.requestPermission();
              }
            };

            checkPermission();
            const permissionInterval = setInterval(checkPermission, 30000);

            return () => {
              clearInterval(permissionInterval);
            };
          } catch (linkErr) {
            console.error('[OneSignal] Error linking user:', linkErr);
          }
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
