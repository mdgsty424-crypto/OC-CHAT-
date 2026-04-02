import { useEffect } from 'react';
import { useAuth } from './useAuth';

// Declare webtoapp functions for TypeScript
declare global {
  interface Window {
    getNotificationToken?: () => Promise<{ token: string }>;
    executeWhenAppReady?: (callback: () => void) => void;
  }
}

export function useNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const registerToken = async () => {
      if (typeof window.getNotificationToken !== 'function') {
        console.log('webtoapp getNotificationToken not available (likely not in app)');
        return;
      }

      try {
        const response = await window.getNotificationToken();
        const appToken = response.token;

        if (appToken) {
          console.log('Captured app token:', appToken);
          
          // Send to backend
          await fetch('/api/notifications/save-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              token: appToken
            })
          });
        }
      } catch (error) {
        console.error('Failed to capture or save notification token:', error);
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
