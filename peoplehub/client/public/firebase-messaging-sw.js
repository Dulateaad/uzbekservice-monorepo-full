/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB7z8VimBp_-eP8iIKkvW_9cak6zNqIfPg",
  authDomain: "taxi-eb8b7.firebaseapp.com",
  projectId: "taxi-eb8b7",
  storageBucket: "taxi-eb8b7.firebasestorage.app",
  messagingSenderId: "914129229231",
  appId: "1:914129229231:web:12f3bf910f1ababb11cb5a",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "PeopleHub";
  const options = {
    body: payload.notification?.body || "",
    icon: "/icons/tariff-econom.png",
    badge: "/icons/tariff-econom.png",
    data: payload.data,
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
