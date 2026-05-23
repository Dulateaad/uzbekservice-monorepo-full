import {
  collection,
  doc,
  getDoc,
  query,
  getDocs,
  where,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  type Firestore,
  type DocumentReference,
} from "firebase/firestore";
import { tsToIso } from "@/lib/gf-firestore/time";

type StockLine = {
  ref: DocumentReference;
  qtyField: "stock_quantity" | "quantity";
  qty: number;
};

/** Привязка строки заказа к документу витрины (products или inventory_items). */
async function resolveStockLineRef(
  db: Firestore,
  item: Record<string, unknown>,
): Promise<{ ref: DocumentReference; qtyField: "stock_quantity" | "quantity" } | null> {
  const fd =
    item.firestore_doc_id != null ? String(item.firestore_doc_id).trim() : "";
  const lk = String(item.line_kind ?? "product").toLowerCase();
  if (fd && lk === "inventory") {
    return { ref: doc(db, "inventory_items", fd), qtyField: "quantity" };
  }
  if (fd) {
    return { ref: doc(db, "products", fd), qtyField: "stock_quantity" };
  }
  const pid = Number(item.product_id);
  if (!Number.isFinite(pid)) return null;
  const pSnap = await getDoc(doc(db, "products", String(pid)));
  if (pSnap.exists()) {
    return { ref: doc(db, "products", pSnap.id), qtyField: "stock_quantity" };
  }
  const iq = query(collection(db, "inventory_items"), where("id", "==", pid));
  const inv = await getDocs(iq);
  if (!inv.empty) {
    return {
      ref: doc(db, "inventory_items", inv.docs[0].id),
      qtyField: "quantity",
    };
  }
  return null;
}

export async function createOrderFirestore(
  db: Firestore,
  firebaseUid: string,
  legacyUserId: number,
  orderData: Record<string, unknown>,
) {
  const items = orderData.items as any[];
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: "Пустой заказ" };
  }
  const total = orderData.total_amount as number;
  if (typeof total !== "number" || total <= 0) {
    return { success: false, error: "Неверная сумма" };
  }
  const base = JSON.parse(JSON.stringify(orderData)) as Record<string, unknown>;
  delete base.id;

  const stockByPath = new Map<string, StockLine>();
  for (const raw of items as Record<string, unknown>[]) {
    const qty = Number(raw.quantity) || 0;
    if (qty <= 0) continue;
    const resolved = await resolveStockLineRef(db, raw);
    if (!resolved) {
      return {
        success: false,
        error:
          "Не удалось сопоставить товар со складом (обновите страницу и добавьте позицию в корзину заново).",
      };
    }
    const path = resolved.ref.path;
    const cur = stockByPath.get(path);
    if (cur) {
      cur.qty += qty;
    } else {
      stockByPath.set(path, {
        ref: resolved.ref,
        qtyField: resolved.qtyField,
        qty,
      });
    }
  }

  try {
    const orderId = await runTransaction(db, async (transaction) => {
      for (const line of stockByPath.values()) {
        const snap = await transaction.get(line.ref);
        if (!snap.exists()) {
          throw new Error("Товар на складе не найден");
        }
        const d = snap.data() as Record<string, unknown>;
        const cur = Number(d[line.qtyField]) || 0;
        if (cur < line.qty) {
          throw new Error("Недостаточно товара в наличии");
        }
        transaction.update(line.ref, {
          [line.qtyField]: cur - line.qty,
        } as Record<string, number>);
      }
      const orderRef = doc(collection(db, "orders"));
      const payload = {
        ...base,
        firebase_uid: firebaseUid,
        user_id: legacyUserId,
        created_at: serverTimestamp(),
      };
      transaction.set(orderRef, payload);
      return orderRef.id;
    });

    return {
      success: true,
      message: "Заказ успешно создан",
      order: {
        ...base,
        id: orderId,
        firebase_uid: firebaseUid,
        user_id: legacyUserId,
        created_at: new Date().toISOString(),
      },
    };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Не удалось оформить заказ (склад)";
    return { success: false, error: msg };
  }
}

export async function getUserOrdersFirestore(
  db: Firestore,
  firebaseUid: string,
) {
  const q = query(
    collection(db, "orders"),
    where("firebase_uid", "==", firebaseUid),
  );
  const snap = await getDocs(q);
  const orders = snap.docs.map((d) => {
    const o = d.data() as Record<string, unknown>;
    return {
      ...o,
      id: o.id ?? d.id,
      created_at: tsToIso(o.created_at) || o.created_at,
    };
  });
  orders.sort((a: any, b: any) =>
    String(b.created_at || "").localeCompare(String(a.created_at || "")),
  );
  return { success: true, orders };
}

