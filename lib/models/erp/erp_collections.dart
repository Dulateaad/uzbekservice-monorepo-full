/// Коллекции ERP-слоя Firestore — см. `docs/FIREBASE_IMPLEMENTATION_PACK_v1.md`
/// и `functions/src/erp/types.ts`.
abstract final class ErpCollections {
  static const companies = 'erp_companies';
  static const contacts = 'erp_contacts';
  static const products = 'erp_products';
  static const orders = 'erp_orders';
  static const orderItems = 'erp_order_items';
  static const payments = 'erp_payments';
  static const cashMovements = 'erp_cash_movements';
  static const plEntries = 'erp_pl_entries';
  static const stock = 'erp_stock';
  static const stockMoves = 'erp_stock_moves';
  static const boms = 'erp_boms';
  static const bomItems = 'erp_bom_items';
  static const deliveries = 'erp_deliveries';
  static const posShifts = 'erp_pos_shifts';
  static const analyticsDaily = 'erp_analytics_daily';
  static const productionRuns = 'erp_production_runs';
}
