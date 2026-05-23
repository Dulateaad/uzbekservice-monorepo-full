import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {ERP_COLLECTIONS} from './types';
import {erpStockDocId} from './utils';
import {writeAuditLog} from '../platform/audit';

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/**
 * При переходе оплаты в paid — движение кассы и строка P&L (доход).
 */
export const onErpPaymentWrite = functions.firestore
  .document(`${ERP_COLLECTIONS.payments}/{paymentId}`)
  .onWrite(async (change, context) => {
    const paymentId = context.params.paymentId as string;
    const after = change.after.exists ? change.after.data() : undefined;
    if (!after || after.status !== 'paid') {
      return null;
    }
    const before = change.before.exists ? change.before.data() : undefined;
    if (before?.status === 'paid') {
      return null;
    }
    if (after.automationFinanceProcessed === true) {
      return null;
    }

    const companyId = after.companyId as string;
    const orderId = after.orderId as string;
    const amount = Number(after.amount ?? 0);
    const method = (after.method as string) ?? 'cash';

    if (!companyId || !orderId || !Number.isFinite(amount)) {
      console.warn('[ERP] payment skip: bad fields', paymentId);
      return null;
    }

    const batch = db.batch();
    const now = FieldValue.serverTimestamp();

    const cashRef = db.collection(ERP_COLLECTIONS.cashMovements).doc();
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

    const plRef = db.collection(ERP_COLLECTIONS.plEntries).doc();
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

    const payRef = db.collection(ERP_COLLECTIONS.payments).doc(paymentId);
    batch.update(payRef, {
      automationFinanceProcessed: true,
      automationFinanceProcessedAt: now,
    });

    await batch.commit();
    console.log('[ERP] finance automation for payment', paymentId);
    try {
      await writeAuditLog({
        companyId,
        action: 'finance_payment_automation',
        entityType: 'erp_payment',
        entityId: paymentId,
        actorId: (after.createdBy as string) || 'system',
        after: {amount, orderId, method},
        source: 'onErpPaymentWrite',
      });
    } catch (e) {
      console.warn('[ERP] audit log failed', e);
    }
    return null;
  });

/**
 * При статусе заказа done — списание склада по строкам (не service).
 */
