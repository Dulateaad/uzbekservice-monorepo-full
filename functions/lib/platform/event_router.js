"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPlatformBusinessEventCreate = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const collections_1 = require("./collections");
const event_handlers_1 = require("./event_handlers");
const FieldValue = admin.firestore.FieldValue;
/**
 * Шина событий: документ в platform_business_events → маршрутизация (очереди/автomation).
 * Идемпотентность: processed === true.
 */
exports.onPlatformBusinessEventCreate = functions.firestore
    .document(`${collections_1.PLATFORM_COLLECTIONS.businessEvents}/{eventId}`)
    .onCreate(async (snap, context) => {
    const eventId = context.params.eventId;
    const data = snap.data();
    if (data.processed === true) {
        return null;
    }
    const type = data.type || 'unknown';
    try {
        await (0, event_handlers_1.routeBusinessEvent)(type, data, eventId);
        await snap.ref.update({
            processed: true,
            processedAt: FieldValue.serverTimestamp(),
        });
    }
    catch (e) {
        const err = e;
        console.error('[platform] event handler failed', type, err.message);
        await snap.ref.update({
            lastError: err.message,
            failedAt: FieldValue.serverTimestamp(),
        });
    }
    return null;
});
//# sourceMappingURL=event_router.js.map