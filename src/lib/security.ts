import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  updateDoc,
  getDoc
} from 'firebase/firestore';

export interface SessionInfo {
  id?: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  browser: string;
  os: string;
  ip: string;
  city: string;
  country: string;
  lastActive: any;
  isCurrent?: boolean;
}

// Global function to get device fingerprint
const getDeviceFingerprint = () => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
  return btoa(`${navigator.userAgent}-${renderer}-${screen.width}x${screen.height}`);
};

export const trackSession = async (userId: string) => {
  try {
    let geo = { ip: 'unknown', city: 'Unknown', country_name: 'Unknown' };
    try {
      // Use controller to abort fetch if it hangs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('https://ipapi.co/json/', { 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        geo = await response.json();
      }
    } catch (e) {
      console.warn('IP tracking failed, using fallback or unknown info', e);
    }
    
    const deviceId = getDeviceFingerprint();
    const deviceName = navigator.userAgent.includes('Mobi') ? 'Mobile Device' : 'Desktop/Laptop';
    
    const sessionsRef = collection(db, 'user_sessions');
    const q = query(sessionsRef, where('userId', '==', userId), where('deviceId', '==', deviceId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // New Device Detected! - Trigger Notification
      await addDoc(sessionsRef, {
        userId,
        deviceId,
        deviceName,
        browser: navigator.userAgent,
        os: navigator.platform,
        ip: geo.ip || 'Unknown',
        city: geo.city || 'Unknown',
        country: geo.country_name || 'Unknown',
        lastActive: serverTimestamp(),
      });
      return { isNewDevice: true, ip: geo.ip };
    } else {
      const sessionDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'user_sessions', sessionDoc.id), {
        lastActive: serverTimestamp(),
        ip: geo.ip,
        city: geo.city
      });
      return { isNewDevice: false, ip: geo.ip };
    }
  } catch (error) {
    console.error('Session tracking error:', error);
    return { isNewDevice: false, ip: 'unknown' };
  }
};

export const logoutAllDevices = async (userId: string, currentDeviceId?: string) => {
  const sessionsRef = collection(db, 'user_sessions');
  const q = query(sessionsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  const deletions = snapshot.docs.map(async (d) => {
    if (d.data().deviceId !== currentDeviceId) {
      await deleteDoc(doc(db, 'user_sessions', d.id));
    }
  });
  
  await Promise.all(deletions);
};

export const getActiveSessions = async (userId: string): Promise<SessionInfo[]> => {
  const sessionsRef = collection(db, 'user_sessions');
  const q = query(sessionsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const currentId = getDeviceFingerprint();
  
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
    isCurrent: d.data().deviceId === currentId
  })) as SessionInfo[];
};
