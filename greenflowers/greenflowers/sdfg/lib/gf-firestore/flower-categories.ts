/**
 * Справочник категорий цветов в Firestore (без REST).
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { getAvailableCategories } from "@/lib/gf-firestore/catalog";

const COL = "flower_categories";

export type FlowerCategoryRow = {
  id: number;
  name: string;
  description?: string;
};

function syntheticIdFromProductName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  }
  return -Math.abs(h) - 1;
}

async function nextCategoryNumericId(db: Firestore): Promise<number> {
  const snap = await getDocs(collection(db, COL));
  let max = 0;
  snap.forEach((d) => {
    const n = Number((d.data() as { categoryId?: number }).categoryId);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return max + 1;
}

/** Справочник + уникальные имена из товаров (виртуальные id отрицательные — только выбор, без удаления). */
export async function listMergedFlowerCategories(db: Firestore) {
  const explicitSnap = await getDocs(collection(db, COL));
  const explicit: FlowerCategoryRow[] = [];
  const nameLower = new Set<string>();

  explicitSnap.forEach((d) => {
    const data = d.data() as {
      categoryId?: number;
      name?: string;
      description?: string | null;
    };
    const id = Number(data.categoryId ?? d.id);
    const name = String(data.name ?? "").trim();
    if (!name) return;
    nameLower.add(name.toLowerCase());
    explicit.push({
      id: Number.isFinite(id) ? id : Number(d.id),
      name,
      description: data.description
        ? String(data.description)
        : undefined,
    });
  });

  const fromProducts = await getAvailableCategories(db);
  const rows = (fromProducts.data || []) as { name: string }[];
  for (const row of rows) {
    const name = String(row.name || "").trim();
    if (!name) continue;
    if (nameLower.has(name.toLowerCase())) continue;
    nameLower.add(name.toLowerCase());
    explicit.push({
      id: syntheticIdFromProductName(name),
      name,
    });
  }

  explicit.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return { success: true as const, data: explicit };
}

export async function createFlowerCategoryFirestore(
  db: Firestore,
  data: { name: string; description?: string },
) {
  const name = data.name.trim();
  if (!name) {
    return { success: false as const, error: "Введите имя категории" };
  }
  const id = await nextCategoryNumericId(db);
  const description = data.description?.trim();
  await setDoc(doc(db, COL, String(id)), {
    categoryId: id,
    name,
    description: description || null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return {
    success: true as const,
    data: {
      id,
      name,
      description: description || undefined,
    },
  };
}

export async function deleteFlowerCategoryFirestore(db: Firestore, id: number) {
  const ref = doc(db, COL, String(id));
  const s = await getDoc(ref);
  if (!s.exists()) {
    return { success: false as const, error: "Категория не найдена" };
  }
  await deleteDoc(ref);
  return { success: true as const };
}

export async function getFlowerCategoryFirestore(db: Firestore, id: number) {
  if (id < 0) {
    return {
      success: false as const,
      error: "Категория задана только товарами",
    };
  }
  const s = await getDoc(doc(db, COL, String(id)));
  if (!s.exists()) {
    return { success: false as const, error: "Категория не найдена" };
  }
  const d = s.data() as {
    name?: string;
    description?: string | null;
    categoryId?: number;
  };
  return {
    success: true as const,
    data: {
      id: Number(d.categoryId ?? id),
      name: String(d.name ?? ""),
      description: d.description ? String(d.description) : undefined,
    },
  };
}

export async function updateFlowerCategoryFirestore(
  db: Firestore,
  id: number,
  data: { name?: string; description?: string },
) {
  if (id < 0) {
    return {
      success: false as const,
      error: "Нельзя редактировать категорию, которая есть только у товаров",
    };
  }
  const ref = doc(db, COL, String(id));
  const s = await getDoc(ref);
  if (!s.exists()) {
    return { success: false as const, error: "Категория не найдена" };
  }
  const patch: Record<string, unknown> = { updated_at: serverTimestamp() };
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.description !== undefined) {
    patch.description = data.description.trim() || null;
  }
  await updateDoc(ref, patch);
  const after = await getDoc(ref);
  const d = after.data() as {
    name?: string;
    description?: string | null;
    categoryId?: number;
  };
  return {
    success: true as const,
    data: {
      id: Number(d.categoryId ?? id),
      name: String(d.name ?? ""),
      description: d.description ? String(d.description) : undefined,
    },
  };
}
