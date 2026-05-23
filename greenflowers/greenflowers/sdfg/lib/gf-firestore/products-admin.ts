/**
 * Создание / правка / удаление товаров в Firestore + опционально фото в Storage.
 * Доступ: роли admin и worker (правила Firestore + Storage).
 */

import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  type FirebaseStorage,
} from "firebase/storage";
import type { FirebaseApp } from "firebase/app";

async function nextProductNumericId(db: Firestore): Promise<number> {
  const snap = await getDocs(collection(db, "products"));
  let max = 0;
  snap.forEach((d) => {
    const data = d.data() as { id?: number };
    const n = data.id != null ? Number(data.id) : Number(d.id);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return max + 1;
}

function getStorageSafe(app: FirebaseApp): FirebaseStorage {
  return getStorage(app);
}

export type ProductPayload = {
  name: string;
  category: string;
  color: string;
  variety?: string;
  stem_length?: string;
  packaging_type?: string;
  price_per_unit: number;
  price_per_box?: number | null;
  min_order_quantity: number;
  stock_quantity: number;
  description?: string;
  image_url?: string;
  next_delivery_date?: string | null;
};

export async function createProductFirestore(
  db: Firestore,
  app: FirebaseApp,
  payload: ProductPayload,
  imageFile?: File | null,
) {
  const id = await nextProductNumericId(db);
  const docId = String(id);
  let image_url = payload.image_url || "";

  if (imageFile && imageFile.size > 0) {
    const storage = getStorageSafe(app);
    const sref = ref(storage, `products/${docId}.jpg`);
    await uploadBytes(sref, imageFile, {
      contentType: imageFile.type || "image/jpeg",
    });
    image_url = await getDownloadURL(sref);
  }

  await setDoc(doc(db, "products", docId), {
    id,
    name: payload.name,
    category: payload.category,
    color: payload.color,
    variety: payload.variety ?? "",
    description: payload.description ?? "",
    price_per_unit: payload.price_per_unit,
    price_per_box: payload.price_per_box ?? null,
    stock_quantity: payload.stock_quantity,
    min_order_quantity: payload.min_order_quantity,
    stem_length: payload.stem_length ?? "",
    packaging_type: payload.packaging_type ?? "",
    image_url: image_url || null,
    next_delivery_date: payload.next_delivery_date ?? null,
    created_at: serverTimestamp(),
  });

  return { success: true };
}

export async function updateProductFirestore(
  db: Firestore,
  app: FirebaseApp,
  productId: number,
  payload: ProductPayload,
  imageFile?: File | null,
) {
  const docId = String(productId);
  let image_url = payload.image_url ?? "";

  if (imageFile && imageFile.size > 0) {
    const storage = getStorageSafe(app);
    const sref = ref(storage, `products/${docId}.jpg`);
    await uploadBytes(sref, imageFile, {
      contentType: imageFile.type || "image/jpeg",
    });
    image_url = await getDownloadURL(sref);
  }

  await setDoc(
    doc(db, "products", docId),
    {
      id: productId,
      name: payload.name,
      category: payload.category,
      color: payload.color,
      variety: payload.variety ?? "",
      description: payload.description ?? "",
      price_per_unit: payload.price_per_unit,
      price_per_box: payload.price_per_box ?? null,
      stock_quantity: payload.stock_quantity,
      min_order_quantity: payload.min_order_quantity,
      stem_length: payload.stem_length ?? "",
      packaging_type: payload.packaging_type ?? "",
      ...(image_url ? { image_url } : {}),
      next_delivery_date: payload.next_delivery_date ?? null,
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );

  return { success: true };
}

export async function deleteProductFirestore(db: Firestore, productId: number) {
  await deleteDoc(doc(db, "products", String(productId)));
  return { success: true };
}
