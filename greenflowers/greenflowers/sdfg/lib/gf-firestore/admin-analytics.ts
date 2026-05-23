/**
 * Аналитика и списки для админки без REST API.
 */

import { collection, doc, getDoc, getDocs, type Firestore } from "firebase/firestore";
import { tsToIso } from "@/lib/gf-firestore/time";

function orderCreatedMs(data: Record<string, unknown>): number {
  const raw = data.created_at;
  if (raw == null) return 0;
  if (typeof raw === "object" && raw !== null && "toDate" in raw) {
    return (raw as { toDate: () => Date }).toDate().getTime();
  }
  const iso = tsToIso(raw);
  if (iso) return new Date(iso).getTime();
  return 0;
}

/** Из строки заказа / склада: строковый id фуры (поддержка DocumentReference). */
function truckIdFromRaw(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object" && raw !== null) {
    const path = (raw as { path?: string }).path;
    if (typeof path === "string" && path.includes("/")) {
      const seg = path.split("/").pop();
      return String(seg ?? "").trim();
    }
    const id = (raw as { id?: string }).id;
    if (typeof id === "string") return id.trim();
  }
  return String(raw).trim();
}

function sameTruckId(raw: unknown, truckId: string): boolean {
  const a = truckIdFromRaw(raw);
  const b = String(truckId).trim();
  return a !== "" && b !== "" && a === b;
}

function lineHasTruck(raw: unknown): boolean {
  return truckIdFromRaw(raw) !== "";
}

/** Диапазон для аналитики фуры: валидные ISO-даты, год 1970–2100, start ≤ end. */
function normalizeTruckAnalyticsRange(startDate: string, endDate: string): {
  startIso: string;
  endIso: string;
  startMs: number;
  endMs: number;
} {
  const toParts = (raw: string) => {
    const m = /^(\d{1,6})-(\d{1,2})-(\d{1,2})/.exec(String(raw || "").trim());
    if (!m) return null;
    let y = parseInt(m[1], 10);
    if (!Number.isFinite(y)) return null;
    y = Math.min(2100, Math.max(1970, y));
    const mo = Math.min(12, Math.max(1, parseInt(m[2], 10) || 1));
    const da = Math.min(31, Math.max(1, parseInt(m[3], 10) || 1));
    return { y, mo, da };
  };

  const toIso = (p: { y: number; mo: number; da: number }) =>
    `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.da).padStart(2, "0")}`;

  const defaultEndParts = () => {
    const t = new Date();
    t.setFullYear(t.getFullYear() + 1);
    const iso = t.toISOString().split("T")[0]!;
    return toParts(iso) ?? { y: t.getFullYear(), mo: t.getMonth() + 1, da: t.getDate() };
  };

  let sp = toParts(startDate);
  let ep = toParts(endDate);
  if (!ep) ep = defaultEndParts();
  if (!sp && ep) {
    const dt = new Date(`${toIso(ep)}T12:00:00`);
    dt.setFullYear(dt.getFullYear() - 1);
    const iso = dt.toISOString().split("T")[0]!;
    sp = toParts(iso) ?? { y: Math.max(1970, ep.y - 1), mo: ep.mo, da: ep.da };
  }
  if (!sp) sp = { y: 1970, mo: 1, da: 1 };

  let startIso = toIso(sp);
  let endIso = toIso(ep);
  let startMs = new Date(`${startIso}T00:00:00`).getTime();
  let endMs = new Date(`${endIso}T23:59:59.999`).getTime();
  if (!Number.isFinite(startMs)) startMs = 0;
  if (!Number.isFinite(endMs)) endMs = Date.now() + 365 * 86400000 * 1000;
  if (startMs > endMs) {
    const tmp = startIso;
    startIso = endIso;
    endIso = tmp;
    const tms = startMs;
    startMs = endMs;
    endMs = tms;
  }
  return { startIso, endIso, startMs, endMs };
}

export async function getCityOrderCountsFirestore(db: Firestore) {
  const snap = await getDocs(collection(db, "orders"));
  const byCity: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const o = d.data() as { delivery_city?: string };
    const c = String(o.delivery_city || "").trim();
    if (!c) return;
    byCity[c] = (byCity[c] || 0) + 1;
  });
  return Object.entries(byCity).map(([city, orders]) => ({ city, orders }));
}

