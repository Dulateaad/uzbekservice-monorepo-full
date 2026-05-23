import {
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
  type Auth,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { GreenflowersUser as User } from "@/lib/gf-user-types";
import { normalizePhoneE164 } from "@/lib/gf-firestore/phone-auth";

/** Номера с ролью admin при входе по телефону (E.164 как в Firebase Auth). */
const ADMIN_PHONES_E164 = new Set<string>(["+77082354533"]);

function isAdminPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const trimmed = String(phone).trim();
  const norm = normalizePhoneE164(trimmed);
  return ADMIN_PHONES_E164.has(trimmed) || (norm !== "" && ADMIN_PHONES_E164.has(norm));
}

function roleWithPhoneOverride(
  phone: string | null | undefined,
  fallback: User["role"],
): User["role"] {
  return isAdminPhone(phone) ? "admin" : fallback;
}

function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}

export async function signInEmailAndLoadProfile(
  auth: Auth,
  db: Firestore,
  email: string,
  password: string,
): Promise<User> {
  const cred = await signInWithEmailAndPassword(
    auth,
    normalizeEmail(email),
    password,
  );
  return syncProfileFromFirestore(db, cred.user);
}

export type PendingPhoneProfile = { name?: string; city?: string };

/**
 * Профиль из Firestore по UID; при отсутствии — связка с users по email или телефону;
 * иначе создание записи в profiles (без sprayApi).
 */
export async function syncProfileFromFirestore(
  db: Firestore,
  fu: FirebaseUser,
  pending?: PendingPhoneProfile,
): Promise<User> {
  const uid = fu.uid;
  const profRef = doc(db, "profiles", uid);
  const profSnap = await getDoc(profRef);
  if (profSnap.exists()) {
    const p = profSnap.data();
    const phone = String(p.phone || fu.phoneNumber || "");
    let role: User["role"] = (p.role as User["role"]) || "user";
    if (isAdminPhone(phone) || isAdminPhone(fu.phoneNumber)) {
      role = "admin";
      if (p.role !== "admin") {
        await setDoc(
          profRef,
          { role: "admin", updatedAt: serverTimestamp() },
          { merge: true },
        );
      }
    }
    return {
      id: Number(p.legacyUserId) || 0,
      email: String(p.email || fu.email || ""),
      name: String(p.name || ""),
      phone,
      role,
      city: p.city ?? undefined,
      company_name: p.company_name ?? undefined,
      is_active: p.is_active !== false,
      created_at: p.created_at ?? undefined,
      firebaseUid: uid,
    };
  }

  const em = normalizeEmail(fu.email || "");
  if (em) {
    const q = query(
      collection(db, "users"),
      where("email", "==", em),
      limit(1),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const udoc = snap.docs[0];
      const d = udoc.data();
      const user: User = {
        id: d.id != null ? Number(d.id) : Number(udoc.id) || 0,
        email: String(d.email || em),
        name: String(d.name || ""),
        phone: String(d.phone || ""),
        role: roleWithPhoneOverride(
          String(d.phone || ""),
          (d.role as User["role"]) || "user",
        ),
        city: d.city ?? undefined,
        company_name: d.company_name ?? undefined,
        is_active: d.is_active !== false,
        firebaseUid: uid,
      };
      await setDoc(
        profRef,
        {
          legacyUserId: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          city: user.city ?? null,
          company_name: user.company_name ?? null,
          is_active: user.is_active,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
      return user;
    }
    throw new Error(
      "Профиль не найден в Firestore. Добавьте пользователя в коллекцию users.",
    );
  }

  const authPhone = fu.phoneNumber;
  if (authPhone) {
    // Только номер из Firebase Auth — иначе запрос к users даёт permission-denied.
    let snap: Awaited<ReturnType<typeof getDocs>> | null = null;
    try {
      const q = query(
        collection(db, "users"),
        where("phone", "==", authPhone),
        limit(1),
      );
      snap = await getDocs(q);
    } catch (e) {
      console.warn(
        "[auth-profile] Пропуск связи с users по телефону (права или формат номера):",
        e,
      );
    }

    if (snap && !snap.empty) {
      const udoc = snap.docs[0];
      const d = udoc.data();
      const user: User = {
        id: d.id != null ? Number(d.id) : Number(udoc.id) || 0,
        email: String(d.email || ""),
        name: String(d.name || ""),
        phone: String(d.phone || authPhone),
        role: roleWithPhoneOverride(
          authPhone,
          (d.role as User["role"]) || "user",
        ),
        city: d.city ?? undefined,
        company_name: d.company_name ?? undefined,
        is_active: d.is_active !== false,
        firebaseUid: uid,
      };
      await setDoc(
        profRef,
        {
          legacyUserId: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          city: user.city ?? null,
          company_name: user.company_name ?? null,
          is_active: user.is_active,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
      return user;
    }

    const legacyUserId =
      Math.floor(100000000 + Math.random() * 899999999) % 2147483647;
    const user: User = {
      id: legacyUserId,
      email: "",
      name: String(pending?.name || "Клиент"),
      phone: authPhone,
      role: roleWithPhoneOverride(authPhone, "user"),
      city: pending?.city || "Алматы",
      firebaseUid: uid,
      is_active: true,
    };
    await setDoc(
      profRef,
      {
        legacyUserId: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        city: user.city ?? null,
        company_name: null,
        is_active: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
    return user;
  }

  throw new Error(
    "Не удалось восстановить профиль: нет email и телефона в аккаунте Firebase.",
  );
}

/**
 * Если syncProfileFromFirestore упал (права на users и т.д.) — минимальный профиль в profiles/{uid}.
 */
export async function createMinimalPhoneProfile(
  db: Firestore,
  fu: FirebaseUser,
  pending?: PendingPhoneProfile,
): Promise<User> {
  const uid = fu.uid;
  const profRef = doc(db, "profiles", uid);
  const legacyUserId =
    Math.floor(100000000 + Math.random() * 899999999) % 2147483647;
  const user: User = {
    id: legacyUserId,
    email: String(fu.email || ""),
    name: String(pending?.name || "Клиент"),
    phone: String(fu.phoneNumber || ""),
    role: roleWithPhoneOverride(fu.phoneNumber, "user"),
    city: pending?.city || "Алматы",
    firebaseUid: uid,
    is_active: true,
  };
  await setDoc(
    profRef,
    {
      legacyUserId: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      city: user.city ?? null,
      company_name: null,
      is_active: true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
  return user;
}

export async function signOutFirebase(auth: Auth) {
  await signOut(auth);
}
