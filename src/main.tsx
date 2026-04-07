import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { GlobalSettingsProvider } from './hooks/useGlobalSettings';

// Register PWA service worker
registerSW({ immediate: true });

// Register Firebase Messaging Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Firebase Messaging Service Worker registered with scope:', registration.scope);
    })
    .catch((err) => {
      console.error('Firebase Messaging Service Worker registration failed:', err);
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalSettingsProvider>
      <App />
    </GlobalSettingsProvider>
  </StrictMode>,
);
