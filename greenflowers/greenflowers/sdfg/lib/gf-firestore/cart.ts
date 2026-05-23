import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  deleteDoc,
  updateDoc,
  where,
  serverTimestamp,
  getDoc,
  type Firestore,
} from "firebase/firestore";
import { tsToIso } from "@/lib/gf-firestore/time";

export type CartLineMeta = {
  firestoreDocId?: string;
  lineKind?: "product" | "inventory";
};

async function getProductDoc(db: Firestore, productId: number) {
  const ref = doc(db, "products", String(productId));
  const s = await getDoc(ref);
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

/** Данные для отображения строки корзины: каталог или склад */
async function hydrateProductForCartLine(
  db: Firestore,
  ci: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const lineKind = (ci.line_kind as string) || "product";
  const fdId = ci.firestore_doc_id as string | undefined;
  if (fdId && lineKind === "inventory") {
    const s = await getDoc(doc(db, "inventory_items", fdId));
    if (s.exists()) {
      const d = s.data() as Record<string, unknown>;
      return {
        name: d.name,
        image_url: d.photo_url,
        color: d.color,
        variety: d.variety,
        stem_length: d.height,
        packaging_type: d.packaging_type,
        price_per_unit: d.price,
        price_per_box: null,
        min_order_quantity: 1,
      };
    }
  }
  if (fdId && lineKind === "product") {
    const s = await getDoc(doc(db, "products", fdId));
    if (s.exists()) return { id: s.id, ...s.data() };
  }
  const pid = Number(ci.product_id);
  return getProductDoc(db, pid);
}

async function getMyCartDocs(db: Firestore, firebaseUid: string) {
  const q = query(
    collection(db, "cart_items"),
    where("firebase_uid", "==", firebaseUid),
  );
  return getDocs(q);
}

/**
 * Находит товар для проверки цены и отображения: products, inventory_items или по полю id на складе.
 */
async function resolveLineForCart(
  db: Firestore,
  productId: number,
  meta?: CartLineMeta,
): Promise<{
  numericId: number;
  firestoreDocId: string;
  lineKind: "product" | "inventory";
  priceHint: number;
} | null> {
  if (meta?.firestoreDocId && meta.lineKind === "inventory") {
    const s = await getDoc(doc(db, "inventory_items", meta.firestoreDocId));
    if (s.exists()) {
      const d = s.data() as Record<string, unknown>;
      const nid = Number(d.id);
      return {
        numericId: Number.isFinite(nid) ? nid : productId,
        firestoreDocId: s.id,
        lineKind: "inventory",
        priceHint: Number(d.price) || 0,
      };
    }
  }
  if (meta?.firestoreDocId && meta.lineKind === "product") {
    const s = await getDoc(doc(db, "products", meta.firestoreDocId));
    if (s.exists()) {
      const d = s.data() as Record<string, unknown>;
      const nid = Number(d.id);
      const pu =
        (d.price_per_unit as number) ?? (d.price_per_box as number) ?? 0;
      return {
        numericId: Number.isFinite(nid) ? nid : productId,
        firestoreDocId: s.id,
        lineKind: "product",
        priceHint: Number(pu) || 0,
      };
    }
  }

  const p = await getProductDoc(db, productId);
  if (p) {
    const d = p as Record<string, unknown>;
    const pu =
      (d.price_per_unit as number) ?? (d.price_per_box as number) ?? 0;
    return {
      numericId: productId,
      firestoreDocId: String((p as { id?: string }).id ?? productId),
      lineKind: "product",
      priceHint: Number(pu) || 0,
    };
  }

  const iq = query(
    collection(db, "inventory_items"),
    where("id", "==", productId),
  );
  const invSnap = await getDocs(iq);
  if (!invSnap.empty) {
    const s = invSnap.docs[0];
    const d = s.data() as Record<string, unknown>;
    return {
      numericId: productId,
      firestoreDocId: s.id,
      lineKind: "inventory",
      priceHint: Number(d.price) || 0,
    };
  }

  return null;
}

export async function loadCartFirestore(
  db: Firestore,
  firebaseUid: string,
  _legacyUserId: number,
) {
  const snap = await getMyCartDocs(db, firebaseUid);
  const rows: any[] = [];
  for (const d of snap.docs) {
    try {
      const ci = d.data() as Record<string, unknown>;
      const pid = Number(ci.product_id);
      let p: Record<string, unknown> | null = null;
      try {
        p = await hydrateProductForCartLine(db, ci);
      } catch (e) {
        console.warn("[loadCart] hydrate failed for doc", d.id, e);
      }
      rows.push({
        id: ci.id,
        user_id: ci.user_id,
        product_id: pid,
        quantity: ci.quantity,
        truck_id: ci.truck_id ?? null,
        unit_price: ci.unit_price,
        batch_date: ci.batch_date ?? null,
        created_at: tsToIso(ci.created_at),
        updated_at: tsToIso(ci.updated_at),
        firestore_doc_id: ci.firestore_doc_id ?? null,
        line_kind: ci.line_kind ?? "product",
        name: (p as any)?.name ?? "Удалённый товар",
        price_per_box: (p as any)?.price_per_box ?? null,
        color: (p as any)?.color ?? null,
        variety: (p as any)?.variety ?? null,
        stem_length: (p as any)?.stem_length ?? null,
        packaging_type: (p as any)?.packaging_type ?? null,
        image_url: (p as any)?.image_url ?? null,
        min_order_quantity: (p as any)?.min_order_quantity ?? 1,
        arrival_date: ci.arrival_date ?? null,
        truck_identifier: ci.truck_identifier ?? null,
        price_per_unit: ci.unit_price ?? (p as any)?.price_per_unit,
        product_missing: !p,
      });
    } catch (e) {
      console.warn("[loadCart] skipping bad cart doc", d.id, e);
    }
  }
  rows.sort((a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || "")),
  );
  return { success: true, cart: rows };
}

