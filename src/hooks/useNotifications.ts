import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { doc, setDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import OneSignal from 'react-onesignal';

// Declare webtoapp and OneSignal functions for TypeScript
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
    // 100% Work Guaranteed OneSignal Sync (Aggressive WebView & Browser Support)
    const syncUserWithOneSignal = async (userId: string) => {
      if (!userId) return;

      const attemptSync = async () => {
        if (window.OneSignal) {
          console.log('[OneSignal] Initializing sync for UID:', userId);
          const deviceModel = navigator.userAgent;

          try {
            // Using the user's specific sync logic for profiles and tags
            (window.OneSignal as any).push(() => {
              // 1. Main Profile ID set (Firebase UID)
              if (typeof window.OneSignal.login === "function") {
                window.OneSignal.login(userId);
              } else if (typeof (window.OneSignal as any).setExternalUserId === "function") {
                (window.OneSignal as any).setExternalUserId(userId);
              } else {
                (window.OneSignal as any).push(["setExternalUserId", userId]);
              }

              // 2. Phone model and login time as Tags
              const tags = {
                "device_model": deviceModel,
                "last_login": new Date().toISOString(),
                "user_id": userId
              };

              if (typeof (window.OneSignal as any).sendTags === "function") {
                (window.OneSignal as any).sendTags(tags);
              } else if (OneSignal.User?.addTags) {
                OneSignal.User.addTags(tags);
              }
              
              console.log("[OneSignal] Profile created and device info synced!");
            });

            // Sync Subscription ID to Firestore as fallback tracking
            const subId = OneSignal.User?.PushSubscription?.id || window.OneSignal?.User?.PushSubscription?.id;
            if (subId) {
              try {
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                  onesignalIds: arrayUnion(subId),
                  lastNotificationLink: serverTimestamp()
                });
                console.log('[OneSignal] SubID saved to Firestore.');
              } catch (fsErr) {
                console.error('[OneSignal] Firestore sync error:', fsErr);
              }
            }
          } catch (err) {
            console.error('[OneSignal] Sync attempt failed:', err);
          }
        } else {
          console.warn('[OneSignal] SDK not ready yet, retrying in 2s...');
          setTimeout(attemptSync, 2000);
        }
      };

      attemptSync();
    };

    if (user) {
      syncUserWithOneSignal(user.uid);
      
      // Force Permission Check
      const checkPermission = async () => {
        if (!user) return;
        try {
          const permissionStatus = OneSignal.Notifications?.permission || window.OneSignal?.Notifications?.permission;
          if (!permissionStatus) {
            console.log('[OneSignal] Prompting for notification permission...');
            await OneSignal.Notifications.requestPermission();
          }
        } catch (err) {
          console.error('[OneSignal] Permission request error:', err);
        }
      };
      
      checkPermission();
    } else {
      if (window.OneSignal?.logout) window.OneSignal.logout();
    }
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