export async function getCityAnalyticsDetailFirestore(
  db: Firestore,
  city: string,
  startDate?: string,
  endDate?: string,
) {
  const wantCity = normalizeCityKey(city);

  const snap = await getDocs(collection(db, "orders"));
  let rows = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
    .filter((o) => {
      const oc = String(
        (o as { delivery_city?: string }).delivery_city ??
          (o as { city?: string }).city ??
          "",
      );
      return normalizeCityKey(oc) === wantCity;
    });

  if (startDate) {
    const s = new Date(startDate + "T00:00:00").getTime();
    rows = rows.filter((o) => orderCreatedMs(o) >= s);
  }
  if (endDate) {
    const e = new Date(endDate + "T23:59:59").getTime();
    rows = rows.filter((o) => orderCreatedMs(o) <= e);
  }

  function normalizeStatus(v: unknown): string {
    return String(v ?? "")
      .trim()
      .toLowerCase();
  }

  function isOrderRefunded(o: Record<string, unknown>): boolean {
    const st = normalizeStatus(o.status);
    const ps = normalizeStatus(
      (o as { payment_status?: string }).payment_status,
    );
    if (st === "refunded" || ps === "refunded") return true;
    if (st === "returned" || ps === "returned") return true;
    if (o.refunded === true) return true;
    if (String(o.is_refund ?? "").toLowerCase() === "true") return true;
    return false;
  }

  /** Сумма возврата по заказу (полный — total_amount, иначе refund_amount если задан). */
  function refundAmount(o: Record<string, unknown>): number {
    const total = Number((o as { total_amount?: number }).total_amount) || 0;
    const explicit = Number((o as { refund_amount?: number }).refund_amount);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    return total;
  }

  function itemsGrossTotal(o: Record<string, unknown>): number {
    const items = (o as { items?: unknown }).items;
    if (!Array.isArray(items)) return 0;
    let s = 0;
    for (const it of items) {
      const r = it as Record<string, unknown>;
      s +=
        (Number(r.quantity) || 0) *
        (Number(r.unit_price ?? r.price ?? 0) || 0);
    }
    return Math.round(s * 100) / 100;
  }

  /** Сумма скидки по заказу: поле discount_amount, объект discount или разница позиций и суммы. */
  function discountAmountForOrder(o: Record<string, unknown>): number {
    const total = Number((o as { total_amount?: number }).total_amount) || 0;
    const gross = itemsGrossTotal(o);
    const stored = Number((o as { discount_amount?: number }).discount_amount);
    if (Number.isFinite(stored) && stored > 0.005) {
      return Math.min(Math.round(stored * 100) / 100, gross || stored);
    }
    const implied = gross > 0 ? gross - total : 0;
    if (implied > 0.015) return Math.round(implied * 100) / 100;

    const d = o.discount as { type?: string; value?: unknown } | undefined;
    if (!d || d.value == null || gross <= 0) return 0;
    const val = Number(d.value);
    if (!Number.isFinite(val) || val < 0) return 0;
    const t = String(d.type || "").toLowerCase();
    if (t === "percent") {
      const pct = Math.min(100, val);
      return Math.round(gross * (pct / 100) * 100) / 100;
    }
    return Math.min(gross, Math.round(val * 100) / 100);
  }

  let total_sum = 0;
  let total_returns = 0;
  let total_discounts = 0;
  let total_quantity = 0;
  for (const o of rows) {
    if (isOrderRefunded(o)) {
      total_returns += refundAmount(o);
      continue;
    }
    total_discounts += discountAmountForOrder(o);
    total_sum += Number((o as { total_amount?: number }).total_amount) || 0;
    const items = (o as { items?: unknown }).items;
    if (Array.isArray(items)) {
      for (const it of items) {
        total_quantity += Number((it as { quantity?: number }).quantity) || 0;
      }
    }
  }

  return {
    city,
    orders_count: rows.length,
    total_quantity,
    total_revenue: total_sum,
    total_discounts,
    total_returns,
    total_sum,
  };
}