function newLineId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function sameCartLine(
  cur: Record<string, unknown>,
  resolved: { numericId: number; firestoreDocId: string; lineKind: string },
  wantTruck: string | null,
) {
  const curFd = (cur.firestore_doc_id as string) || "";
  const curKind = (cur.line_kind as string) || "product";
  if (curFd && resolved.firestoreDocId) {
    return (
      curFd === resolved.firestoreDocId &&
      curKind === resolved.lineKind &&
      (cur.truck_id ?? null) === wantTruck
    );
  }
  return (
    Number(cur.product_id) === resolved.numericId &&
    curKind === resolved.lineKind &&
    (cur.truck_id ?? null) === wantTruck
  );
}

export async function addToCartFirestore(
  db: Firestore,
  firebaseUid: string,
  legacyUserId: number,
  productId: number,
  quantity: number,
  truckId: string | null,
  unitPrice: number,
  meta?: CartLineMeta,
) {
  const resolved = await resolveLineForCart(db, productId, meta);
  if (!resolved) {
    return { success: false, error: "Товар не найден" };
  }
  const dbPrice = resolved.priceHint;
  const unit_price =
    unitPrice !== undefined && unitPrice !== null && unitPrice > 0
      ? unitPrice
      : dbPrice;

  const snap = await getMyCartDocs(db, firebaseUid);
  const wantTruck = truckId ?? null;
  const docMatch = snap.docs.find((d) => {
    const cur = d.data() as Record<string, unknown>;
    return sameCartLine(cur, resolved, wantTruck);
  });

  if (docMatch) {
    const cur = docMatch.data() as any;
    const newQty = (cur.quantity || 0) + quantity;
    await updateDoc(docMatch.ref, {
      quantity: newQty,
      unit_price,
      updated_at: serverTimestamp(),
    });
    return { success: true };
  }

  const lineId = newLineId();
  await setDoc(doc(db, "cart_items", String(lineId)), {
    id: lineId,
    firebase_uid: firebaseUid,
    user_id: legacyUserId,
    product_id: resolved.numericId,
    line_kind: resolved.lineKind,
    firestore_doc_id: resolved.firestoreDocId,
    quantity,
    truck_id: wantTruck,
    unit_price,
    batch_date: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return { success: true };
}

export async function removeFromCartFirestore(
  db: Firestore,
  firebaseUid: string,
  itemId: number,
) {
  const snap = await getMyCartDocs(db, firebaseUid);
  const found = snap.docs.find(
    (d) => Number((d.data() as any).id) === Number(itemId),
  );
  if (!found) return { success: false, error: "Не найдено" };
  await deleteDoc(found.ref);
  return { success: true };
}

export async function updateQuantityFirestore(
  db: Firestore,
  firebaseUid: string,
  itemId: number,
  quantity: number,
) {
  const snap = await getMyCartDocs(db, firebaseUid);
  const found = snap.docs.find(
    (d) => Number((d.data() as any).id) === Number(itemId),
  );
  if (!found) return { success: false };
  if (quantity <= 0) {
    await deleteDoc(found.ref);
    return { success: true };
  }
  await updateDoc(found.ref, {
    quantity,
    updated_at: serverTimestamp(),
  });
  return { success: true };
}

export async function clearCartFirestore(db: Firestore, firebaseUid: string) {
  const snap = await getMyCartDocs(db, firebaseUid);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  return { success: true };
}
