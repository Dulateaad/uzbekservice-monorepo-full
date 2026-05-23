/**
 * Commission calculation from Firestore data.
 *
 * Formula:
 *   A = total purchase cost of all inventory items on the truck
 *   B = A * 0.9 (estimated expenses)
 *   V = total revenue from completed orders for this truck
 *   E = V - B (profit)
 *
 * Per worker (assigned_to on orders):
 *   G = worker's total sales for this truck
 *   D = basePercent / 100 (the base commission rate as a decimal)
 *   L = (G / V) * 100 (percentage share of total sales)
 *   Result = G * D * (L / 100) — commission amount
 */

import {
  collection,
  getDocs,
  type Firestore,
} from "firebase/firestore";
import { tsToIso } from "@/lib/gf-firestore/time";

interface TruckDoc {
  id: string;
  identifier: string;
  arrival_date: string;
  status: string;
}

interface OrderItem {
  truck_id?: string | null;
  quantity: number;
  unit_price: number;
  product_name?: string;
}

interface OrderDoc {
  id: string;
  status: string;
  payment_status: string;
  assigned_to: number | null;
  items: OrderItem[];
  total_amount: number;
}

interface ProfileDoc {
  uid: string;
  legacyId: number;
  name: string;
  role: string;
}

export interface WorkerCommission {
  worker_id: number;
  worker_name: string;
  G: number;
  D: number;
  L: number;
  Result: number;
}

export interface CommissionData {
  success: boolean;
  truckId: string;
  city: string;
  analytics: {
    A: number;
    B: number;
    V: number;
    E: number;
    refunds?: number;
    netEarned?: number;
    deliveredOrdersCount?: number;
    refundCount?: number;
  };
  workers: WorkerCommission[];
  edgeCaseTriggered?: boolean;
  message?: string;
}

function stableIdFromUid(uid: string): number {
  let h = 0;
  for (let i = 0; i < uid.length; i++) {
    h = Math.imul(31, h) + uid.charCodeAt(i);
  }
  return Math.abs(h) % 2000000000;
}

async function loadProfiles(db: Firestore): Promise<ProfileDoc[]> {
  const snap = await getDocs(collection(db, "profiles"));
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const legacy = Number(data.legacyUserId);
    return {
      uid: d.id,
      legacyId: Number.isFinite(legacy) && legacy > 0 ? legacy : stableIdFromUid(d.id),
      name: String(data.name ?? ""),
      role: String(data.role === "employee" ? "worker" : (data.role || "user")),
    };
  });
}

async function loadTrucks(db: Firestore): Promise<TruckDoc[]> {
  const snap = await getDocs(collection(db, "trucks"));
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      identifier: String(data.identifier ?? d.id),
      arrival_date: String(tsToIso(data.arrival_date) ?? data.arrival_date ?? ""),
      status: String(data.status ?? "active"),
    };
  });
}

async function loadOrders(db: Firestore): Promise<OrderDoc[]> {
  const snap = await getDocs(collection(db, "orders"));
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const items: OrderItem[] = rawItems.map((it: Record<string, unknown>) => ({
      truck_id: it.truck_id != null ? String(it.truck_id) : null,
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price ?? it.price) || 0,
      product_name: String(it.product_name ?? it.name ?? ""),
    }));
    return {
      id: d.id,
      status: String(data.status ?? "pending").toLowerCase(),
      payment_status: String(data.payment_status ?? "pending").toLowerCase(),
      assigned_to: data.assigned_to != null ? Number(data.assigned_to) : null,
      items,
      total_amount: Number(data.total_amount) || 0,
    };
  });
}

async function loadInventoryItems(db: Firestore) {
  const snap = await getDocs(collection(db, "inventory_items"));
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      truck_id: data.truck_id != null ? String(data.truck_id) : null,
      price: Number(data.price) || 0,
      quantity: Number(data.quantity) || 0,
    };
  });
}

/**
 * Returns list of trucks that have orders/inventory.
 */
export async function getAllCommissionsFirestore(db: Firestore) {
  const trucks = await loadTrucks(db);
  const combinations = trucks.map((t) => ({
    truck_id: t.id,
    truck_identifier: t.identifier,
    city: "ALL",
  }));
  return { success: true, combinations };
}

const DELIVERED_STATUSES = new Set(["delivered", "completed"]);
const ACTIVE_STATUSES = new Set(["delivered", "completed", "paid", "shipped", "processing", "pending"]);

/**
 * Calculate commission for a given truck.
 */
