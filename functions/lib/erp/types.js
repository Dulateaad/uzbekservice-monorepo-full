"use strict";
/** Коллекции ERP-слоя (Firestore). Не путать с bh_operations (Business Hub). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERP_DELIVERY_STATUS_VALUES = exports.ERP_ORDER_STATUS_VALUES = exports.ERP_COLLECTIONS = void 0;
exports.ERP_COLLECTIONS = {
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
};
/** Для валидации в callable. */
exports.ERP_ORDER_STATUS_VALUES = [
    'new',
    'in_progress',
    'ready',
    'delivering',
    'done',
    'cancelled',
];
exports.ERP_DELIVERY_STATUS_VALUES = [
    'assigned',
    'accepted',
    'in_delivery',
    'delivered',
    'completed',
];
//# sourceMappingURL=types.js.map