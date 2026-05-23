"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.erpStockDocId = erpStockDocId;
/** Составной ключ склада: совпадает с триггерами заказа. */
function erpStockDocId(companyId, productId) {
    return `${companyId}_${productId}`;
}
//# sourceMappingURL=utils.js.map