import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {PLATFORM_COLLECTIONS} from './collections';

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/**
 * Фон: обработка outbox уведомлений (заглушка маршрутизации FCM / Telegram / email).
 * Расширяйте отправку здесь или вынесите в Cloud Tasks + workers.
 */
export const platformProcessNotificationOutbox = functions
  .runWith({timeoutSeconds: 120, memory: '256MB'})
  .pubsub.schedule('every 5 minutes')
  .timeZone('UTC')
  .onRun(async () => {
    const snap = await db
      .collection(PLATFORM_COLLECTIONS.notificationOutbox)
      .where('status', '==', 'pending')
      .limit(25)
      .get();

    if (snap.empty) {
      return null;
    }

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, {
        status: 'routed',
        routedAt: FieldValue.serverTimestamp(),
        note: 'placeholder: plug FCM/telegram/email senders',
      });
    }
    await batch.commit();
    console.log('[platform] outbox processed', snap.size);
    return null;
  });
