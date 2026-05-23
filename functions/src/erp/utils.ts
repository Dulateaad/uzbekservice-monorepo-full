/** Составной ключ склада: совпадает с триггерами заказа. */
export function erpStockDocId(companyId: string, productId: string): string {
  return `${companyId}_${productId}`;
}
