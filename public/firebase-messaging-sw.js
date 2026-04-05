importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

// This is the Firebase configuration for the service worker
// Note: In a real app, these values should be fetched from an environment variable or a config file.
// However, service workers cannot access process.env directly.
// We'll use a placeholder that the user can fill or we can inject.
const firebaseConfig = {
  apiKey: "AIzaSyCh6w_NnTL42dUUsrhRZrQxUwNnRnA3xAI",
  authDomain: "ocsthael-shopping.firebaseapp.com",
  projectId: "ocsthael-shopping",
  storageBucket: "ocsthael-shopping.firebasestorage.app",
  messagingSenderId: "257861634639",
  appId: "1:257861634639:web:1adecea66699d58f48b83a"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image || '/logo192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
