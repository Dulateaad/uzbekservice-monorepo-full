import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {PLATFORM_COLLECTIONS} from './collections';

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/**
 * Клиент/сервер пишет событие в шину (для автоматизации, отчётов, AI).
 * Тело: { type, companyId, payload? }
 */
export const platformEmitBusinessEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется вход');
  }
  const type = data?.type as string | undefined;
  const companyId = data?.companyId as string | undefined;
  const payload = (data?.payload as Record<string, unknown>) || {};
  if (!type || !companyId) {
    throw new functions.https.HttpsError('invalid-argument', 'Нужны type и companyId');
  }

  const ref = db.collection(PLATFORM_COLLECTIONS.businessEvents).doc();
  await ref.set({
    type,
    companyId,
    userId: context.auth.uid,
    payload,
    processed: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {eventId: ref.id};
});

/**
 * Постановка уведомления в outbox (воркер / Cloud Tasks — следующий этап).
 * Тело: { companyId, channel, title, body, meta? }
 */
export const platformEnqueueNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется вход');
  }
  const companyId = data?.companyId as string | undefined;
  const channel = (data?.channel as string) || 'in_app';
  const title = data?.title as string | undefined;
  const body = data?.body as string | undefined;
  if (!companyId || !title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Нужны companyId, title, body');
  }

  const ref = db.collection(PLATFORM_COLLECTIONS.notificationOutbox).doc();
  await ref.set({
    companyId,
    channel,
    title,
    body,
    meta: (data?.meta as Record<string, unknown>) || {},
    status: 'pending',
    createdBy: context.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {outboxId: ref.id};
});