/** Одна запись заказа (владелец или staff): данные из Firestore для всех экранов заказа. */
export async function getOrderByIdFirestore(
  db: Firestore,
  orderId: string,
  firebaseUid: string,
  isStaff: boolean,
) {
  const ref = doc(db, "orders", orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { success: false, error: "Заказ не найден" };
  }
  const d = snap.data() as Record<string, unknown>;
  const ownerUid = String(d.firebase_uid ?? "");
  if (!isStaff && ownerUid !== firebaseUid) {
    return { success: false, error: "Нет доступа к заказу" };
  }

  const rawItems = Array.isArray(d.items) ? d.items : [];
  const items = rawItems.map((it: Record<string, unknown>, i: number) => {
    const unit = Number(it.unit_price ?? it.price) || 0;
    const qty = Number(it.quantity) || 0;
    const pid = Number(it.product_id) || i;
    const pname = String(
      it.product_name ?? it.name ?? `Товар #${it.product_id ?? i}`,
    );
    return {
      id: String(pid),
      product_id: pid,
      product_name: pname,
      quantity: qty,
      unit_price: unit,
      price: unit,
      truck_id: it.truck_id != null ? String(it.truck_id) : null,
      truck_identifier:
        it.truck_identifier != null ? String(it.truck_identifier) : null,
      truck_arrival_date:
        it.truck_arrival_date != null ? String(it.truck_arrival_date) : null,
    };
  });

  const created =
    tsToIso(d.created_at) ||
    (typeof d.created_at === "string" ? d.created_at : null) ||
    new Date().toISOString();
  const deliveryDateRaw = d.delivery_date;
  const deliveryStr =
    typeof deliveryDateRaw === "string"
      ? deliveryDateRaw
      : deliveryDateRaw != null &&
          typeof deliveryDateRaw === "object" &&
          "toDate" in deliveryDateRaw
        ? (deliveryDateRaw as { toDate: () => Date }).toDate().toISOString()
        : created;

  const statusRaw = String(d.status ?? d.payment_status ?? "pending").toLowerCase();
  let statusRetail: "processing" | "shipped" | "delivered" | "cancelled" =
    "processing";
  if (statusRaw === "delivered") statusRetail = "delivered";
  else if (statusRaw === "cancelled" || statusRaw === "canceled") {
    statusRetail = "cancelled";
  } else if (statusRaw === "shipped" || statusRaw === "sent") {
    statusRetail = "shipped";
  }

  return {
    ...d,
    id: snap.id,
    created_at: created,
    items,
    order_number: String(d.order_number ?? `#${snap.id.slice(-8)}`),
    total_amount: Number(d.total_amount) || 0,
    city: String(d.delivery_city ?? d.city ?? "—"),
    delivery_date: deliveryStr,
    status: statusRaw,
    status_retail: statusRetail,
  };
}

function mapOrderDoc(d: Record<string, unknown>, docId: string) {
  const rawItems = Array.isArray(d.items) ? d.items : [];
  const items = rawItems.map((it: Record<string, unknown>, i: number) => ({
    product_id: Number(it.product_id) || i,
    product_name: String(it.product_name ?? it.name ?? `Товар #${it.product_id ?? i}`),
    quantity: Number(it.quantity) || 0,
    unit_price: Number(it.unit_price ?? it.price) || 0,
    truck_id: it.truck_id != null ? String(it.truck_id) : null,
    truck_identifier: it.truck_identifier != null ? String(it.truck_identifier) : null,
    truck_arrival_date: it.truck_arrival_date != null ? String(it.truck_arrival_date) : null,
  }));

  const created = tsToIso(d.created_at) || (typeof d.created_at === "string" ? d.created_at : new Date().toISOString());
  const deliveryRaw = d.delivery_date;
  const delivery =
    typeof deliveryRaw === "string"
      ? deliveryRaw
      : deliveryRaw && typeof deliveryRaw === "object" && "toDate" in deliveryRaw
        ? (deliveryRaw as { toDate: () => Date }).toDate().toISOString()
        : created;

  const discountRaw = d.discount;
  const discount =
    discountRaw != null && typeof discountRaw === "object"
      ? (discountRaw as { type: "fixed" | "percent"; value: number })
      : undefined;

  return {
    id: docId,
    user_id: Number(d.user_id) || 0,
    firebase_uid: String(d.firebase_uid ?? ""),
    total_amount: Number(d.total_amount) || 0,
    status: String(d.status ?? "pending").toLowerCase(),
    delivery_city: String(d.delivery_city ?? ""),
    delivery_date: delivery,
    delivery_address: String(d.delivery_address ?? ""),
    created_at: created,
    customer_name: String(d.customer_name ?? "Клиент"),
    customer_phone: String(d.customer_phone ?? ""),
    customer_email: String(d.customer_email ?? ""),
    payment_status: String(d.payment_status ?? "pending"),
    assigned_to: d.assigned_to != null ? Number(d.assigned_to) : null,
    items,
    discount,
    discount_amount:
      d.discount_amount != null ? Number(d.discount_amount) : undefined,
  };
}

