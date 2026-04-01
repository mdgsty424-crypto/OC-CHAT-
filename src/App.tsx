import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { NetworkProvider, useNetwork } from './hooks/useNetwork';
import { ErrorBoundary } from 'react-error-boundary';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import Home from './pages/Home';
import Community from './pages/Community';
import Discovery from './pages/Discovery';
import Wallet from './pages/Wallet';
import Calls from './pages/Calls';
import Profile from './pages/Profile';
import ChatDetail from './pages/ChatDetail';
import CallScreen from './pages/CallScreen';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import TopBar from './components/layout/TopBar';
import IncomingCall from './components/common/IncomingCall';
import SplashScreen from './pages/SplashScreen';
import Login from './pages/Login';
import MeetingRoom from './pages/MeetingRoom';
import VoiceRoom from './pages/VoiceRoom';

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
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 max-w-xs">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}

import { useNotifications } from './hooks/useNotifications';

function AppRoutes() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  useNotifications(); // Initialize notification registration

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // 2 seconds splash as requested

    return () => clearTimeout(timer);
  }, []);

  if (showSplash || loading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-white border-l border-border/50">
        <NetworkStatus />
        <IncomingCall />
        <Routes>
          <Route path="/" element={<><TopBar title="Chats" /><Home /><BottomNav /></>} />
          <Route path="/community" element={<><TopBar title="Community" /><Community /><BottomNav /></>} />
          <Route path="/discovery" element={<><Discovery /><BottomNav /></>} />
          <Route path="/wallet" element={<><Wallet /><BottomNav /></>} />
          <Route path="/calls" element={<><TopBar title="Calls" /><Calls /><BottomNav /></>} />
          <Route path="/profile" element={<><TopBar title="Profile" /><Profile /><BottomNav /></>} />
          <Route path="/chat/:id" element={<ChatDetail />} />
          <Route path="/call/:id" element={<CallScreen />} />
          <Route path="/meeting/:id" element={<MeetingRoom />} />
          <Route path="/voice/:id" element={<VoiceRoom />} />
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
        <NetworkProvider>
          <Router>
            <AppRoutes />
          </Router>
        </NetworkProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