export const onErpOrderUpdate = functions.firestore
  .document(`${ERP_COLLECTIONS.orders}/{orderId}`)
  .onUpdate(async (change, context) => {
    const orderId = context.params.orderId as string;
    const before = change.before.data()!;
    const after = change.after.data()!;
    if (before.status === 'done' || after.status !== 'done') {
      return null;
    }
    if (after.automationStockProcessed === true) {
      return null;
    }

    const companyId = after.companyId as string;

    const itemsSnap = await db
      .collection(ERP_COLLECTIONS.orderItems)
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
      const productId = item.productId as string;
      const qty = Number(item.qty ?? 0);
      if (!productId || qty <= 0) continue;

      const prodSnap = await db.collection(ERP_COLLECTIONS.products).doc(productId).get();
      if (!prodSnap.exists) continue;
      const prod = prodSnap.data() as Record<string, unknown>;
      const kind = (prod.kind ?? prod.type ?? 'product') as string;
      if (kind === 'service') {
        continue;
      }

      const stockKey = erpStockDocId(companyId, productId);

      await db.runTransaction(async (tx) => {
        const stockRef = db.collection(ERP_COLLECTIONS.stock).doc(stockKey);
        const stockSnap = await tx.get(stockRef);
        const current = stockSnap.exists ? Number(stockSnap.data()?.quantity ?? 0) : 0;
        const nextQty = Math.round((current - qty) * 1000) / 1000;

        tx.set(
          stockRef,
          {
            companyId,
            productId,
            quantity: nextQty,
            updatedAt: FieldValue.serverTimestamp(),
          },
          {merge: true}
        );

        const moveRef = db.collection(ERP_COLLECTIONS.stockMoves).doc();
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
      await writeAuditLog({
        companyId,
        action: 'inventory_order_completed',
        entityType: 'erp_order',
        entityId: orderId,
        actorId: 'system',
        after: {status: 'done', automationStockProcessed: true},
        source: 'onErpOrderUpdate',
      });
    } catch (e) {
      console.warn('[ERP] audit log failed', e);
    }
    return null;
  });

/**
 * Завершение производства: списание материалов по BOM и приход готовой продукции.
 * Документ erp_production_runs: companyId, finishedProductId, qtyProduced, status → done.
 */
export const onErpProductionRunUpdate = functions.firestore
  .document(`${ERP_COLLECTIONS.productionRuns}/{runId}`)
  .onUpdate(async (change, context) => {
    const runId = context.params.runId as string;
    const before = change.before.data()!;
    const after = change.after.data()!;
    if (before.status === 'done' || after.status !== 'done') {
      return null;
    }
    if (after.automationBomProcessed === true) {
      return null;
    }

    const companyId = after.companyId as string;
    const finishedProductId = after.finishedProductId as string;
    const qtyProduced = Number(after.qtyProduced ?? 0);
    if (!companyId || !finishedProductId || !Number.isFinite(qtyProduced) || qtyProduced <= 0) {
      console.warn('[ERP] production skip: bad fields', runId);
      return null;
    }

    const bomQ = await db
      .collection(ERP_COLLECTIONS.boms)
      .where('companyId', '==', companyId)
      .where('productId', '==', finishedProductId)
      .limit(1)
      .get();

    let bomId: string | null = null;
    if (!bomQ.empty) {
      bomId = bomQ.docs[0].id;
      const itemsQ = await db
        .collection(ERP_COLLECTIONS.bomItems)
        .where('bomId', '==', bomId)
        .get();

      for (const row of itemsQ.docs) {
        const rowData = row.data();
        const componentId = rowData.componentProductId as string;
        const qtyPerUnit = Number(rowData.qtyPerUnit ?? 0);
        if (!componentId || qtyPerUnit <= 0) continue;
        const need = Math.round(qtyPerUnit * qtyProduced * 1000) / 1000;
        const stockKey = erpStockDocId(companyId, componentId);

        await db.runTransaction(async (tx) => {
          const stockRef = db.collection(ERP_COLLECTIONS.stock).doc(stockKey);
          const stockSnap = await tx.get(stockRef);
          const current = stockSnap.exists ? Number(stockSnap.data()?.quantity ?? 0) : 0;
          const nextQty = Math.round((current - need) * 1000) / 1000;

          tx.set(
            stockRef,
            {
              companyId,
              productId: componentId,
              quantity: nextQty,
              updatedAt: FieldValue.serverTimestamp(),
            },
            {merge: true}
          );

          const moveRef = db.collection(ERP_COLLECTIONS.stockMoves).doc();
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

    const fgKey = erpStockDocId(companyId, finishedProductId);
    await db.runTransaction(async (tx) => {
      const stockRef = db.collection(ERP_COLLECTIONS.stock).doc(fgKey);
      const stockSnap = await tx.get(stockRef);
      const current = stockSnap.exists ? Number(stockSnap.data()?.quantity ?? 0) : 0;
      const nextQty = Math.round((current + qtyProduced) * 1000) / 1000;

      tx.set(
        stockRef,
        {
          companyId,
          productId: finishedProductId,
          quantity: nextQty,
          updatedAt: FieldValue.serverTimestamp(),
        },
        {merge: true}
      );

      const moveRef = db.collection(ERP_COLLECTIONS.stockMoves).doc();
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
      await writeAuditLog({
        companyId,
        action: 'production_bom_automation',
        entityType: 'erp_production_run',
        entityId: runId,
        actorId: 'system',
        after: {finishedProductId, qtyProduced, bomId: bomId ?? null},
        source: 'onErpProductionRunUpdate',
      });
    } catch (e) {
      console.warn('[ERP] audit log failed', e);
    }
    return null;
  });
