import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fallback timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("Auth state check timed out after 3 seconds. Forcing login screen.");
        setLoading(false);
      }
    }, 3000);

    let userUnsubscribe: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (userUnsubscribe) {
          userUnsubscribe();
          userUnsubscribe = undefined;
        }

        if (firebaseUser) {
          // Offline-first: Set basic user immediately so app can render without waiting for Firestore
          const basicUser: User = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'User',
            email: firebaseUser.email || undefined,
            photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
            online: true,
            lastSeen: new Date().toISOString()
          };
          setUser(basicUser);
          setLoading(false);
          clearTimeout(timeoutId);

          const userRef = doc(db, 'users', firebaseUser.uid);
          
          try {
            const userDoc = await getDoc(userRef);
            
            const updateData: any = { 
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Anonymous',
              online: true, 
              lastSeen: new Date().toISOString() 
            };
            
            if (!userDoc.exists() || !userDoc.data().photoURL) {
              updateData.photoURL = firebaseUser.photoURL || '';
            }
            
            if (firebaseUser.email === 'info@ocsthael.com') {
              updateData.role = 'admin';
            }
            if (firebaseUser.email) {
              updateData.email = firebaseUser.email;
            }

            // Fire and forget the update so it syncs when online
            setDoc(userRef, updateData, { merge: true }).catch(e => console.log("Offline update pending", e));

            // Listen for real-time updates to the current user's document
            userUnsubscribe = onSnapshot(userRef, (snapshot) => {
              if (snapshot.exists()) {
                setUser(snapshot.data() as User);
              } else {
                setUser({ ...basicUser, ...updateData } as User);
              }
            }, (error) => {
              console.error("Auth snapshot error:", error);
            });
          } catch (err) {
            console.error("Error fetching user doc, using basic user:", err);
          }

          // Register user with OneSignal
          if (window.OneSignal) {
            window.OneSignal.push(function() {
              if (typeof window.OneSignal.login === 'function') {
                window.OneSignal.login(firebaseUser.uid);
              } else if (typeof window.OneSignal.setExternalUserId === 'function') {
                window.OneSignal.setExternalUserId(firebaseUser.uid);
              }
            });
          }

        } else {
          setUser(null);
          setLoading(false);
          clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
        setUser(null);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
      if (userUnsubscribe) {
        userUnsubscribe();
      }
    };
  }, []);

  // Handle presence (online/offline)
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      const isOnline = document.visibilityState === 'visible';
      setDoc(doc(db, 'users', user.uid), { 
        online: isOnline, 
        lastSeen: new Date().toISOString() 
      }, { merge: true });
    };

    const handleBeforeUnload = () => {
      setDoc(doc(db, 'users', user.uid), { 
        online: false, 
        lastSeen: new Date().toISOString() 
      }, { merge: true });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.uid]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(firebaseUser, { displayName: name });
    
    // Create user document
    const userRef = doc(db, 'users', firebaseUser.uid);
    const newUser: User = {
      uid: firebaseUser.uid,
      displayName: name,
      email: firebaseUser.email || undefined,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
      online: true,
      lastSeen: new Date().toISOString(),
      role: firebaseUser.email === 'info@ocsthael.com' ? 'admin' : 'user'
    };
    await setDoc(userRef, newUser);
  };

  const logout = async () => {
    if (user) {
      await setDoc(doc(db, 'users', user.uid), { 
        online: false, 
        lastSeen: new Date().toISOString() 
      }, { merge: true });
    }
    
    if (window.OneSignal) {
      window.OneSignal.push(function() {
        if (typeof window.OneSignal.logout === 'function') {
          window.OneSignal.logout();
        } else if (typeof window.OneSignal.removeExternalUserId === 'function') {
          window.OneSignal.removeExternalUserId();
        }
      });
    }
    
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
