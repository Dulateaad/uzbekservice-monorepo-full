import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  ERP_COLLECTIONS,
  ERP_DELIVERY_STATUS_VALUES,
  ERP_ORDER_STATUS_VALUES,
  ErpDeliveryStatus,
  ErpOrderStatus,
} from './types';
import {erpStockDocId} from './utils';

const db = admin.firestore();

interface OrderItemInput {
  product_id: string;
  qty: number;
}

/**
 * Создание заказа и строк из каталога erp_products (цены подставляются сервером).
 *
 * Тело: { companyId, contact_id?, items: [{ product_id, qty }] }
 */
export const erpCreateOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется вход');
  }

  const companyId = data?.companyId as string | undefined;
  const contactId = (data?.contact_id as string | undefined) ?? null;
  const items = data?.items as OrderItemInput[] | undefined;

  if (!companyId || typeof companyId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Нужен companyId');
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Нужен хотя бы один товар');
  }

  const uid = context.auth.uid;
  const orderRef = db.collection(ERP_COLLECTIONS.orders).doc();
  const orderId = orderRef.id;
  const now = admin.firestore.FieldValue.serverTimestamp();

  let totalAmount = 0;

  const batch = db.batch();
  const itemDocs: Array<{
    productId: string;
    qty: number;
    price: number;
    total: number;
  }> = [];

  for (const raw of items) {
    const productId = raw?.product_id;
    const qty = Number(raw?.qty);
    if (!productId || !Number.isFinite(qty) || qty <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Некорректная строка заказа');
    }

    const prodSnap = await db.collection(ERP_COLLECTIONS.products).doc(productId).get();
    if (!prodSnap.exists) {
      throw new functions.https.HttpsError('not-found', `Товар не найден: ${productId}`);
    }
    const prod = prodSnap.data() as Record<string, unknown>;
    if (prod.companyId !== companyId) {
      throw new functions.https.HttpsError('permission-denied', 'Товар другой компании');
    }
    const price = Number(prod.price ?? 0);
    const lineTotal = Math.round(price * qty * 100) / 100;
    totalAmount += lineTotal;

    const itemRef = db.collection(ERP_COLLECTIONS.orderItems).doc();
    batch.set(itemRef, {
      orderId,
      companyId,
      productId,
      qty,
      price,
      total: lineTotal,
      createdAt: now,
    });
    itemDocs.push({productId, qty, price, total: lineTotal});
  }

  batch.set(orderRef, {
    companyId,
    contactId,
    status: 'new',
    totalAmount,
    currency: 'UZS',
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();

  return {
    orderId,
    totalAmount,
    items: itemDocs.length,
  };
});

/**
 * Запись оплаты (клиент или POS). При status=paid сработает onErpPaymentWrite.
 * Тело: { companyId, orderId, amount, method, status? }
 */
export const erpRecordPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется вход');
  }
  const companyId = data?.companyId as string | undefined;
  const orderId = data?.orderId as string | undefined;
  const amount = Number(data?.amount);
  const method = (data?.method as string) ?? 'cash';
  const status = (data?.status as string) ?? 'paid';
  if (!companyId || !orderId || !Number.isFinite(amount) || amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Нужны companyId, orderId, amount');
  }
  if (!['pending', 'paid', 'failed'].includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', 'Некорректный status');
  }

  const orderSnap = await db.collection(ERP_COLLECTIONS.orders).doc(orderId).get();
  if (!orderSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Заказ не найден');
  }
  const ord = orderSnap.data() as Record<string, unknown>;
  if (ord.companyId !== companyId) {
    throw new functions.https.HttpsError('permission-denied', 'Заказ другой компании');
  }

  const uid = context.auth.uid;
  const payRef = db.collection(ERP_COLLECTIONS.payments).doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await payRef.set({
    companyId,
    orderId,
    amount,
    method,
    status,
    paidAt: status === 'paid' ? now : null,
    createdBy: uid,
    createdAt: now,
  });

  return {paymentId: payRef.id};
});

/**
 * Смена статуса заказа (например → done для списания склада).
 * Тело: { companyId, orderId, status }
 */
export const erpPatchOrderStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется вход');
  }
  const companyId = data?.companyId as string | undefined;
  const orderId = data?.orderId as string | undefined;
  const status = data?.status as ErpOrderStatus | undefined;
  if (!companyId || !orderId || !status) {
    throw new functions.https.HttpsError('invalid-argument', 'Нужны companyId, orderId, status');
  }
  if (!ERP_ORDER_STATUS_VALUES.includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', 'Недопустимый статус');
  }

  const ref = db.collection(ERP_COLLECTIONS.orders).doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Заказ не найден');
  }
  const ord = snap.data() as Record<string, unknown>;
  if (ord.companyId !== companyId) {
    throw new functions.https.HttpsError('permission-denied', 'Заказ другой компании');
  }

  await ref.update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {ok: true};
});

