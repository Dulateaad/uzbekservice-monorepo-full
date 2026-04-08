/**
 * Minimal analytics service for PeopleHub.
 * Logs key events to Firestore `analytics_events` collection.
 * Replace with Firebase Analytics / Amplitude in production scale.
 */

import { db } from './firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

type EventName =
  | 'app_open'
  | 'trip_created'
  | 'trip_completed'
  | 'trip_cancelled'
  | 'bid_sent'
  | 'bid_accepted'
  | 'driver_online'
  | 'driver_offline'
  | 'verification_submitted'
  | 'error';

interface EventData {
  [key: string]: string | number | boolean | null | undefined;
}

const QUEUE: Array<{ name: EventName; data: EventData }> = [];
let flushing = false;

async function flushQueue() {
  if (flushing || QUEUE.length === 0) return;
  flushing = true;
  const batch = QUEUE.splice(0, 20);
  try {
    await Promise.allSettled(
      batch.map((evt) =>
        addDoc(collection(db, 'analytics_events'), {
          name: evt.name,
          ...evt.data,
          ts: serverTimestamp(),
        })
      )
    );
  } catch (err) {
    console.error('Analytics flush error:', err);
  } finally {
    flushing = false;
    if (QUEUE.length > 0) setTimeout(flushQueue, 2000);
  }
}

export function trackEvent(name: EventName, data: EventData = {}) {
  QUEUE.push({ name, data });
  setTimeout(flushQueue, 500);
}

export function trackError(error: unknown, context?: string) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack?.slice(0, 500) : undefined;
  console.error(`[PH Error] ${context || ''}:`, error);
  trackEvent('error', { message, stack, context });
}

/** Call on app open */
export function trackAppOpen(userId?: string) {
  trackEvent('app_open', {
    userId: userId || null,
    platform: window.Telegram?.WebApp ? 'telegram' : 'web',
    version: (window as any).__APP_VERSION__ || 'unknown',
  });
}
