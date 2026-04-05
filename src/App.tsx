import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { NetworkProvider, useNetwork } from './hooks/useNetwork';
import { SettingsProvider, useSettings } from './hooks/useSettings';
import { useAppAssets } from './hooks/useAppAssets';
import { useZegoStore } from './hooks/useZegoStore';
import { ErrorBoundary } from 'react-error-boundary';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import Home from './pages/Home';
import Community from './pages/Community';
import Discovery from './pages/Discovery';
import Wallet from './pages/Wallet';
import Calls from './pages/Calls';
import Profile from './pages/Profile';
import SearchScreen from './pages/SearchScreen';
import ChatDetail from './pages/ChatDetail';
import CallScreen from './pages/CallScreen';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import TopBar from './components/layout/TopBar';
import IncomingCall from './components/common/IncomingCall';
import OutgoingCall from './components/common/OutgoingCall';
import ZegoCallInvitation from './components/common/ZegoCallInvitation';
import Login from './pages/Login';
import MeetingRoom from './pages/MeetingRoom';
import VoiceRoom from './pages/VoiceRoom';
import AdminDashboard from './pages/AdminDashboard';

function NetworkStatus() {
  const { isOnline, isReconnecting } = useNetwork();

  if (isReconnecting) {
    return (
      <div className="bg-blue-500 text-white text-xs py-1 px-4 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top duration-300">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Reconnecting...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="bg-gray-800 text-white text-xs py-1 px-4 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top duration-300">
        <WifiOff className="w-3 h-3" />
        <span>You are offline. Showing cached data.</span>
      </div>
    );
  }

  return null;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-xl font-extrabold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 max-w-xs">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-extrabold hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}

import { useNotifications } from './hooks/useNotifications';
import PinLock from './components/common/PinLock';

function AppRoutes() {
  const { user, loading } = useAuth();
  const { theme } = useSettings();
  const [isLocked, setIsLocked] = useState(false);
  const { setIsAudioUnlocked, setAudioContext } = useZegoStore();
  const assets = useAppAssets();
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  useNotifications(); // Initialize notification registration

  useEffect(() => {
    // 1. User Gesture Logic for Audio Context & Vibration
    const handleFirstInteraction = () => {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      setAudioContext(audioCtx);
      setIsAudioUnlocked(true);

      // Unlock vibration (some browsers require a gesture)
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }

      console.log("Audio Context & Vibration unlocked via user gesture");
      
      // Pre-play a silent sound if needed to fully unlock
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silentAudio.play().catch(() => {});

      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    // Pre-load all system sounds
    const soundKeys = Object.keys(assets) as Array<keyof typeof assets>;
    soundKeys.forEach(key => {
      const url = assets[key];
      if (url) {
        const audio = new Audio(url);
        audio.load();
        audioRefs.current[key] = audio;
        console.log(`Pre-loaded sound: ${String(key)} from ${url}`);
      }
    });
  }, [assets]);

  useEffect(() => {
    // 2. Browser Permission Prompts on Login
    if (user && !loading) {
      const requestPermissions = async () => {
        try {
          // Notification Permission
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }

          // Camera & Microphone Permission
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          stream.getTracks().forEach(track => track.stop()); // Stop immediately after permission granted
          
          console.log("Permissions granted successfully");

          // Location tracking
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
              try {
                // Simple reverse geocoding using a free API (or just store lat/lng)
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                const data = await res.json();
                const locationString = data.address.city || data.address.town || data.address.village || data.address.country || `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`;
                
                await updateDoc(doc(db, 'users', user.uid), {
                  location: locationString
                });
              } catch (e) {
                console.error("Reverse geocoding failed", e);
                await updateDoc(doc(db, 'users', user.uid), {
                  location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
                });
              }
            }, (err) => {
              console.warn("Location permission denied", err);
            });
          }
        } catch (error) {
          console.warn("Permissions denied or failed:", error);
        }
      };

      requestPermissions();
    }
  }, [user, loading]);

  useEffect(() => {
    // Check for app lock
    if (user?.securitySettings?.appLockEnabled && user?.securitySettings?.pin) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
    }
  }, [user?.uid, user?.securitySettings?.appLockEnabled, user?.securitySettings?.pin]);

  useEffect(() => {
    // Anti-screenshot logic (Privacy Mode)
    if (user?.securitySettings?.privacyModeEnabled) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && e.key === '4')) {
          alert("Screenshot protection is enabled!");
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.userSelect = 'auto';
      };
    }
  }, [user?.securitySettings?.privacyModeEnabled]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (isLocked) {
    return <PinLock onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-surface border-l border-border/50">
        <NetworkStatus />
        <ZegoCallInvitation />
        <IncomingCall />
        <OutgoingCall />
        <Routes>
          <Route path="/" element={<><TopBar title="Chats" /><Home /><BottomNav /></>} />
          <Route path="/community" element={<><TopBar title="Community" /><Community /><BottomNav /></>} />
          <Route path="/discovery" element={<><Discovery /><BottomNav /></>} />
          <Route path="/wallet" element={<><Wallet /><BottomNav /></>} />
          <Route path="/calls" element={<><TopBar title="Calls" /><Calls /><BottomNav /></>} />
          <Route path="/profile" element={<><TopBar title="Profile" /><Profile /><BottomNav /></>} />
          <Route path="/profile/:id" element={<><TopBar title="Profile" /><Profile /><BottomNav /></>} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/chat/:id" element={<ChatDetail />} />
          <Route path="/call/:id" element={<CallScreen />} />
          <Route path="/meeting/:id" element={<MeetingRoom />} />
          <Route path="/voice/:id" element={<VoiceRoom />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider>
        <SettingsProvider>
          <NetworkProvider>
            <Router>
              <AppRoutes />
            </Router>
          </NetworkProvider>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
