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
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';
import { sendEmail } from '../services/emailService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLocked: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  verifySecurityOTP: (otp: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

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
          const userRef = doc(db, 'users', firebaseUser.uid);
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

          // Security Session Tracking
          import('../lib/security').then(async ({ trackSession }) => {
            const sessionResult = await trackSession(firebaseUser.uid);
            if (sessionResult.isNewDevice) {
              setIsLocked(true);
              const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
              await updateDoc(userRef, { 
                securityOTP: otpCode,
                lastSuspiciousIp: sessionResult.ip 
              });
              await sendEmail('auth', 'template_t1nzyk9', {
                user_name: firebaseUser.displayName || 'User',
                otp: otpCode,
                email: firebaseUser.email
              });
            }
          });

          // Listen for real-time updates to the current user's document
          userUnsubscribe = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
              setUser(snapshot.data() as User);
            } else {
              setUser(updateData as User);
            }
            setLoading(false);
            clearTimeout(timeoutId);
          }, (error) => {
            console.error("Auth snapshot error:", error);
            setUser(updateData as User);
            setLoading(false);
            clearTimeout(timeoutId);
          });

        } else {
          setUser(null);
          setIsLocked(false);
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

  const verifySecurityOTP = async (otp: string) => {
    if (!user) return false;
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data().securityOTP === otp) {
      setIsLocked(false);
      await updateDoc(userRef, { securityOTP: null }); // Clear OTP
      return true;
    }
    return false;
  };

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
    
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isLocked, 
      signInWithGoogle, 
      signInWithEmail, 
      signUpWithEmail, 
      logout,
      verifySecurityOTP
    }}>
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
