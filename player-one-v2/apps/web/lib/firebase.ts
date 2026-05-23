import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export type FirebaseClients = {
  app: FirebaseApp;
  auth: Auth;
  storage: FirebaseStorage;
};

function required(name: string, v: string | undefined): string {
  const x = (v || "").trim();
  if (!x) throw new Error(`Missing ${name}`);
  return x;
}

export function isFirebaseConfigured(): boolean {
  try {
    required("NEXT_PUBLIC_FIREBASE_API_KEY", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    required("NEXT_PUBLIC_FIREBASE_PROJECT_ID", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    return true;
  } catch {
    return false;
  }
}

let cached: FirebaseClients | null = null;

export function getFirebase(): FirebaseClients {
  if (cached) return cached;
  const config = {
    apiKey: required("NEXT_PUBLIC_FIREBASE_API_KEY", process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || undefined,
    projectId: required("NEXT_PUBLIC_FIREBASE_PROJECT_ID", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || undefined,
  };
  const app = getApps().length === 0 ? initializeApp(config) : getApps()[0]!;
  cached = {
    app,
    auth: getAuth(app),
    storage: getStorage(app),
  };
  return cached;
}