function normalizeCityKey(name: string): string {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function stableIdFromUid(uid: string): number {
  let h = 0;
  for (let i = 0; i < uid.length; i++) {
    h = Math.imul(31, h) + uid.charCodeAt(i);
  }
  return Math.abs(h) % 2000000000;
}

export type ListedManager = {
  id: number;
  name: string;
  email: string;
  phone: string;
  profileUid: string;
};

export async function listManagersFromProfilesFirestore(db: Firestore) {
  const snap = await getDocs(collection(db, "profiles"));
  const managers: ListedManager[] = [];
  snap.docs.forEach((d) => {
    const p = d.data() as {
      role?: string;
      legacyUserId?: number;
      name?: string;
      email?: string;
      phone?: string;
    };
    const role = p.role === "employee" ? "worker" : p.role;
    if (role !== "admin" && role !== "worker") return;
    const id =
      Number(p.legacyUserId) > 0
        ? Number(p.legacyUserId)
        : stableIdFromUid(d.id);
    managers.push({
      id,
      name: String(p.name || ""),
      email: String(p.email || ""),
      phone: String(p.phone || ""),
      profileUid: d.id,
    });
  });
  managers.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return managers;
}

export type TruckSalesRow = {
  name: string;
  variety?: string;
  total_ever: number;
  sold_before_date: number;
  sales_percentage: number;
};

function normKey(name: string, variety: string) {
  return `${String(name).trim().toLowerCase()}|||${String(variety || "").trim().toLowerCase()}`;
}

/** Продажи по позициям склада фуры за период; возвраты не учитываются в «продано». */
export async function getTruckSalesAnalyticsFirestore(
  db: Firestore,
  truckId: string,
  startDate: string,
  endDate: string,
) {
  const { startMs, endMs, startIso, endIso } = normalizeTruckAnalyticsRange(
    startDate,
    endDate,
  );

  let truck_identifier = truckId;
  try {
    const td = await getDoc(doc(db, "trucks", truckId));
    if (td.exists()) {
      const t = td.data() as { identifier?: string };
      truck_identifier = String(t.identifier || truckId);
    }
  } catch {
    /* ignore */
  }

  const [invSnap, ordersSnap] = await Promise.all([
    getDocs(collection(db, "inventory_items")),
    getDocs(collection(db, "orders")),
  ]);

  const rows = new Map<
    string,
    { name: string; variety: string; stock: number; sold: number }
  >();

  function bump(name: string, variety: string, stockDelta: number, soldDelta: number) {
    const k = normKey(name, variety);
    let r = rows.get(k);
    if (!r) {
      r = { name: name.trim() || "—", variety: String(variety || "").trim(), stock: 0, sold: 0 };
      rows.set(k, r);
    }
    r.stock += stockDelta;
    r.sold += soldDelta;
  }

  const truckProductIds = new Set<number>();
  const invByProductId = new Map<number, { name: string; variety: string }>();

  invSnap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    if (!sameTruckId(data.truck_id, truckId)) return;
    const rawName = String(data.name ?? "").trim();
    const variety = String(data.variety ?? "").trim();
    let displayName = rawName;
    if (!displayName || displayName.toLowerCase() === "id") {
      displayName = variety || `Позиция ${d.id.slice(0, 8)}`;
    }
    const qty = Number(data.quantity) || 0;
    bump(displayName, variety, qty, 0);
    const rawPid = data.id;
    const pid =
      rawPid != null && Number.isFinite(Number(rawPid)) && Number(rawPid) !== 0
        ? Number(rawPid)
        : Number.isFinite(Number(d.id))
          ? Number(d.id)
          : NaN;
    if (Number.isFinite(pid)) {
      truckProductIds.add(pid);
      if (!invByProductId.has(pid)) {
        invByProductId.set(pid, {
          name: displayName.trim() || "—",
          variety: variety.trim(),
        });
      }
    }
  });

  ordersSnap.docs.forEach((d) => {
    const o = { id: d.id, ...(d.data() as Record<string, unknown>) };
    const st = String(o.status ?? "").toLowerCase();
    const ps = String((o as { payment_status?: string }).payment_status ?? "").toLowerCase();
    if (ps === "refunded" || st === "refunded") return;
    const created = orderCreatedMs(o);
    const dateKnown = Number.isFinite(created) && created > 0;
    if (dateKnown && (created < startMs || created > endMs)) return;
    const items = (o as { items?: unknown }).items;
    if (!Array.isArray(items)) return;
    for (const it of items as Record<string, unknown>[]) {
      const pid = Number(it.product_id);
      const onThisTruckById =
        Number.isFinite(pid) && pid !== 0 && truckProductIds.has(pid);
      const lineTruck = it.truck_id;
      const byTruckField = sameTruckId(lineTruck, truckId);
      const fallbackNoTruck =
        !lineHasTruck(lineTruck) && onThisTruckById;
      if (!byTruckField && !fallbackNoTruck) continue;

      const invMeta = Number.isFinite(pid) ? invByProductId.get(pid) : undefined;
      const pname =
        String(it.product_name ?? it.name ?? "").trim() ||
        (invMeta?.name ?? "").trim() ||
        "Товар";
      const variety =
        String(it.variety ?? "").trim() || (invMeta?.variety ?? "").trim();
      const qty = Number(it.quantity) || 0;
      bump(pname, variety, 0, qty);
    }
  });

  const items: TruckSalesRow[] = [];
  for (const r of rows.values()) {
    const totalEver = Math.max(r.stock, r.sold);
    const sold = r.sold;
    const sales_percentage =
      totalEver > 0 ? Math.round((sold / totalEver) * 10000) / 100 : 0;
    items.push({
      name: r.name,
      variety: r.variety || undefined,
      total_ever: totalEver,
      sold_before_date: sold,
      sales_percentage,
    });
  }
  items.sort((a, b) => b.sold_before_date - a.sold_before_date);

  const avg =
    items.length > 0
      ? Math.round(
          (items.reduce((s, it) => s + it.sales_percentage, 0) / items.length) * 100,
        ) / 100
      : 0;

  return {
    truckId,
    truck_identifier,
    startDate: startIso,
    endDate: endIso,
    average_sales_percentage: avg,
    items,
  };
}
