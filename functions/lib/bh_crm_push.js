"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onBhCrmNotificationPush = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
/* eslint-disable require-jsdoc */
// Инициализация при отдельной загрузке модуля (порядок импортов в index.ts может отличаться).
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * Push при новой записи в bh_crm_notifications (лиды, сделки, платежи, задачи).
 * Токены: users/{userId}.deviceTokens[] — как в Flutter PushNotificationService.saveTokenToUser.
 */
exports.onBhCrmNotificationPush = functions
    .runWith({ memory: '256MB', timeoutSeconds: 60 })
    .firestore.document('bh_crm_notifications/{notifId}')
    .onCreate(async (snapshot, context) => {
    var _a, _b;
    const data = snapshot.data();
    if (!data) {
        return null;
    }
    const userId = data.userId;
    const title = data.title || 'Business Hub';
    const body = data.body || '';
    if (!userId) {
        console.warn('onBhCrmNotificationPush: missing userId', context.params.notifId);
        return null;
    }
    const userRef = admin.firestore().collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        console.warn('onBhCrmNotificationPush: user not found', userId);
        return null;
    }
    const raw = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.deviceTokens;
    const tokens = Array.isArray(raw)
        ? raw.filter((t) => typeof t === 'string' && t.length > 8)
        : [];
    if (tokens.length === 0) {
        console.log('onBhCrmNotificationPush: no deviceTokens for', userId);
        return null;
    }
    const notifId = context.params.notifId;
    const orgId = String((_b = data.organizationId) !== null && _b !== void 0 ? _b : '');
    const dataPayload = {
        type: 'bh_crm_notification',
        notificationId: notifId,
        organizationId: orgId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
    };
    const messages = tokens.map((token) => ({
        token,
        notification: { title, body },
        data: dataPayload,
        android: {
            priority: 'high',
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                },
            },
        },
    }));
    try {
        const resp = await admin.messaging().sendEach(messages);
        console.log(`onBhCrmNotificationPush ${notifId}: ok=${resp.successCount} fail=${resp.failureCount}`);
        const invalid = new Set();
        resp.responses.forEach((r, i) => {
            var _a;
            if (!r.success && ((_a = r.error) === null || _a === void 0 ? void 0 : _a.code) === 'messaging/registration-token-not-registered') {
                invalid.add(tokens[i]);
            }
        });
        if (invalid.size > 0) {
            const keep = tokens.filter((t) => !invalid.has(t));
            await userRef.update({ deviceTokens: keep });
            console.log(`onBhCrmNotificationPush: pruned ${invalid.size} dead tokens for ${userId}`);
        }
    }
    catch (e) {
        console.error('onBhCrmNotificationPush sendEach error', e);
    }
    return null;
});
//# sourceMappingURL=bh_crm_push.js.map