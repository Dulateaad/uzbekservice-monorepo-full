/**
 * Пользователи для админки / сотрудника из коллекции profiles (без REST API).
 */

import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { tsToIso } from "@/lib/gf-firestore/time";

function stableIdFromUid(uid: string): number {
  let h = 0;
  for (let i = 0; i < uid.length; i++) {
    h = Math.imul(31, h) + uid.charCodeAt(i);
  }
  return Math.abs(h) % 2000000000;
}

function normalizeRole(r: unknown): string {
  if (r === "employee") return "worker";
  return String(r || "user");
}

export type ListedUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  company_name: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  /** Firestore document id profiles/{profileUid} */
  profileUid: string;
};

function mapDoc(
  data: Record<string, unknown>,
  profileUid: string,
): ListedUser {
  const legacy = Number(data.legacyUserId);
  const id =
    Number.isFinite(legacy) && legacy > 0 ? legacy : stableIdFromUid(profileUid);
  return {
    id,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    city: String(data.city ?? ""),
    company_name: String(data.company_name ?? ""),
    role: normalizeRole(data.role),
    is_active: data.is_active !== false,
    created_at: tsToIso(data.created_at) ?? undefined,
    profileUid,
  };
}

export async function listProfilesForAdmin(db: Firestore) {
  const snap = await getDocs(collection(db, "profiles"));
  const users = snap.docs.map((d) =>
    mapDoc(d.data() as Record<string, unknown>, d.id),
  );
  users.sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email, "ru"),
  );
  return { success: true, users };
}

/** Контрагенты для worker: только роль user */
export async function listProfilesForWorker(db: Firestore) {
  const snap = await getDocs(collection(db, "profiles"));
  const users = snap.docs
    .map((d) => mapDoc(d.data() as Record<string, unknown>, d.id))
    .filter((u) => u.role === "user");
  users.sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email, "ru"),
  );
  return { success: true, users };
}

async function resolveProfileUid(
  db: Firestore,
  userId: number,
  hint?: string,
): Promise<string | null> {
  if (hint) {
    const snap = await getDocs(collection(db, "profiles"));
    const found = snap.docs.find((d) => d.id === hint);
    if (found) return found.id;
  }
  const snap = await getDocs(collection(db, "profiles"));
  for (const d of snap.docs) {
    const p = d.data() as { legacyUserId?: number };
    const lid = Number(p.legacyUserId);
    const id =
      Number.isFinite(lid) && lid > 0 ? lid : stableIdFromUid(d.id);
    if (id === userId) return d.id;
  }
  return null;
}

export async function updateUserProfileFirestore(
  db: Firestore,
  userId: number,
  userData: Record<string, unknown>,
  profileUidHint?: string,
) {
  const uid = await resolveProfileUid(db, userId, profileUidHint);
  if (!uid) return { success: false, error: "Пользователь не найден" };

  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (userData.name !== undefined) patch.name = String(userData.name);
  if (userData.email !== undefined) patch.email = String(userData.email);
  if (userData.phone !== undefined) patch.phone = String(userData.phone);
  if (userData.city !== undefined) patch.city = String(userData.city);
  if (userData.company_name !== undefined) {
    patch.company_name = String(userData.company_name);
  }
  if (userData.role !== undefined) patch.role = String(userData.role);
  if (userData.is_active !== undefined) patch.is_active = Boolean(userData.is_active);

  await updateDoc(doc(db, "profiles", uid), patch);
  return { success: true, message: "OK" };
}

export async function updateUserRoleFirestore(
  db: Firestore,
  userId: number,
  newRole: string,
  profileUidHint?: string,
) {
  const uid = await resolveProfileUid(db, userId, profileUidHint);
  if (!uid) return { success: false, error: "Пользователь не найден" };
  await updateDoc(doc(db, "profiles", uid), {
    role: String(newRole),
    updatedAt: serverTimestamp(),
  });
  return { success: true };
}

/** «Удаление» = деактивация профиля (Auth не трогаем) */
export async function deactivateUserProfileFirestore(
  db: Firestore,
  userId: number,
  profileUidHint?: string,
) {
  const uid = await resolveProfileUid(db, userId, profileUidHint);
  if (!uid) return { success: false, error: "Пользователь не найден" };
  await updateDoc(doc(db, "profiles", uid), {
    is_active: false,
    updatedAt: serverTimestamp(),
  });
  return { success: true };
}
