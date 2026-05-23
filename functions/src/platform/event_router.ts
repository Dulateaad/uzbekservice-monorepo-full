import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {PLATFORM_COLLECTIONS} from './collections';
import {routeBusinessEvent} from './event_handlers';

const FieldValue = admin.firestore.FieldValue;

/**
 * Шина событий: документ в platform_business_events → маршрутизация (очереди/автomation).
 * Идемпотентность: processed === true.
 */
export const onPlatformBusinessEventCreate = functions.firestore
  .document(`${PLATFORM_COLLECTIONS.businessEvents}/{eventId}`)
  .onCreate(async (snap, context) => {
    const eventId = context.params.eventId as string;
    const data = snap.data() as Record<string, unknown>;
    if (data.processed === true) {
      return null;
    }

    const type = (data.type as string) || 'unknown';
    try {
      await routeBusinessEvent(type, data, eventId);
      await snap.ref.update({
        processed: true,
        processedAt: FieldValue.serverTimestamp(),
      });
    } catch (e) {
      const err = e as Error;
      console.error('[platform] event handler failed', type, err.message);
      await snap.ref.update({
        lastError: err.message,
        failedAt: FieldValue.serverTimestamp(),
      });
    }
    return null;
  });
