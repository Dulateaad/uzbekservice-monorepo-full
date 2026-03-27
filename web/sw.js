// Service Worker для PWA
// Кэширование ресурсов для офлайн работы + Firebase Messaging

// Импортируем Firebase для push-уведомлений
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration (odo-business-hub)
const firebaseConfig = {
  apiKey: "AIzaSyC9CTXPa_2UzpVAiLzTR1hlVm7RD6cmhHw",
  authDomain: "odo-business-hub.firebaseapp.com",
  projectId: "odo-business-hub",
  storageBucket: "odo-business-hub.firebasestorage.app",
  messagingSenderId: "678613616925",
  appId: "1:678613616925:web:2f35b684fe08c0d2a439f4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

const CACHE_NAME = 'odo-uz-v1';
const RUNTIME_CACHE = 'odo-uz-runtime-v1';

// Ресурсы для кэширования при установке
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/main.dart.js',
  '/flutter.js',
  '/manifest.json',
  '/icons/Icon-192.png',
  '/icons/Icon-512.png',
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехват запросов (Network First стратегия)
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к Firebase и внешним API
  const url = new URL(event.request.url);
  
  // Не кэшируем запросы к Firebase
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com')) {
    return; // Пропускаем, используем сеть
  }
  
  // Для статических ресурсов используем Cache First
  if (event.request.destination === 'image' || 
      event.request.destination === 'script' ||
      event.request.destination === 'style') {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((response) => {
            // Кэшируем только успешные ответы
            if (response.status === 200) {
              const responseToCache = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          });
        })
    );
    return;
  }
  
  // Для HTML и других - Network First
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Клонируем ответ для кэширования
        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Если сеть недоступна, пытаемся получить из кэша
        return caches.match(event.request);
      })
  );
});

// Обработка фоновых сообщений от Firebase
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Получено фоновое сообщение от Firebase:', payload);
  
  const notificationTitle = payload.notification?.title || 'ODO.UZ';
  const notificationOptions = {
    body: payload.notification?.body || 'Новое уведомление',
    icon: '/icons/Icon-192.png',
    badge: '/icons/Icon-192.png',
    tag: payload.data?.type || 'odo-uz-notification',
    data: payload.data || {},
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Обработка кликов по уведомлениям (объединенная для Firebase и обычных push)
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();
  
  const data = event.notification.data || {};
  let urlToOpen = data.url || '/';
  
  // Навигация на основе типа уведомления (для Firebase)
  if (data.type === 'order' && data.orderId) {
    urlToOpen = `/home/orders/${data.orderId}`;
  } else if (data.type === 'chat' && data.chatId) {
    urlToOpen = `/home/chat/${data.chatId}`;
  } else if (data.type === 'specialist' && data.specialistId) {
    urlToOpen = `/home/specialist/${data.specialistId}`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Если есть открытое окно, фокусируемся на нем
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            // Отправляем сообщение в приложение для навигации
            client.postMessage({
              type: 'notification_click',
              data: data,
              url: urlToOpen
            });
            return client.focus().then(() => {
              // Навигация через изменение URL
              if (client.navigate) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        // Если нет открытого окна, открываем новое
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

