/**
 * Проверяет наличие локального контента для города пользователя.
 * Если контента нет — записывает запрос в Firestore (geo_generation_queue),
 * чтобы Cloud Function или cron-скрипт подхватил и сгенерировал.
 */
import { collection, doc, getDoc, getDocs, query, where, limit, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CACHE_COLLECTION = 'geo_content_cache';
const QUEUE_COLLECTION = 'geo_generation_queue';
const CARDS_COLLECTION = 'verdict_cards';
const CHECK_KEY = 'verdict_geo_check';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

function wasCheckedRecently(city: string): boolean {
  try {
    const raw = localStorage.getItem(`${CHECK_KEY}_${city}`);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < CHECK_INTERVAL_MS;
  } catch { return false; }
}

function markChecked(city: string) {
  try { localStorage.setItem(`${CHECK_KEY}_${city}`, String(Date.now())); } catch {}
}

export async function ensureCityContent(city: string, country: string): Promise<void> {
  if (!city || !country) return;
  if (wasCheckedRecently(city)) return;
  markChecked(city);

  const cacheRef = doc(db, CACHE_COLLECTION, `${country}_${city}`);
  const cacheSnap = await getDoc(cacheRef);
  if (cacheSnap.exists()) return;

  const cardsQuery = query(
    collection(db, CARDS_COLLECTION),
    where('geoScope', '==', 'city'),
    where('city', '==', city),
    limit(1)
  );
  const cardsSnap = await getDocs(cardsQuery);
  if (!cardsSnap.empty) return;

  const queueRef = doc(db, QUEUE_COLLECTION, `${country}_${city}`);
  await setDoc(queueRef, {
    city,
    country,
    status: 'pending',
    requestedAt: Timestamp.now(),
  }, { merge: true });
}
