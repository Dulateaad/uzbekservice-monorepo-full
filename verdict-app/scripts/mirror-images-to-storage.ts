/**
 * Скачивает картинки объектов с внешних URL (Wikimedia и т.д.) и заливает в Firebase Storage,
 * обновляет imageUrl в verdict_objects и денормализованные imageA/imageB в verdict_cards.
 *
 * Зачем: Wikimedia часто отдаёт 429 в WebView Telegram / общих IP — свои URL со Storage стабильнее.
 *
 * Требования:
 * 1. Firebase Console → Storage → включить
 * 2. npm run deploy (storage.rules) или firebase deploy --only storage
 * 3. Service account с правами Storage Admin + Firestore
 *
 * Запуск:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run mirror:images
 */
import { readFileSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = join(__dirname, '..', '.env');
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {}

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { OBJECTS } from './lib/seed-objects-data';

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'verdict-c5e0d';
const STORAGE_BUCKET =
  process.env.VITE_FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.firebasestorage.app`;

const UA =
  'VerdictMiniApp/1.0 (+https://verdict-c5e0d.web.app; image mirror for Telegram Mini App)';
const PREFIX = 'verdict-objects';
const DELAY_MS = 800;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extFromUrlOrType(url: string, contentType: string | null): string {
  const ct = (contentType || '').split(';')[0].trim().toLowerCase();
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  if (ct.includes('png')) return '.png';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('svg')) return '.svg';
  if (ct.includes('gif')) return '.gif';
  const u = url.split('?')[0].toLowerCase();
  const e = extname(u);
  if (e && e.length <= 5) return e;
  return '.bin';
}

async function fetchWithRetry(url: string, maxAttempts = 4): Promise<{ buffer: Buffer; contentType: string | null }> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'image/*,*/*;q=0.8',
      },
    });
    if (res.status === 429) {
      const ra = res.headers.get('retry-after');
      const wait = ra ? Math.min(60_000, (parseInt(ra, 10) || 10) * 1000) : 10_000;
      console.warn(`429 for ${url.slice(0, 80)}… — ждём ${wait}ms, попытка ${attempt}/${maxAttempts}`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${url}`);
    }
    const arrayBuf = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuf),
      contentType: res.headers.get('content-type'),
    };
  }
  throw new Error(`429 после ${maxAttempts} попыток: ${url}`);
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Укажите GOOGLE_APPLICATION_CREDENTIALS=./service-account.json');
    process.exit(1);
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId: PROJECT_ID,
      storageBucket: STORAGE_BUCKET,
    });
  }

  const db = getFirestore();
  const bucket = getStorage().bucket(STORAGE_BUCKET);
  const [exists] = await bucket.exists();
  if (!exists) {
    console.error(`Бакет не найден: ${STORAGE_BUCKET}
Включите Storage в Firebase Console и проверьте VITE_FIREBASE_STORAGE_BUCKET в .env`);
    process.exit(1);
  }

  const idToPublicUrl = new Map<string, string>();

  for (const obj of OBJECTS) {
    console.log(`Fetch ${obj.id} ← ${obj.imageUrl.slice(0, 72)}…`);
    const { buffer, contentType } = await fetchWithRetry(obj.imageUrl);
    const finalExt = extFromUrlOrType(obj.imageUrl, contentType);
    const finalPath = `${PREFIX}/${obj.id}${finalExt}`;
    const finalFile = bucket.file(finalPath);

    await finalFile.save(buffer, {
      metadata: {
        contentType: contentType || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000',
        metadata: { verdictObjectId: obj.id },
      },
    });

    // Публичное чтение через storage.rules (allow read), без ACL/makePublic
    const encodedPath = encodeURIComponent(finalPath);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
    idToPublicUrl.set(obj.id, publicUrl);

    await db.collection('verdict_objects').doc(obj.id).set(
      {
        label: obj.label,
        imageUrl: publicUrl,
        imageSource: obj.imageSource,
        externalRef: obj.externalRef ?? obj.imageUrl,
        mirroredAt: Timestamp.now(),
      },
      { merge: true }
    );
    console.log(`  → ${publicUrl}`);

    await sleep(DELAY_MS);
  }

  console.log('\nОбновление карточек (imageA/imageB)…');
  const cardsSnap = await db.collection('verdict_cards').get();
  let updated = 0;
  for (const doc of cardsSnap.docs) {
    const d = doc.data() as { objectIdA?: string; objectIdB?: string };
    const patch: Record<string, string> = {};
    if (d.objectIdA && idToPublicUrl.has(d.objectIdA)) {
      patch.imageA = idToPublicUrl.get(d.objectIdA)!;
    }
    if (d.objectIdB && idToPublicUrl.has(d.objectIdB)) {
      patch.imageB = idToPublicUrl.get(d.objectIdB)!;
    }
    if (Object.keys(patch).length) {
      await doc.ref.update(patch);
      updated++;
    }
  }

  console.log(`Готово. Объектов: ${OBJECTS.length}, карточек обновлено: ${updated}`);
  console.log('Задеплойте storage rules, если ещё не: firebase deploy --only storage');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
