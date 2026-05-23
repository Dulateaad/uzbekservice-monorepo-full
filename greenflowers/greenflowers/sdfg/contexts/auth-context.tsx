"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { getFirebaseAuth, getFirebaseApp, getFirestoreDb } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  signInEmailAndLoadProfile,
  signOutFirebase,
  syncProfileFromFirestore,
  createMinimalPhoneProfile,
  type PendingPhoneProfile,
} from "@/lib/gf-firestore/auth-profile";
import {
  sendPhoneVerificationCode,
  confirmPhoneVerificationCode,
  clearPhoneAuthSession,
  type PhoneRecaptchaOptions,
} from "@/lib/gf-firestore/phone-auth";
import type { GreenflowersUser, UserRole } from "@/lib/gf-user-types";

export type { UserRole };
export type User = GreenflowersUser;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    phone: string,
    code: string,
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    phone: string,
    code: string,
    name: string,
    city: string,
  ) => Promise<{ success: boolean; error?: string }>;
  sendSmsCode: (
    phone: string,
    recaptcha?: PhoneRecaptchaOptions,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (userData: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function firebaseAuthErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();

  if (code === "auth/invalid-verification-code") return "Неверный код из SMS";
  if (code === "auth/code-expired") return "Код истёк — запросите новый";
  if (code === "auth/too-many-requests") return "Слишком много попыток — подождите";
  if (code === "auth/invalid-phone-number") return "Неверный номер телефона";
  if (code === "auth/missing-phone-number") return "Укажите номер телефона";
  if (code === "auth/network-request-failed" || lower.includes("failed to fetch")) {
    return "Нет сети или сервис временно недоступен — повторите позже";
  }
  if (code === "auth/internal-error" || msg.includes("-39")) {
    return "Сервис SMS временно недоступен (ошибка Firebase). Повторите через несколько минут или попробуйте другой номер/сеть.";
  }
  if (lower.includes("503") || lower.includes("service unavailable")) {
    return "Сервер Firebase временно недоступен (503). Повторите позже.";
  }

  return msg || "Ошибка входа";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pendingPhoneProfileRef = useRef<PendingPhoneProfile | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    if (auth && db && getFirebaseApp()) {
      const unsub = onAuthStateChanged(auth, async (fu) => {
        if (fu && db) {
          const pending = pendingPhoneProfileRef.current;
          pendingPhoneProfileRef.current = null;
          try {
            const u = await syncProfileFromFirestore(
              db,
              fu,
              pending || undefined,
            );
            setUser(u);
            localStorage.setItem("greenflowers_user", JSON.stringify(u));
            window.dispatchEvent(new Event("greenflowers_login"));
          } catch (e) {
            console.error("syncProfileFromFirestore:", e);
            try {
              if (fu.phoneNumber) {
                const u = await createMinimalPhoneProfile(
                  db,
                  fu,
                  pending || undefined,
                );
                setUser(u);
                localStorage.setItem("greenflowers_user", JSON.stringify(u));
                window.dispatchEvent(new Event("greenflowers_login"));
              } else {
                setUser(null);
                localStorage.removeItem("greenflowers_user");
              }
            } catch (e2) {
              console.error("createMinimalPhoneProfile:", e2);
              setUser(null);
              localStorage.removeItem("greenflowers_user");
            }
          }
          setIsLoading(false);
        } else {
          const raw = localStorage.getItem("greenflowers_user");
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as GreenflowersUser;
              if (!parsed.firebaseUid) {
                setUser(parsed);
                setIsLoading(false);
                return;
              }
            } catch {
              localStorage.removeItem("greenflowers_user");
            }
          }
          setUser(null);
          localStorage.removeItem("greenflowers_user");
          setIsLoading(false);
        }
      });
      return () => unsub();
    }
    const savedUser = localStorage.getItem("greenflowers_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("greenflowers_user");
      }
    }
    setIsLoading(false);
  }, []);

  const sendSmsCode = async (
    phone: string,
    recaptcha?: PhoneRecaptchaOptions,
  ) => {
    const auth = getFirebaseAuth();
    if (!auth || !getFirebaseApp()) {
      return {
        success: false,
        error: "Firebase не настроен (NEXT_PUBLIC_FIREBASE_* в .env)",
      };
    }
    try {
      await sendPhoneVerificationCode(auth, phone, recaptcha);
      return { success: true };
    } catch (e) {
      return { success: false, error: firebaseAuthErrorMessage(e) };
    }
  };

  const login = async (phone: string, code: string) => {
    const auth = getFirebaseAuth();
    if (!auth || !getFirebaseApp()) {
      return {
        success: false,
        error: "Firebase не настроен",
      };
    }
    pendingPhoneProfileRef.current = null;
    try {
      await confirmPhoneVerificationCode(code);
      return { success: true };
    } catch (e) {
      clearPhoneAuthSession();
      return { success: false, error: firebaseAuthErrorMessage(e) };
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    if (!auth || !db) {
      return {
        success: false,
        error: "Вход по email доступен только при настроенном Firebase",
      };
    }
    try {
      const u = await signInEmailAndLoadProfile(auth, db, email, password);
      setUser(u);
      localStorage.setItem("greenflowers_user", JSON.stringify(u));
      window.dispatchEvent(new Event("greenflowers_login"));
      return { success: true };
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      const msg =
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "Неверный email или пароль"
          : code === "auth/user-not-found"
            ? "Пользователь не найден в Firebase Auth"
            : (e as Error)?.message || "Ошибка входа";
      return { success: false, error: msg };
    }
  };

  const register = async (
    phone: string,
    code: string,
    name: string,
    city: string,
  ) => {
    const auth = getFirebaseAuth();
    if (!auth || !getFirebaseApp()) {
      return {
        success: false,
        error: "Firebase не настроен",
      };
    }
    pendingPhoneProfileRef.current = { name, city };
    try {
      await confirmPhoneVerificationCode(code);
      return { success: true };
    } catch (e) {
      pendingPhoneProfileRef.current = null;
      clearPhoneAuthSession();
      return { success: false, error: firebaseAuthErrorMessage(e) };
    }
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    clearPhoneAuthSession();
    if (auth) {
      try {
        await signOutFirebase(auth);
      } catch {
        /* ignore */
      }
    }
    setUser(null);
    localStorage.removeItem("greenflowers_user");
    window.dispatchEvent(new Event("greenflowers_logout"));
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem("greenflowers_user", JSON.stringify(userData));
    window.dispatchEvent(new Event("greenflowers_login"));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithEmail,
        register,
        sendSmsCode,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
