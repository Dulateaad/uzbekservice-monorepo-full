import {
  collection,
  doc,
  getDoc,
  getDocs,
  type Firestore,
} from "firebase/firestore";
import { tsToIso } from "@/lib/gf-firestore/time";

function stableNumericIdFromDocId(docId: string): number {
  let h = 0;
  for (let i = 0; i < docId.length; i++) {
    h = (Math.imul(31, h) + docId.charCodeAt(i)) | 0;
  }
  return -Math.abs(h) - 1;
}

function mapBatchItem(d: Record<string, unknown>, docId: string) {
  const price =
    (d.price_per_unit as number) ?? (d.price_per_box as number) ?? 0;
  const raw = d.id != null ? Number(d.id) : Number(docId);
  const pid = Number.isFinite(raw) ? raw : stableNumericIdFromDocId(docId);
  return {
    id: pid,
    name: String(d.name ?? ""),
    variety: (d.variety as string) ?? null,
    quantity: Number(d.stock_quantity) || 0,
    selling_price: Number(price) || 0,
    photo_url: (d.image_url as string) ?? null,
    color: (d.color as string) ?? null,
    category: (d.category as string) ?? null,
    packaging_type: (d.packaging_type as string) ?? null,
    stem_length: d.stem_length != null ? String(d.stem_length) : null,
    height: d.stem_length ?? d.height ?? null,
    firestore_doc_id: docId,
    line_kind: "product" as const,
    truck_id: null as string | null,
  };
}

function mapInventoryDocToBatchItem(d: Record<string, unknown>, docId: string) {
  const raw = d.id != null ? Number(d.id) : Number(docId);
  const pid = Number.isFinite(raw) ? raw : stableNumericIdFromDocId(docId);
  return {
    id: pid,
    name: String(d.name ?? ""),
    variety: (d.variety as string) ?? null,
    quantity: Number(d.quantity) || 0,
    selling_price: Number(d.price) || 0,
    photo_url: d.photo_url != null ? String(d.photo_url) : null,
    color: (d.color as string) ?? null,
    category: d.category != null ? String(d.category) : null,
    packaging_type: (d.packaging_type as string) ?? null,
    stem_length: d.height != null ? String(d.height) : null,
    height: d.height ?? null,
    firestore_doc_id: docId,
    line_kind: "inventory" as const,
    truck_id: d.truck_id != null ? String(d.truck_id) : null,
  };
}

function catalogItemKey(item: { name: string; category: string | null }) {
  return `${item.name.trim().toLowerCase()}|${String(item.category || "").toLowerCase()}`;
}

export async function getCatalogBatches(db: Firestore) {
  const [productSnap, invSnap] = await Promise.all([
    getDocs(collection(db, "products")),
    getDocs(collection(db, "inventory_items")),
  ]);

  // trucks collection may be staff-only; gracefully degrade for public users
  const truckMap = new Map<string, { identifier: string; arrival_date: string; status: string }>();
  try {
    const truckSnap = await getDocs(collection(db, "trucks"));
    truckSnap.docs.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      truckMap.set(d.id, {
        identifier: String(data.identifier ?? d.id),
        arrival_date: String(tsToIso(data.arrival_date) ?? data.arrival_date ?? ""),
        status: String(data.status ?? "active"),
      });
    });
  } catch {
    // Permission denied for non-staff — truck names will fall back to IDs
  }

  const fromProducts = productSnap.docs.map((d) =>
    mapBatchItem(d.data() as Record<string, unknown>, d.id),
  );
  const fromInventory = invSnap.docs.map((d) =>
    mapInventoryDocToBatchItem(d.data() as Record<string, unknown>, d.id),
  );

  // Group inventory items by truck_id
  const truckItems = new Map<string, typeof fromInventory>();
  const noTruckInv: typeof fromInventory = [];
  for (const row of fromInventory) {
    if (row.truck_id) {
      const arr = truckItems.get(row.truck_id) || [];
      arr.push(row);
      truckItems.set(row.truck_id, arr);
    } else {
      noTruckInv.push(row);
    }
  }

  // Merge products + inventory-without-truck into "Каталог" batch
  const seen = new Set<string>();
  const catalogItems: typeof fromProducts = [];
  for (const row of fromProducts) {
    catalogItems.push(row);
    seen.add(catalogItemKey(row));
  }
  for (const row of noTruckInv) {
    if (!seen.has(catalogItemKey(row))) {
      catalogItems.push(row);
      seen.add(catalogItemKey(row));
    }
  }
  catalogItems.sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const batches: Array<{
    id: string | number;
    batch_date: string;
    supplier_name: string;
    total_items: number;
    age_days: number;
    is_fresh: boolean;
    is_new: boolean;
    status: string;
    items: typeof catalogItems;
  }> = [];

  // Create a batch per truck (sorted by arrival_date desc)
  const truckEntries = [...truckItems.entries()]
    .map(([truckId, items]) => {
      const info = truckMap.get(truckId);
      return { truckId, items, info };
    })
    .sort((a, b) => {
      const da = a.info?.arrival_date || "";
      const db2 = b.info?.arrival_date || "";
      return db2.localeCompare(da);
    });

  for (const { truckId, items, info } of truckEntries) {
    if (items.length === 0) continue;
    items.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    const arrivalDate = info?.arrival_date || new Date().toISOString().slice(0, 10);
    const ageMs = Date.now() - new Date(arrivalDate).getTime();
    const ageDays = Math.max(0, Math.floor(ageMs / 86400000));
    batches.push({
      id: truckId,
      batch_date: arrivalDate,
      supplier_name: info?.identifier || truckId,
      total_items: items.length,
      age_days: ageDays,
      is_fresh: ageDays <= 3,
      is_new: ageDays <= 1,
      status: info?.status || "active",
      items,
    });
  }

  // Add catalog batch if it has items
  if (catalogItems.length > 0) {
    batches.push({
      id: "catalog",
      batch_date: new Date().toISOString().slice(0, 10),
      supplier_name: "Каталог",
      total_items: catalogItems.length,
      age_days: 0,
      is_fresh: true,
      is_new: true,
      status: "active",
      items: catalogItems,
    });
  }

  // If no truck batches, ensure at least one batch
  if (batches.length === 0 && catalogItems.length > 0) {
    batches.push({
      id: "all",
      batch_date: new Date().toISOString().slice(0, 10),
      supplier_name: "Все товары",
      total_items: catalogItems.length,
      age_days: 0,
      is_fresh: true,
      is_new: true,
      status: "active",
      items: catalogItems,
    });
  }

  return { success: true, batches, total: batches.length };
}

