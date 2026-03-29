import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
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

function AppRoutes() {
  const { currentUser, isAuthReady } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // 2 seconds splash as requested

    return () => clearTimeout(timer);
  }, []);

  if (showSplash || !isAuthReady) {
    return <SplashScreen />;
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-white/30 backdrop-blur-xl border-l border-border/50">
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
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
