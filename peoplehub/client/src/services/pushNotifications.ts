import { getMessaging, getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { initializeApp, getApps } from "firebase/app";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const firebaseConfig = {
  apiKey: "AIzaSyB7z8VimBp_-eP8iIKkvW_9cak6zNqIfPg",
  authDomain: "taxi-eb8b7.firebaseapp.com",
  projectId: "taxi-eb8b7",
  storageBucket: "taxi-eb8b7.firebasestorage.app",
  messagingSenderId: "914129229231",
  appId: "1:914129229231:web:12f3bf910f1ababb11cb5a",
};

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY || "";

function getApp() {
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

function getMessagingInstance() {
  if (!messagingInstance) {
    messagingInstance = getMessaging(getApp());
  }
  return messagingInstance;
}

export async function registerPushNotifications(userId: string): Promise<string | null> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    console.warn("Push notifications not supported");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return null;
    }

    const sw = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessagingInstance();
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: sw,
    });

    if (token) {
      await updateDoc(doc(db, "users", userId), {
        fcmToken: token,
        fcmTokenUpdatedAt: serverTimestamp(),
      });
      console.log("FCM token registered");
    }
    return token;
  } catch (err) {
    console.error("Failed to register push:", err);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: MessagePayload) => void): () => void {
  try {
    const messaging = getMessagingInstance();
    return onMessage(messaging, callback);
  } catch {
    return () => {};
  }
}
