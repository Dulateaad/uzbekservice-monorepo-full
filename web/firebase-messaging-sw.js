// Service Worker для Firebase Cloud Messaging на Web
// Этот файл должен быть в корне web директории

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

// Обработка фоновых сообщений
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Получено фоновое сообщение:', payload);
  
  const notificationTitle = payload.notification?.title || 'ODO.UZ';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/assets/images/logo.jpg', // Иконка уведомления
    badge: '/assets/images/logo.jpg',
    tag: payload.data?.type || 'default',
    data: payload.data || {},
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Обработка клика на уведомление
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Клик по уведомлению:', event);
  
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';
  
  // Навигация на основе типа уведомления
  if (data.type === 'order' && data.orderId) {
    url = `/home/orders/${data.orderId}`;
  } else if (data.type === 'chat' && data.chatId) {
    url = `/home/chat/${data.chatId}`;
  } else if (data.type === 'specialist' && data.specialistId) {
    url = `/home/specialist/${data.specialistId}`;
  }

  // Открываем приложение при клике на уведомление
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если есть открытое окно, фокусируемся на нем и переходим по URL
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          // Отправляем сообщение в приложение для навигации
          client.postMessage({
            type: 'notification_click',
            data: data,
            url: url
          });
          return client.focus().then(() => {
            // Навигация через изменение URL
            if (client.navigate) {
              return client.navigate(url);
            }
          });
        }
      }
      // Если нет открытого окна, открываем новое
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

