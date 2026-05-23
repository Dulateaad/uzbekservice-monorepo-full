import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const MAX_SUBMISSIONS_PER_PHONE = 2;
const COLLECTION = 'contact_inquiry_counts';

let cachedApp: App | null | undefined;

function getAdminApp(): App | null {
  if (cachedApp !== undefined) {
    return cachedApp;
  }
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  try {
    if (json) {
      const parsed = JSON.parse(json) as {
        project_id?: string;
        private_key?: string;
      };
      if (!parsed.project_id || !parsed.private_key) {
        console.warn(
          '[inquiry-rate-limit] FIREBASE_SERVICE_ACCOUNT_JSON must include project_id and private_key',
        );
        cachedApp = null;
        return null;
      }
      // GCP JSON uses project_id / private_key; firebase-admin accepts this shape at runtime.
      cachedApp = initializeApp({ credential: cert(parsed as never) });
      return cachedApp;
    }
    cachedApp = initializeApp();
    return cachedApp;
  } catch (e) {
    console.warn(
      '[inquiry-rate-limit] Firebase Admin init failed, rate limit disabled:',
      e instanceof Error ? e.message : e,
    );
    cachedApp = null;
    return null;
  }
}

export function normalizeInquiryPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Reserves one submission atomically. Returns false if this phone already used MAX slots.
 * If Admin/Firestore is not configured or errors, returns true (limit skipped).
 */
export async function reserveInquirySlotForPhone(normalizedDigits: string): Promise<boolean> {
  if (!normalizedDigits || normalizedDigits.length < 7) {
    return true;
  }

  const app = getAdminApp();
  if (!app) {
    console.warn('[inquiry-rate-limit] No Firebase Admin app; inquiry rate limit disabled');
    return true;
  }

  const db = getFirestore(app);
  const docRef = db.collection(COLLECTION).doc(normalizedDigits);

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const current = snap.exists ? Number(snap.data()?.count ?? 0) : 0;
      if (current >= MAX_SUBMISSIONS_PER_PHONE) {
        return false;
      }
      tx.set(
        docRef,
        {
          count: current + 1,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return true;
    });
  } catch (e) {
    console.error(
      '[inquiry-rate-limit] Firestore transaction failed:',
      e instanceof Error ? e.message : e,
    );
    return true;
  }
}