/**
 * Ручное движение склада (инвентаризация, оприходование).
 * Тело: { companyId, productId, qty, direction: 'in' | 'out', note? }
 */
export const erpStockMove = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется вход');
  }
  const companyId = data?.companyId as string | undefined;
  const productId = data?.productId as string | undefined;
  const qty = Number(data?.qty);
  const direction = data?.direction as string | undefined;
  const note = (data?.note as string | undefined) ?? null;
  if (!companyId || !productId || !Number.isFinite(qty) || qty <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Нужны companyId, productId, qty>0');
  }
  if (direction !== 'in' && direction !== 'out') {
    throw new functions.https.HttpsError('invalid-argument', 'direction: in | out');
  }

  const prodSnap = await db.collection(ERP_COLLECTIONS.products).doc(productId).get();
  if (!prodSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Товар не найден');
  }
  const prod = prodSnap.data() as Record<string, unknown>;
  if (prod.companyId !== companyId) {
    throw new functions.https.HttpsError('permission-denied', 'Товар другой компании');
  }

  const delta = direction === 'in' ? qty : -qty;
  const stockKey = erpStockDocId(companyId, productId);

  await db.runTransaction(async (tx) => {
    const stockRef = db.collection(ERP_COLLECTIONS.stock).doc(stockKey);
    const stockSnap = await tx.get(stockRef);
    const current = stockSnap.exists ? Number(stockSnap.data()?.quantity ?? 0) : 0;
    const nextQty = Math.round((current + delta) * 1000) / 1000;

    tx.set(
      stockRef,
      {
        companyId,
        productId,
        quantity: nextQty,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    const moveRef = db.collection(ERP_COLLECTIONS.stockMoves).doc();
    tx.set(moveRef, {
      companyId,
      productId,
      type: direction,
      quantity: qty,
      source: 'manual',
      note,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {ok: true};
});

/**
 * Открытие / закрытие POS-смены.
 * Тело: { action: 'open' | 'close', companyId, openingCash?, closingCash? }
 */
export const erpPosShift = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется вход');
  }
  const action = data?.action as string | undefined;
  const companyId = data?.companyId as string | undefined;
  if (!companyId || (action !== 'open' && action !== 'close')) {
    throw new functions.https.HttpsError('invalid-argument', 'Нужны action=open|close и companyId');
  }

  const uid = context.auth.uid;
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (action === 'open') {
    const openingCash = Number(data?.openingCash ?? 0);
    const existing = await db
      .collection(ERP_COLLECTIONS.posShifts)
      .where('companyId', '==', companyId)
      .where('isOpen', '==', true)
      .limit(1)
      .get();
    if (!existing.empty) {
      throw new functions.https.HttpsError('failed-precondition', 'Смена уже открыта');
    }
    const ref = db.collection(ERP_COLLECTIONS.posShifts).doc();
    await ref.set({
      companyId,
      openedBy: uid,
      openedAt: now,
      closedAt: null,
      isOpen: true,
      openingCash: Number.isFinite(openingCash) ? openingCash : 0,
      closingCash: null,
    });
    return {shiftId: ref.id};
  }

  const closingCash = Number(data?.closingCash ?? 0);
  const openSnap = await db
    .collection(ERP_COLLECTIONS.posShifts)
    .where('companyId', '==', companyId)
    .where('isOpen', '==', true)
    .limit(1)
    .get();
  if (openSnap.empty) {
    throw new functions.https.HttpsError('failed-precondition', 'Нет открытой смены');
  }
  const doc = openSnap.docs[0];
  await doc.ref.update({
    isOpen: false,
    closedAt: now,
    closingCash: Number.isFinite(closingCash) ? closingCash : 0,
    closedBy: uid,
  });
  return {shiftId: doc.id};
});

/**
 * Машина состояний доставки (ТЗ §15).
 * Тело: { companyId, deliveryId, status, note? }
 */
export const erpPatchDeliveryStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется вход');
  }
  const companyId = data?.companyId as string | undefined;
  const deliveryId = data?.deliveryId as string | undefined;
  const status = data?.status as ErpDeliveryStatus | undefined;
  const note = (data?.note as string | undefined) ?? null;
  if (!companyId || !deliveryId || !status) {
    throw new functions.https.HttpsError('invalid-argument', 'Нужны companyId, deliveryId, status');
  }
  if (!ERP_DELIVERY_STATUS_VALUES.includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', 'Недопустимый статус доставки');
  }

  const ref = db.collection(ERP_COLLECTIONS.deliveries).doc(deliveryId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Доставка не найдена');
  }
  const row = snap.data() as Record<string, unknown>;
  if (row.companyId !== companyId) {
    throw new functions.https.HttpsError('permission-denied', 'Доставка другой компании');
  }

  const uid = context.auth.uid;
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.update({
    status,
    ...(note != null && note !== '' ? {statusNote: note} : {}),
    updatedAt: now,
    updatedBy: uid,
  });

  return {ok: true};
});