/** All orders for staff (admin/worker) */
export async function getAllOrdersFirestore(db: Firestore) {
  const snap = await getDocs(collection(db, "orders"));
  const orders = snap.docs.map((d) => mapOrderDoc(d.data() as Record<string, unknown>, d.id));
  orders.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return { success: true, orders };
}

export async function updateOrderStatusFirestore(
  db: Firestore,
  orderId: string,
  status: string,
) {
  const ref = doc(db, "orders", orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { success: false, error: "Заказ не найден" };
  await updateDoc(ref, { status, updated_at: serverTimestamp() });
  const after = (await getDoc(ref)).data() as Record<string, unknown>;
  return { success: true, order: mapOrderDoc(after, orderId) };
}

export async function updateOrderDiscountFirestore(
  db: Firestore,
  orderId: string,
  payload: {
    total_amount: number;
    discount: { type: "fixed" | "percent"; value: number };
    discount_amount: number;
  },
) {
  const ref = doc(db, "orders", orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { success: false, error: "Заказ не найден" };
  await updateDoc(ref, {
    total_amount: payload.total_amount,
    discount: payload.discount,
    discount_amount: payload.discount_amount,
    updated_at: serverTimestamp(),
  });
  const after = (await getDoc(ref)).data() as Record<string, unknown>;
  return { success: true, order: mapOrderDoc(after, orderId) };
}

export async function takeOrderFirestore(
  db: Firestore,
  orderId: string,
  staffLegacyId: number,
) {
  const ref = doc(db, "orders", orderId);
  await updateDoc(ref, { assigned_to: staffLegacyId, updated_at: serverTimestamp() });
  return { success: true };
}

export async function refundOrderFirestore(db: Firestore, orderId: string) {
  const ref = doc(db, "orders", orderId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { success: false as const, error: "Заказ не найден" };
  }
  const d = snap.data() as Record<string, unknown>;
  const ps = String(d.payment_status ?? "").toLowerCase();
  const st = String(d.status ?? "").toLowerCase();
  if (ps === "refunded" || st === "refunded") {
    return { success: true as const, order: mapOrderDoc(d, orderId) };
  }

  const rawItems = Array.isArray(d.items) ? d.items : [];
  const stockByPath = new Map<string, StockLine>();
  for (const raw of rawItems as Record<string, unknown>[]) {
    const qty = Number(raw.quantity) || 0;
    if (qty <= 0) continue;
    const resolved = await resolveStockLineRef(db, raw);
    if (!resolved) continue;
    const path = resolved.ref.path;
    const cur = stockByPath.get(path);
    if (cur) cur.qty += qty;
    else
      stockByPath.set(path, {
        ref: resolved.ref,
        qtyField: resolved.qtyField,
        qty,
      });
  }

  try {
    const result = await runTransaction(db, async (transaction) => {
      const sOrder = await transaction.get(ref);
      if (!sOrder.exists()) {
        throw new Error("Заказ не найден");
      }
      const od = sOrder.data() as Record<string, unknown>;
      const ps2 = String(od.payment_status ?? "").toLowerCase();
      const st2 = String(od.status ?? "").toLowerCase();
      if (ps2 === "refunded" || st2 === "refunded") {
        return mapOrderDoc(od, orderId);
      }

      for (const line of stockByPath.values()) {
        const s = await transaction.get(line.ref);
        if (!s.exists()) continue;
        const data = s.data() as Record<string, unknown>;
        const curQty = Number(data[line.qtyField]) || 0;
        transaction.update(line.ref, {
          [line.qtyField]: curQty + line.qty,
        } as Record<string, number>);
      }

      transaction.update(ref, {
        payment_status: "refunded",
        status: "refunded",
        updated_at: serverTimestamp(),
      });

      const merged: Record<string, unknown> = {
        ...od,
        payment_status: "refunded",
        status: "refunded",
      };
      return mapOrderDoc(merged, orderId);
    });
    return { success: true as const, order: result };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Не удалось выполнить возврат";
    return { success: false as const, error: msg };
  }
}

export async function deleteOrdersFirestore(db: Firestore, orderIds: string[]) {
  let count = 0;
  for (const id of orderIds) {
    try {
      await deleteDoc(doc(db, "orders", id));
      count++;
    } catch (e) {
      console.warn("[deleteOrders] failed for", id, e);
    }
  }
  return { success: true, deleted_count: count };
}