export async function getAvailableCategories(db: Firestore) {
  const [productSnap, invSnap] = await Promise.all([
    getDocs(collection(db, "products")),
    getDocs(collection(db, "inventory_items")),
  ]);
  const names = new Set<string>();
  productSnap.docs.forEach((d) => {
    const c = (d.data() as { category?: string }).category;
    if (c != null && String(c).trim() !== "") names.add(String(c).trim());
  });
  invSnap.docs.forEach((d) => {
    const c = (d.data() as { category?: string }).category;
    if (c != null && String(c).trim() !== "") names.add(String(c).trim());
  });
  const sorted = [...names].sort((a, b) => a.localeCompare(b, "ru"));
  return { success: true, data: sorted.map((name) => ({ name })) };
}

function mapProductRow(d: Record<string, unknown>, docId: string) {
  const pid = d.id != null ? Number(d.id) : Number(docId);
  return {
    id: pid,
    name: String(d.name ?? ""),
    category: (d.category as string) ?? null,
    color: (d.color as string) ?? null,
    variety: (d.variety as string) ?? null,
    description: (d.description as string) ?? null,
    price_per_unit: (d.price_per_unit as number) ?? null,
    price_per_box: (d.price_per_box as number) ?? null,
    stock_quantity: Number(d.stock_quantity) || 0,
    min_order_quantity: Number(d.min_order_quantity) || 1,
    stem_length: (d.stem_length as string) ?? null,
    height: (d.stem_length as string) ?? (d.height as string) ?? null,
    packaging_type: (d.packaging_type as string) ?? null,
    image_url: (d.image_url as string) ?? null,
    next_delivery_date: (d.next_delivery_date as string) ?? null,
    batch_date: (d.next_delivery_date as string) ?? null,
    created_at: tsToIso(d.created_at) ?? null,
    product_id: pid,
    firestore_doc_id: docId,
    line_kind: "product" as const,
    truck_id: null as string | null,
  };
}

function mapInventoryToProductRow(d: Record<string, unknown>, docId: string) {
  const raw = d.id != null ? Number(d.id) : Number(docId);
  const pid = Number.isFinite(raw) ? raw : stableNumericIdFromDocId(docId);
  return {
    id: pid,
    name: String(d.name ?? ""),
    category: d.category != null ? String(d.category) : null,
    color: (d.color as string) ?? null,
    variety: (d.variety as string) ?? null,
    description: null,
    price_per_unit: Number(d.price) || 0,
    price_per_box: null,
    stock_quantity: Number(d.quantity) || 0,
    min_order_quantity: 1,
    stem_length: d.height != null ? String(d.height) : null,
    height: d.height != null ? String(d.height) : null,
    packaging_type: (d.packaging_type as string) ?? null,
    image_url: d.photo_url != null ? String(d.photo_url) : null,
    next_delivery_date: null,
    batch_date: null,
    created_at: null,
    product_id: pid,
    firestore_doc_id: docId,
    line_kind: "inventory" as const,
    truck_id: d.truck_id != null ? String(d.truck_id) : null,
  };
}

export async function getAllAvailableProducts(db: Firestore) {
  const [productSnap, invSnap] = await Promise.all([
    getDocs(collection(db, "products")),
    getDocs(collection(db, "inventory_items")),
  ]);
  const fromProducts = productSnap.docs.map((d) =>
    mapProductRow(d.data() as Record<string, unknown>, d.id),
  );
  const fromInv = invSnap.docs.map((d) =>
    mapInventoryToProductRow(d.data() as Record<string, unknown>, d.id),
  );
  const seen = new Set(
    fromProducts.map((p) => catalogItemKey({ name: p.name, category: p.category })),
  );
  const data = [...fromProducts];
  for (const row of fromInv) {
    const k = catalogItemKey({ name: row.name, category: row.category });
    if (!seen.has(k)) {
      data.push(row);
      seen.add(k);
    }
  }
  data.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return { success: true, data };
}

export async function getProductById(db: Firestore, id: number) {
  const s = await getDoc(doc(db, "products", String(id)));
  if (!s.exists()) return { success: false, error: "Товар не найден" };
  return {
    success: true,
    product: mapProductRow(s.data() as Record<string, unknown>, s.id),
  };
}
