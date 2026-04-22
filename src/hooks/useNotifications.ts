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
    oneSignalSetExternalUserId?: (userId: string) => void;
  }
}

export function useNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    // 1. Initialize OneSignal exactly once using the command queue
    const initOneSignal = async () => {
      if (typeof window === 'undefined') return;

      // Safe global initialization
      const OneSignalStack = (window as any).OneSignal || [];
      (window as any).OneSignal = OneSignalStack;

      // Only init if not already done
      if (!(window.OneSignal as any).initialized) {
        console.log('[OneSignal] Initializing SDK and Service Worker...');
        try {
          await OneSignal.init({
            appId: import.meta.env.VITE_ONESIGNAL_APP_ID || "77b000e4-b044-4010-ac1e-9e73704baefa",
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: "OneSignalSDKWorker.js",
            serviceWorkerParam: { scope: "/" },
          });
          console.log('[OneSignal] SDK Initialized Successfully with Service Worker');
        } catch (err) {
          console.error('[OneSignal] Initialization error:', err);
        }
      }
    };

    initOneSignal();
  }, []);

  useEffect(() => {
    // 2. Handle Login/Logout (External ID Binding)
    const syncIdentity = async () => {
      if (!window.OneSignal) return;

      if (user) {
        console.log('[OneSignal] Syncing Identity for UID:', user.uid);
        const deviceModel = navigator.userAgent;

        (window.OneSignal as any).push(async () => {
          try {
            // Priority: Link External ID (Essential for Backend targeting)
            if (typeof window.OneSignal.login === "function") {
              await window.OneSignal.login(user.uid);
              console.log('[OneSignal] External ID linked via login()');
            } else if (typeof (window.OneSignal as any).setExternalUserId === "function") {
              await (window.OneSignal as any).setExternalUserId(user.uid);
              console.log('[OneSignal] External ID linked via setExternalUserId()');
            }

            // webtoapp bridge sync (Requested Fix)
            if (window.oneSignalSetExternalUserId) {
              window.oneSignalSetExternalUserId(user.uid);
              console.log('[OneSignal] External ID synced via webtoapp bridge');
            }

            // Optional: Device Tags
            const tags = {
              "device_model": deviceModel,
              "last_active": new Date().toISOString(),
              "user_id": user.uid
            };
            
            if (typeof (window.OneSignal as any).sendTags === "function") {
              await (window.OneSignal as any).sendTags(tags);
            } else if (OneSignal.User?.addTags) {
              await OneSignal.User.addTags(tags);
            }

            // Priority: Ensure Subscription (WebView Compatibility)
            const permission = OneSignal.Notifications?.permission || window.OneSignal?.Notifications?.permission;
            if (!permission) {
              console.log('[OneSignal] Prompting for notification permission...');
              await OneSignal.Notifications.requestPermission();
            }

            // Sync Subscription ID to Firestore (Persistence)
            const subId = OneSignal.User?.PushSubscription?.id || window.OneSignal?.User?.PushSubscription?.id;
            if (subId) {
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                onesignalIds: arrayUnion(subId),
                lastNotificationLink: serverTimestamp()
              }).catch(e => console.error('[OneSignal] Firestore sync failed:', e));
              console.log('[OneSignal] Subscription ID saved:', subId);
            }

          } catch (err) {
            console.error('[OneSignal] Sync error:', err);
          }
        });
      } else {
        // User logout
        (window.OneSignal as any).push(() => {
          if (typeof window.OneSignal.logout === "function") {
            window.OneSignal.logout();
            console.log('[OneSignal] User logged out from SDK');
          }
        });
      }
    };

    // If SDK is ready, sync immediately. If not, retry shortly.
    if (window.OneSignal) {
      syncIdentity();
    } else {
      setTimeout(syncIdentity, 2000);
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
