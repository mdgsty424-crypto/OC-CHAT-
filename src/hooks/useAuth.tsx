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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          const newUser: User = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Anonymous',
            photoURL: firebaseUser.photoURL || '',
            online: true,
            lastSeen: new Date().toISOString(),
            role: 'user'
          };
          await setDoc(userRef, newUser);
        } else {
          await setDoc(userRef, { online: true, lastSeen: new Date().toISOString() }, { merge: true });
        }

        // Listen for real-time updates to the current user's document
        const userUnsubscribe = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUser(snapshot.data() as User);
          }
        });

        // Register user with OneSignal
        if (window.OneSignal) {
          window.OneSignal.push(function() {
            window.OneSignal.login(firebaseUser.uid);
          });
        }

        setLoading(false);
        return () => userUnsubscribe();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
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
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
      online: true,
      lastSeen: new Date().toISOString(),
      role: 'user'
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
        window.OneSignal.logout();
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
