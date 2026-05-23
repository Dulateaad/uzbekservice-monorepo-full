"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onErpProductionRunUpdate = exports.onErpOrderUpdate = exports.onErpPaymentWrite = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const types_1 = require("./types");
const utils_1 = require("./utils");
const audit_1 = require("../platform/audit");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
/**
 * При переходе оплаты в paid — движение кассы и строка P&L (доход).
 */
exports.onErpPaymentWrite = functions.firestore
    .document(`${types_1.ERP_COLLECTIONS.payments}/{paymentId}`)
    .onWrite(async (change, context) => {
    var _a, _b;
    const paymentId = context.params.paymentId;
    const after = change.after.exists ? change.after.data() : undefined;
    if (!after || after.status !== 'paid') {
        return null;
    }
    const before = change.before.exists ? change.before.data() : undefined;
    if ((before === null || before === void 0 ? void 0 : before.status) === 'paid') {
        return null;
    }
    if (after.automationFinanceProcessed === true) {
        return null;
    }
    const companyId = after.companyId;
    const orderId = after.orderId;
    const amount = Number((_a = after.amount) !== null && _a !== void 0 ? _a : 0);
    const method = (_b = after.method) !== null && _b !== void 0 ? _b : 'cash';
    if (!companyId || !orderId || !Number.isFinite(amount)) {
        console.warn('[ERP] payment skip: bad fields', paymentId);
        return null;
    }
    const batch = db.batch();
    const now = FieldValue.serverTimestamp();
    const cashRef = db.collection(types_1.ERP_COLLECTIONS.cashMovements).doc();
    batch.set(cashRef, {
        companyId,
        type: 'in',
        amount,
        method,
        source: 'payment_received',
        sourceId: paymentId,
        orderId,
        date: now,
        createdAt: now,
    });
    const plRef = db.collection(types_1.ERP_COLLECTIONS.plEntries).doc();
    batch.set(plRef, {
        companyId,
        type: 'income',
        category: 'sales',
        amount,
        linkedType: 'payment',
        linkedId: paymentId,
        orderId,
        date: now,
        createdAt: now,
    });
    const payRef = db.collection(types_1.ERP_COLLECTIONS.payments).doc(paymentId);
    batch.update(payRef, {
        automationFinanceProcessed: true,
        automationFinanceProcessedAt: now,
    });
    await batch.commit();
    console.log('[ERP] finance automation for payment', paymentId);
    try {
        await (0, audit_1.writeAuditLog)({
            companyId,
            action: 'finance_payment_automation',
            entityType: 'erp_payment',
            entityId: paymentId,
            actorId: after.createdBy || 'system',
            after: { amount, orderId, method },
            source: 'onErpPaymentWrite',
        });
    }
    catch (e) {
        console.warn('[ERP] audit log failed', e);
    }
    return null;
});
/**
 * При статусе заказа done — списание склада по строкам (не service).
 */
