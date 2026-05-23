"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase";

type AuthState = {
  user: User | null;
  loading: boolean;
  firebaseOk: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const Ctx = createContext<AuthState | null>(null);

export function PlayerOneProviders({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const firebaseOk = typeof window !== "undefined" && isFirebaseConfigured();

  useEffect(() => {
    if (!firebaseOk) {
      setLoading(false);
      return;
    }
    const { auth } = getFirebase();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, [firebaseOk]);

  const signInWithGoogle = useCallback(async () => {
    const { auth } = getFirebase();
    const p = new GoogleAuthProvider();
    await signInWithPopup(auth, p);
  }, []);

  const signOut = useCallback(async () => {
    const { auth } = getFirebase();
    await firebaseSignOut(auth);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const value = useMemo(
    () =>
      ({
        user,
        loading,
        firebaseOk,
        signInWithGoogle,
        signOut,
        getIdToken,
      }) satisfies AuthState,
    [user, loading, firebaseOk, signInWithGoogle, signOut, getIdToken]
  );

  return (
    <QueryClientProvider client={qc}>
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
    </QueryClientProvider>
  );
}

export function usePlayerOneAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayerOneAuth outside PlayerOneProviders");
  return v;
}
