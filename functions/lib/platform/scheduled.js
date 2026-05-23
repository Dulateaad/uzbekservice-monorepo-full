"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformProcessNotificationOutbox = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const collections_1 = require("./collections");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
/**
 * Фон: обработка outbox уведомлений (заглушка маршрутизации FCM / Telegram / email).
 * Расширяйте отправку здесь или вынесите в Cloud Tasks + workers.
 */
exports.platformProcessNotificationOutbox = functions
    .runWith({ timeoutSeconds: 120, memory: '256MB' })
    .pubsub.schedule('every 5 minutes')
    .timeZone('UTC')
    .onRun(async () => {
    const snap = await db
        .collection(collections_1.PLATFORM_COLLECTIONS.notificationOutbox)
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
//# sourceMappingURL=scheduled.js.map