export async function getCommissionByTruckFirestore(
  db: Firestore,
  truckId: string,
  basePercent: number = 3,
): Promise<CommissionData> {
  const [invItems, orders, profiles] = await Promise.all([
    loadInventoryItems(db),
    loadOrders(db),
    loadProfiles(db),
  ]);

  // A = total purchase cost of inventory items for this truck
  const truckInv = invItems.filter((i) => i.truck_id === truckId);
  const A = truckInv.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // B = expenses (90% of A)
  const B = A * 0.9;

  const touchesTruck = (o: OrderDoc) => o.items.some((it) => it.truck_id === truckId);
  const isRefundedOrder = (o: OrderDoc) =>
    o.payment_status === "refunded" || o.status === "refunded";

  // Включаем возвращённые заказы, чтобы сумма возвратов считалась; продажи V — без них
  const truckOrders = orders.filter((o) => {
    if (!touchesTruck(o)) return false;
    if (isRefundedOrder(o)) return true;
    return ACTIVE_STATUSES.has(o.status);
  });

  let V = 0;
  let refundsAmount = 0;
  let deliveredCount = 0;
  let refundCount = 0;
  const workerSales = new Map<number, number>();

  for (const order of truckOrders) {
    const orderTruckRevenue = order.items
      .filter((it) => it.truck_id === truckId)
      .reduce((s, it) => s + it.unit_price * it.quantity, 0);

    if (isRefundedOrder(order)) {
      refundsAmount += orderTruckRevenue;
      refundCount++;
      continue;
    }

    V += orderTruckRevenue;

    if (DELIVERED_STATUSES.has(order.status)) {
      deliveredCount++;
    }

    if (order.assigned_to != null) {
      const prev = workerSales.get(order.assigned_to) || 0;
      workerSales.set(order.assigned_to, prev + orderTruckRevenue);
    }
  }

  const E = V - B;
  const D = basePercent / 100; // decimal, e.g. 0.03 for 3%

  const profileMap = new Map<number, string>();
  for (const p of profiles) {
    profileMap.set(p.legacyId, p.name || `Сотрудник #${p.legacyId}`);
  }

  const workers: WorkerCommission[] = [];
  for (const [workerId, sales] of workerSales) {
    const L = V > 0 ? (sales / V) * 100 : 0;
    const Result = sales * D * (L / 100);
    workers.push({
      worker_id: workerId,
      worker_name: profileMap.get(workerId) || `Сотрудник #${workerId}`,
      G: sales,
      D,
      L,
      Result,
    });
  }

  workers.sort((a, b) => b.Result - a.Result);

  const edgeCaseTriggered = V === 0 && A > 0;

  return {
    success: true,
    truckId,
    city: "ALL",
    analytics: {
      A,
      B,
      V,
      E,
      refunds: refundsAmount,
      netEarned: V - refundsAmount,
      deliveredOrdersCount: deliveredCount,
      refundCount,
    },
    workers,
    edgeCaseTriggered,
    message: edgeCaseTriggered
      ? "Нет продаж для данного грузовика. Комиссии не начислены."
      : undefined,
  };
}

/**
 * Total value of all inventory items on a truck (current stock * price).
 */
export async function getTruckAllGoodsTotalFirestore(db: Firestore, truckId: string) {
  const invItems = await loadInventoryItems(db);
  const truckInv = invItems.filter((i) => i.truck_id === truckId);
  const total = truckInv.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return { success: true, allGoodsTotal: total };
}

/**
 * Total sales from delivered orders for a truck.
 */
export async function getTruckDeliveredOrdersTotalFirestore(db: Firestore, truckId: string) {
  const orders = await loadOrders(db);
  let totalSales = 0;
  for (const order of orders) {
    if (order.payment_status === "refunded" || order.status === "refunded") continue;
    if (!ACTIVE_STATUSES.has(order.status)) continue;
    const revenue = order.items
      .filter((it) => it.truck_id === truckId)
      .reduce((s, it) => s + it.unit_price * it.quantity, 0);
    totalSales += revenue;
  }
  return { success: true, totalSales };
}

/**
 * Total refunds for a truck.
 */
export async function getTruckRefundsTotalFirestore(db: Firestore, truckId: string) {
  const orders = await loadOrders(db);
  let refundAmount = 0;
  for (const order of orders) {
    if (order.payment_status !== "refunded" && order.status !== "refunded") continue;
    const revenue = order.items
      .filter((it) => it.truck_id === truckId)
      .reduce((s, it) => s + it.unit_price * it.quantity, 0);
    refundAmount += revenue;
  }
  return { success: true, refundAmount };
}
