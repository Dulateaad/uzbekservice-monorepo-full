"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformEnqueueNotification = exports.platformEmitBusinessEvent = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const collections_1 = require("./collections");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
/**
 * Клиент/сервер пишет событие в шину (для автоматизации, отчётов, AI).
 * Тело: { type, companyId, payload? }
 */
exports.platformEmitBusinessEvent = functions.https.onCall(async (data, context) => {
    var _a;
    if (!((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new functions.https.HttpsError('unauthenticated', 'Требуется вход');
    }
    const type = data === null || data === void 0 ? void 0 : data.type;
    const companyId = data === null || data === void 0 ? void 0 : data.companyId;
    const payload = (data === null || data === void 0 ? void 0 : data.payload) || {};
    if (!type || !companyId) {
        throw new functions.https.HttpsError('invalid-argument', 'Нужны type и companyId');
    }
    const ref = db.collection(collections_1.PLATFORM_COLLECTIONS.businessEvents).doc();
    await ref.set({
        type,
        companyId,
        userId: context.auth.uid,
        payload,
        processed: false,
        createdAt: FieldValue.serverTimestamp(),
    });
    return { eventId: ref.id };
});
/**
 * Постановка уведомления в outbox (воркер / Cloud Tasks — следующий этап).
 * Тело: { companyId, channel, title, body, meta? }
 */
exports.platformEnqueueNotification = functions.https.onCall(async (data, context) => {
    var _a;
    if (!((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new functions.https.HttpsError('unauthenticated', 'Требуется вход');
    }
    const companyId = data === null || data === void 0 ? void 0 : data.companyId;
    const channel = (data === null || data === void 0 ? void 0 : data.channel) || 'in_app';
    const title = data === null || data === void 0 ? void 0 : data.title;
    const body = data === null || data === void 0 ? void 0 : data.body;
    if (!companyId || !title || !body) {
        throw new functions.https.HttpsError('invalid-argument', 'Нужны companyId, title, body');
    }
    const ref = db.collection(collections_1.PLATFORM_COLLECTIONS.notificationOutbox).doc();
    await ref.set({
        companyId,
        channel,
        title,
        body,
        meta: (data === null || data === void 0 ? void 0 : data.meta) || {},
        status: 'pending',
        createdBy: context.auth.uid,
        createdAt: FieldValue.serverTimestamp(),
    });
    return { outboxId: ref.id };
});
//# sourceMappingURL=callable.js.map