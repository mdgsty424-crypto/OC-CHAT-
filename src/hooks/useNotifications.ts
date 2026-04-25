import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { doc, setDoc, serverTimestamp, updateDoc, arrayUnion, collection, addDoc } from 'firebase/firestore';
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

import { useNavigate } from 'react-router-dom';

export function useNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Initialize OneSignal exactly once using the command queue
    const initOneSignal = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Safe global initialization
        (window as any).OneSignal = (window as any).OneSignal || [];

        // Only init if not already done
        if (!(window.OneSignal as any).initialized) {
          console.log('[OneSignal] Initializing SDK and Service Worker...');
          const appId = import.meta.env.VITE_ONESIGNAL_APP_ID || "77b000e4-b044-4010-ac1e-9e73704baefa";
          if (!appId) {
            console.warn('[OneSignal] Missing App ID. Skipping init.');
            return;
          }
          await OneSignal.init({
            appId: appId,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: "OneSignalSDKWorker.js",
            serviceWorkerParam: { scope: "/" },
          });
          console.log('[OneSignal] SDK Initialized Successfully');
        }
      } catch (err) {
        console.warn('[OneSignal] Init error (suppressed for WebView):', err);
      }
    };

    initOneSignal();
  }, []);

  useEffect(() => {
    // 1.1 Add Notification Click Listener
    if (typeof window === 'undefined' || !window.OneSignal) return;

    const handleNotificationClick = async (event: any) => {
      console.log('[OneSignal] Notification clicked:', event);
      const actionId = event.action?.actionId;
      const data = event.notification.additionalData;

      if (!data) return;

      const chatId = data.chatId;
      const messageId = data.messageId;
      const userId = data.userId;

      // 1. LIKE BUTTON
      if (actionId === "like") {
        try {
          await fetch("/api/message/like", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId, userId })
          });
          console.log("Message liked 👍");
        } catch (e) {
          console.error("Failed to like message:", e);
        }
      }

      // 2. REPLY BUTTON / OPEN BUTTON
      if (actionId === "reply" || actionId === "open") {
        navigate("/chat/" + chatId);
      }

      // 3. CALL ACCEPT
      if (actionId === "accept") {
        const callerId = data.callerId;
        const callType = data.callType || 'audio';
        const callId = data.callId;
        navigate(`/call-screen/${callerId}?type=${callType}&callId=${callId}&mode=receiver`);
      }

      // 4. CALL REJECT
      if (actionId === "reject") {
        try {
          await fetch("/api/call/reject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId, userId })
          });
          console.log("Call rejected ❌");
        } catch (e) {
          console.error("Failed to reject call:", e);
        }
      }

      // Default behavior: if no actionId but has a URL or chatId
      if (!actionId) {
        if (event.notification.launchURL) {
          const url = new URL(event.notification.launchURL);
          navigate(url.pathname + url.search);
        } else if (chatId) {
          navigate("/chat/" + chatId);
        }
      }
    };

    (window.OneSignal as any).push(() => {
      if (OneSignal.Notifications?.addEventListener) {
        OneSignal.Notifications.addEventListener("click", handleNotificationClick);
      }
    });

    return () => {
      (window.OneSignal as any).push(() => {
        if (OneSignal.Notifications?.removeEventListener) {
          OneSignal.Notifications.removeEventListener("click", handleNotificationClick);
        }
      });
    };
  }, []);

  useEffect(() => {
    // 2. Handle Login/Logout (External ID Binding)
    const syncIdentity = async () => {
      if (typeof window === 'undefined' || !window.OneSignal) return;

      if (user) {
        const deviceModel = navigator.userAgent;

        (window.OneSignal as any).push(async () => {
          try {
            console.log('[OneSignal] Explicitly syncing Identity for UID:', user.uid);
            
            // Priority: Link External ID
            if (typeof window.OneSignal.login === "function") {
              await window.OneSignal.login(user.uid);
              console.log('[OneSignal] Logged in with UID:', user.uid);
            } else if (typeof (window.OneSignal as any).setExternalUserId === "function") {
              await (window.OneSignal as any).setExternalUserId(user.uid);
              console.log('[OneSignal] Set External ID:', user.uid);
            }

            // webtoapp bridge sync
            if (window.oneSignalSetExternalUserId && typeof window.oneSignalSetExternalUserId === 'function') {
              window.oneSignalSetExternalUserId(user.uid);
            }

            // Fetch IP for Admin tracking (optional/helpful)
            let publicIp = 'unknown';
            try {
              const ipRes = await fetch('https://api.ipify.org?format=json');
              if (ipRes.ok) {
                const contentType = ipRes.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                  const ipData = await ipRes.json();
                  publicIp = ipData.ip;
                } else {
                  const text = await ipRes.text();
                  console.warn('[OneSignal] IP fetch returned non-JSON:', text.substring(0, 50));
                  publicIp = 'non-json-response';
                }
              } else {
                console.warn('[OneSignal] IP fetch failed with status:', ipRes.status);
              }
            } catch (e) {
              console.warn('[OneSignal] IP fetch network error:', e);
            }

            // Optional: Device Tags
            const tags = {
              "device_model": deviceModel,
              "last_active": new Date().toISOString(),
              "user_id": user.uid,
              "synced_at": new Date().getTime().toString(),
              "public_ip": publicIp,
              "app_env": "production"
            };
            
            if (typeof (window.OneSignal as any).sendTags === "function") {
              await (window.OneSignal as any).sendTags(tags);
            } else if (OneSignal.User?.addTags) {
              await OneSignal.User.addTags(tags);
            }

            // Priority: Ensure Subscription
            if (OneSignal.Notifications?.requestPermission) {
              const isPermissionGranted = OneSignal.Notifications.permission;
              if (!isPermissionGranted) {
                console.log('[OneSignal] Re-requesting permission if needed...');
                await OneSignal.Notifications.requestPermission();
              }
            }

            // Sync Subscription ID to Firestore
            const subId = OneSignal.User?.PushSubscription?.id;
            if (subId) {
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                onesignalIds: arrayUnion(subId),
                lastNotificationLink: serverTimestamp(),
                onesignalSynced: true,
                publicIp: publicIp // Save IP for Admin
              }).catch(() => {});
            }

          } catch (err) {
            console.warn('[OneSignal] Sync error (background):', err);
          }
        });
      } else {
        // User logout
        (window.OneSignal as any).push(() => {
          if (typeof window.OneSignal.logout === "function") {
            window.OneSignal.logout().catch(() => {});
          }
        });
      }
    };

    // Sync several times to ensure it sticks across page loads/navigation
    syncIdentity();
    const t1 = setTimeout(syncIdentity, 2000);
    const t2 = setTimeout(syncIdentity, 10000);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
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
    largeIcon?: string;
    link?: string;
    priority?: 'high' | 'normal';
    sound?: string;
    requireInteraction?: boolean;
    type?: string;
    data?: any;
    actions?: any[];
  }) => {
    try {
      console.log('Pushing notification via server:', params);

      // Save to Firestore for in-app history
      if (params.targetUserId !== 'all') {
        const notifRef = collection(db, 'users', params.targetUserId, 'notifications');
        await addDoc(notifRef, {
          type: params.type || 'system',
          senderName: params.title || 'System',
          senderPhoto: params.largeIcon || 'https://cdn-icons-png.flaticon.com/512/3119/3119338.png',
          message: params.message,
          link: params.link || '',
          data: params.data || {},
          read: false,
          timestamp: serverTimestamp(),
        }).catch(e => console.error("History save failed:", e));
      }

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
