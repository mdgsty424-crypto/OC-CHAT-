import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Check if window and localStorage are available
let isLocalStorageAvailable = false;
if (typeof window !== 'undefined') {
  try {
    const testKey = '__test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    isLocalStorageAvailable = true;
  } catch (e) {
    isLocalStorageAvailable = false;
  }
}

// Initialize Firestore with persistent cache if available
export const db = initializeFirestore(app, {
  localCache: isLocalStorageAvailable 
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : memoryLocalCache()
}, (firebaseConfig as any).firestoreDatabaseId || "(default)");

export default app;
