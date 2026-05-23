/**
 * Создание пользователя email/пароль из админки без REST API.
 * Используется отдельный экземпляр Firebase App + Auth, чтобы не выходить из сессии администратора.
 */

import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";

const SECONDARY_APP_NAME = "gf-admin-create-user";

function getSecondaryAuth() {
  const apps = getApps();
  if (!apps.length) {
    throw new Error("Firebase не инициализирован");
  }
  const opts = apps[0]!.options;
  let app: FirebaseApp;
  try {
    app = getApp(SECONDARY_APP_NAME);
  } catch {
    app = initializeApp(opts, SECONDARY_APP_NAME);
  }
  return getAuth(app);
}

async function nextLegacyUserId(db: Firestore): Promise<number> {
  const snap = await getDocs(collection(db, "profiles"));
  let max = 0;
  snap.forEach((d) => {
    const n = Number((d.data() as { legacyUserId?: number }).legacyUserId);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return max + 1;
}

function normalizeRole(r: string): string {
  if (r === "employee") return "worker";
  return String(r || "user");
}

export type AdminCreateUserPayload = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  city?: string;
  company_name?: string;
  role: string;
  is_active: boolean;
};

export async function adminCreateEmailUserFirestore(
  db: Firestore,
  params: AdminCreateUserPayload,
) {
  const email = params.email.trim().toLowerCase();
  const password = String(params.password || "");
  if (!email) {
    return { success: false as const, error: "Укажите email" };
  }
  if (password.length < 6) {
    return {
      success: false as const,
      error: "Пароль не короче 6 символов (требование Firebase)",
    };
  }

  const secondaryAuth = getSecondaryAuth();
  let uid: string;
  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password,
    );
    uid = cred.user.uid;
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    const msg =
      code === "auth/email-already-in-use"
        ? "Этот email уже зарегистрирован в Firebase"
        : code === "auth/invalid-email"
          ? "Некорректный email"
          : code === "auth/weak-password"
            ? "Слишком слабый пароль"
            : e instanceof Error
              ? e.message
              : "Ошибка создания аккаунта";
    return { success: false as const, error: msg };
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {
      /* ignore */
    }
  }

  const legacyUserId = await nextLegacyUserId(db);
  const role = normalizeRole(params.role);

  await setDoc(doc(db, "profiles", uid), {
    legacyUserId,
    email,
    name: String(params.name || "").trim(),
    phone: String(params.phone ?? "").trim(),
    city: String(params.city ?? "").trim(),
    company_name: String(params.company_name ?? "").trim(),
    role,
    is_active: params.is_active,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    success: true as const,
    uid,
    legacyUserId,
    message: "Пользователь создан",
  };
}
