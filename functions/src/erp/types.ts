/** Коллекции ERP-слоя (Firestore). Не путать с bh_operations (Business Hub). */

export const ERP_COLLECTIONS = {
  companies: 'erp_companies',
  contacts: 'erp_contacts',
  products: 'erp_products',
  orders: 'erp_orders',
  orderItems: 'erp_order_items',
  payments: 'erp_payments',
  cashMovements: 'erp_cash_movements',
  plEntries: 'erp_pl_entries',
  stock: 'erp_stock',
  stockMoves: 'erp_stock_moves',
  boms: 'erp_boms',
  bomItems: 'erp_bom_items',
  deliveries: 'erp_deliveries',
  posShifts: 'erp_pos_shifts',
  analyticsDaily: 'erp_analytics_daily',
  productionRuns: 'erp_production_runs',
} as const;

export type ErpOrderStatus =
  | 'new'
  | 'in_progress'
  | 'ready'
  | 'delivering'
  | 'done'
  | 'cancelled';

/** Для валидации в callable. */
export const ERP_ORDER_STATUS_VALUES: readonly ErpOrderStatus[] = [
  'new',
  'in_progress',
  'ready',
  'delivering',
  'done',
  'cancelled',
] as const;

export type ErpPaymentStatus = 'pending' | 'paid' | 'failed';

export type ErpPaymentMethod = 'cash' | 'card' | 'transfer';

/** Доставка (ТЗ §15). */
export type ErpDeliveryStatus =
  | 'assigned'
  | 'accepted'
  | 'in_delivery'
  | 'delivered'
  | 'completed';

export const ERP_DELIVERY_STATUS_VALUES: readonly ErpDeliveryStatus[] = [
  'assigned',
  'accepted',
  'in_delivery',
  'delivered',
  'completed',
] as const;
