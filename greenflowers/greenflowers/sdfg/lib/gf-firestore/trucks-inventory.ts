/**
 * Фуры и позиции склада в Firestore (без REST / NEXT_PUBLIC_API_URL).
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  type FirebaseApp,
} from "firebase/storage";
import { tsToIso } from "@/lib/gf-firestore/time";

export interface TruckRow {
  id: string;
  identifier: string;
  arrival_date: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItemRow {
  id: number;
  truck_id: string;
  name: string;
  variety: string;
  quantity: number;
  price: number;
  photo_url?: string;
  category?: string | null;
  height?: string | number | null;
  created_at: string;
  updated_at: string;
}

async function nextInventoryItemNumericId(db: Firestore): Promise<number> {
  const snap = await getDocs(collection(db, "inventory_items"));
  let max = 0;
  snap.forEach((d) => {
    const n = Number((d.data() as { id?: number }).id);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return max + 1;
}

function mapTruck(d: Record<string, unknown>, docId: string): TruckRow {
  return {
    id: docId,
    identifier: String(d.identifier ?? ""),
    arrival_date: String(d.arrival_date ?? "").slice(0, 10),
    status: String(d.status ?? "pending"),
    notes: d.notes != null ? String(d.notes) : undefined,
    created_at: tsToIso(d.created_at) ?? undefined,
    updated_at: tsToIso(d.updated_at) ?? undefined,
  };
}

function mapItem(
  d: Record<string, unknown>,
  docId: string,
): InventoryItemRow {
  const id = (d.id as number) ?? Number(docId);
  return {
    id: Number.isFinite(id) ? id : Number(docId),
    truck_id: String(d.truck_id ?? ""),
    name: String(d.name ?? ""),
    variety: String(d.variety ?? ""),
    quantity: Number(d.quantity) || 0,
    price: Number(d.price) || 0,
    photo_url: d.photo_url != null ? String(d.photo_url) : undefined,
    category: d.category != null ? String(d.category) : null,
    height: d.height as number | string | null | undefined,
    created_at: tsToIso(d.created_at) ?? new Date().toISOString(),
    updated_at: tsToIso(d.updated_at) ?? new Date().toISOString(),
  };
}

export async function listTrucksFirestore(db: Firestore) {
  const snap = await getDocs(collection(db, "trucks"));
  const rows = snap.docs.map((x) =>
    mapTruck(x.data() as Record<string, unknown>, x.id),
  );
  rows.sort((a, b) => String(b.arrival_date).localeCompare(String(a.arrival_date)));
  return { success: true, data: rows };
}

export async function getTruckFirestore(db: Firestore, truckId: string) {
  const snap = await getDoc(doc(db, "trucks", truckId));
  if (!snap.exists()) {
    return { success: false, error: "Фура не найдена" };
  }
  return {
    success: true,
    data: mapTruck(snap.data() as Record<string, unknown>, snap.id),
  };
}

export async function updateTruckFirestore(
  db: Firestore,
  truckId: string,
  patch: Record<string, unknown>,
) {
  const ref = doc(db, "trucks", truckId);
  const clean: Record<string, unknown> = { updated_at: serverTimestamp() };
  if (patch.identifier !== undefined) clean.identifier = String(patch.identifier);
  if (patch.arrival_date !== undefined) {
    clean.arrival_date = String(patch.arrival_date).slice(0, 10);
  }
  if (patch.status !== undefined) clean.status = String(patch.status);
  if (patch.notes !== undefined) clean.notes = patch.notes;
  await updateDoc(ref, clean);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { success: false, error: "Не найдено" };
  return {
    success: true,
    data: mapTruck(snap.data() as Record<string, unknown>, snap.id),
  };
}

export async function createTruckFirestore(
  db: Firestore,
  uid: string,
  payload: {
    identifier: string;
    arrival_date: string;
    status?: string;
    notes?: string;
  },
) {
  const ref = await addDoc(collection(db, "trucks"), {
    identifier: payload.identifier,
    arrival_date: payload.arrival_date.slice(0, 10),
    status: payload.status ?? "pending",
    notes: payload.notes ?? "",
    created_by_uid: uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  const row = mapTruck(
    {
      identifier: payload.identifier,
      arrival_date: payload.arrival_date,
      status: payload.status ?? "pending",
    },
    ref.id,
  );
  return { success: true, message: "OK", data: row };
}

export async function deleteTruckFirestore(db: Firestore, truckId: string) {
  const iq = query(
    collection(db, "inventory_items"),
    where("truck_id", "==", truckId),
  );
  const items = await getDocs(iq);
  for (const d of items.docs) {
    await deleteDoc(d.ref);
  }
  await deleteDoc(doc(db, "trucks", truckId));
  return { success: true, message: "OK" };
}

export async function listInventoryItemsForTruck(
  db: Firestore,
  truckId: string,
) {
  const iq = query(
    collection(db, "inventory_items"),
    where("truck_id", "==", truckId),
  );
  const snap = await getDocs(iq);
  const rows = snap.docs.map((x) =>
    mapItem(x.data() as Record<string, unknown>, x.id),
  );
  rows.sort((a, b) => b.id - a.id);
  return { success: true, data: rows };
}

export async function createInventoryItemFromFormData(
  db: Firestore,
  app: FirebaseApp,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const truck_id = String(formData.get("truck_id") ?? "");
  const quantity = Number(formData.get("quantity")) || 0;
  const price = Number(String(formData.get("price") ?? "").replace(",", ".")) || 0;
  const variety = String(formData.get("variety") ?? "").trim();
  const categoryRaw = formData.get("category");
  const category =
    categoryRaw != null && String(categoryRaw).trim() !== ""
      ? String(categoryRaw).trim()
      : null;
  const heightRaw = formData.get("height");
  const height =
    heightRaw != null && String(heightRaw).trim() !== ""
      ? String(heightRaw).trim()
      : null;
  const photoUrlField = formData.get("photo_url");
  const existingPhoto =
    photoUrlField != null && String(photoUrlField).startsWith("http")
      ? String(photoUrlField)
      : "";

  if (!name || !truck_id) {
    return { success: false, error: "Название и партия обязательны" };
  }

  const id = await nextInventoryItemNumericId(db);
  const docId = String(id);
  let photo_url = existingPhoto;

  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const storage = getStorage(app);
    const sref = ref(storage, `inventory/${truck_id}/${docId}.jpg`);
    await uploadBytes(sref, file, {
      contentType: file.type || "image/jpeg",
    });
    photo_url = await getDownloadURL(sref);
  }

  if (!photo_url) {
    return { success: false, error: "Нужно фото или photo_url" };
  }

  const now = serverTimestamp();
  await setDoc(doc(db, "inventory_items", docId), {
    id,
    truck_id,
    name,
    variety,
    quantity,
    price,
    photo_url,
    category,
    height,
    created_at: now,
    updated_at: now,
  });

  const row = mapItem(
    {
      id,
      truck_id,
      name,
      variety,
      quantity,
      price,
      photo_url,
      category,
      height,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    docId,
  );

  return { success: true, data: row };
}

export async function updateInventoryItemFirestore(
  db: Firestore,
  itemId: number,
  patch: Record<string, unknown>,
) {
  const docId = String(itemId);
  const ref = doc(db, "inventory_items", docId);
  const clean: Record<string, unknown> = { updated_at: serverTimestamp() };
  if (patch.quantity !== undefined) clean.quantity = Number(patch.quantity);
  if (patch.price !== undefined) clean.price = Number(patch.price);
  if (patch.category !== undefined) clean.category = patch.category;
  if (patch.height !== undefined) clean.height = patch.height;
  await updateDoc(ref, clean);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { success: true, data: { id: itemId, ...patch } };
  }
  return {
    success: true,
    data: mapItem(snap.data() as Record<string, unknown>, snap.id),
  };
}

export async function deleteInventoryItemFirestore(
  db: Firestore,
  itemId: number,
) {
  await deleteDoc(doc(db, "inventory_items", String(itemId)));
  return { success: true, message: "OK" };
}