exports.onErpOrderUpdate = functions.firestore
    .document(`${types_1.ERP_COLLECTIONS.orders}/{orderId}`)
    .onUpdate(async (change, context) => {
    var _a, _b, _c;
    const orderId = context.params.orderId;
    const before = change.before.data();
    const after = change.after.data();
    if (before.status === 'done' || after.status !== 'done') {
        return null;
    }
    if (after.automationStockProcessed === true) {
        return null;
    }
    const companyId = after.companyId;
    const itemsSnap = await db
        .collection(types_1.ERP_COLLECTIONS.orderItems)
        .where('orderId', '==', orderId)
        .get();
    if (itemsSnap.empty) {
        await change.after.ref.update({
            automationStockProcessed: true,
            automationStockNote: 'no_items',
            updatedAt: FieldValue.serverTimestamp(),
        });
        return null;
    }
    for (const itemDoc of itemsSnap.docs) {
        const item = itemDoc.data();
        const productId = item.productId;
        const qty = Number((_a = item.qty) !== null && _a !== void 0 ? _a : 0);
        if (!productId || qty <= 0)
            continue;
        const prodSnap = await db.collection(types_1.ERP_COLLECTIONS.products).doc(productId).get();
        if (!prodSnap.exists)
            continue;
        const prod = prodSnap.data();
        const kind = ((_c = (_b = prod.kind) !== null && _b !== void 0 ? _b : prod.type) !== null && _c !== void 0 ? _c : 'product');
        if (kind === 'service') {
            continue;
        }
        const stockKey = (0, utils_1.erpStockDocId)(companyId, productId);
        await db.runTransaction(async (tx) => {
            var _a, _b;
            const stockRef = db.collection(types_1.ERP_COLLECTIONS.stock).doc(stockKey);
            const stockSnap = await tx.get(stockRef);
            const current = stockSnap.exists ? Number((_b = (_a = stockSnap.data()) === null || _a === void 0 ? void 0 : _a.quantity) !== null && _b !== void 0 ? _b : 0) : 0;
            const nextQty = Math.round((current - qty) * 1000) / 1000;
            tx.set(stockRef, {
                companyId,
                productId,
                quantity: nextQty,
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            const moveRef = db.collection(types_1.ERP_COLLECTIONS.stockMoves).doc();
            tx.set(moveRef, {
                companyId,
                productId,
                type: 'out',
                quantity: qty,
                source: 'order_completed',
                sourceId: orderId,
                orderId,
                createdAt: FieldValue.serverTimestamp(),
            });
        });
    }
    await change.after.ref.update({
        automationStockProcessed: true,
        automationStockProcessedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('[ERP] stock automation for order', orderId);
    try {
        await (0, audit_1.writeAuditLog)({
            companyId,
            action: 'inventory_order_completed',
            entityType: 'erp_order',
            entityId: orderId,
            actorId: 'system',
            after: { status: 'done', automationStockProcessed: true },
            source: 'onErpOrderUpdate',
        });
    }
    catch (e) {
        console.warn('[ERP] audit log failed', e);
    }
    return null;
});
/**
 * Завершение производства: списание материалов по BOM и приход готовой продукции.
 * Документ erp_production_runs: companyId, finishedProductId, qtyProduced, status → done.
 */
exports.onErpProductionRunUpdate = functions.firestore
    .document(`${types_1.ERP_COLLECTIONS.productionRuns}/{runId}`)
    .onUpdate(async (change, context) => {
    var _a, _b;
    const runId = context.params.runId;
    const before = change.before.data();
    const after = change.after.data();
    if (before.status === 'done' || after.status !== 'done') {
        return null;
    }
    if (after.automationBomProcessed === true) {
        return null;
    }
    const companyId = after.companyId;
    const finishedProductId = after.finishedProductId;
    const qtyProduced = Number((_a = after.qtyProduced) !== null && _a !== void 0 ? _a : 0);
    if (!companyId || !finishedProductId || !Number.isFinite(qtyProduced) || qtyProduced <= 0) {
        console.warn('[ERP] production skip: bad fields', runId);
        return null;
    }
    const bomQ = await db
        .collection(types_1.ERP_COLLECTIONS.boms)
        .where('companyId', '==', companyId)
        .where('productId', '==', finishedProductId)
        .limit(1)
        .get();
    let bomId = null;
    if (!bomQ.empty) {
        bomId = bomQ.docs[0].id;
        const itemsQ = await db
            .collection(types_1.ERP_COLLECTIONS.bomItems)
            .where('bomId', '==', bomId)
            .get();
        for (const row of itemsQ.docs) {
            const rowData = row.data();
            const componentId = rowData.componentProductId;
            const qtyPerUnit = Number((_b = rowData.qtyPerUnit) !== null && _b !== void 0 ? _b : 0);
            if (!componentId || qtyPerUnit <= 0)
                continue;
            const need = Math.round(qtyPerUnit * qtyProduced * 1000) / 1000;
            const stockKey = (0, utils_1.erpStockDocId)(companyId, componentId);
            await db.runTransaction(async (tx) => {
                var _a, _b;
                const stockRef = db.collection(types_1.ERP_COLLECTIONS.stock).doc(stockKey);
                const stockSnap = await tx.get(stockRef);
                const current = stockSnap.exists ? Number((_b = (_a = stockSnap.data()) === null || _a === void 0 ? void 0 : _a.quantity) !== null && _b !== void 0 ? _b : 0) : 0;
                const nextQty = Math.round((current - need) * 1000) / 1000;
                tx.set(stockRef, {
                    companyId,
                    productId: componentId,
                    quantity: nextQty,
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
                const moveRef = db.collection(types_1.ERP_COLLECTIONS.stockMoves).doc();
                tx.set(moveRef, {
                    companyId,
                    productId: componentId,
                    type: 'out',
                    quantity: need,
                    source: 'production_bom',
                    sourceId: runId,
                    productionRunId: runId,
                    createdAt: FieldValue.serverTimestamp(),
                });
            });
        }
    }
    const fgKey = (0, utils_1.erpStockDocId)(companyId, finishedProductId);
    await db.runTransaction(async (tx) => {
        var _a, _b;
        const stockRef = db.collection(types_1.ERP_COLLECTIONS.stock).doc(fgKey);
        const stockSnap = await tx.get(stockRef);
        const current = stockSnap.exists ? Number((_b = (_a = stockSnap.data()) === null || _a === void 0 ? void 0 : _a.quantity) !== null && _b !== void 0 ? _b : 0) : 0;
        const nextQty = Math.round((current + qtyProduced) * 1000) / 1000;
        tx.set(stockRef, {
            companyId,
            productId: finishedProductId,
            quantity: nextQty,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        const moveRef = db.collection(types_1.ERP_COLLECTIONS.stockMoves).doc();
        tx.set(moveRef, {
            companyId,
            productId: finishedProductId,
            type: 'in',
            quantity: qtyProduced,
            source: 'production_done',
            sourceId: runId,
            productionRunId: runId,
            createdAt: FieldValue.serverTimestamp(),
        });
    });
    await change.after.ref.update({
        automationBomProcessed: true,
        automationBomProcessedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('[ERP] production BOM automation', runId, bomId ? `bom=${bomId}` : 'no-bom');
    try {
        await (0, audit_1.writeAuditLog)({
            companyId,
            action: 'production_bom_automation',
            entityType: 'erp_production_run',
            entityId: runId,
            actorId: 'system',
            after: { finishedProductId, qtyProduced, bomId: bomId !== null && bomId !== void 0 ? bomId : null },
            source: 'onErpProductionRunUpdate',
        });
    }
    catch (e) {
        console.warn('[ERP] audit log failed', e);
    }
    return null;
});
//# sourceMappingURL=triggers.js.map