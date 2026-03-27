/**
 * @deprecated Для продакшена используйте объекты + бесплатные источники (см. IMAGES_SOURCES.md, seed:objects).
 * Генерация через Vertex AI (Imagen) — платно, требует GCP биллинг.
 * Заполняет imageA/imageB для карточек в Firestore и загружает файлы в Storage.
 *
 * Требования:
 * - GCP проект verdict-c5e0d с включённым Vertex AI API и биллингом
 * - GOOGLE_APPLICATION_CREDENTIALS или gcloud auth application-default login
 * - .env с VITE_FIREBASE_PROJECT_ID и VITE_FIREBASE_STORAGE_BUCKET
 *
 * Запуск: npm run generate:images (из verdict-app)
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
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

import admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'verdict-c5e0d';
// Firebase Storage: старые проекты — appspot.com, новые (Oct 2024+) — firebasestorage.app
const STORAGE_BUCKET =
  process.env.VITE_FIREBASE_STORAGE_BUCKET ||
  `${PROJECT_ID}.appspot.com`;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const CARDS_COLLECTION = 'verdict_cards';
const STORAGE_PREFIX = 'card-images';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function verifyBucket() {
  const [exists] = await bucket.exists();
  if (!exists) {
    console.error(`
Ошибка: бакет Storage не найден: ${STORAGE_BUCKET}

Сделайте:
1. Firebase Console → Build → Storage → Get started (включите Storage)
2. Проверьте имя бакета в Project Settings
3. Если бакет *firebasestorage.app, добавьте в .env:
   VITE_FIREBASE_STORAGE_BUCKET=verdict-c5e0d.firebasestorage.app
`);
    process.exit(1);
  }
  console.log(`Storage bucket: ${STORAGE_BUCKET}`);
}

const ai = new GoogleGenAI({
  vertexai: true,
  project: PROJECT_ID,
  location: LOCATION,
});

// Бренды/слова, которые Imagen может блокировать — подставляем нейтральный промпт
const PROMPT_OVERRIDES: Record<string, string> = {
  Marvel: 'comic book superhero',
  DC: 'comic book superhero',
  'Marvel vs DC': 'comic book superhero',
};

const CARD_PROMPT = (option: string) => {
  const promptText = PROMPT_OVERRIDES[option] ?? option;
  return `Professional illustration that visually represents the concept: "${promptText}". Square 1:1 format. The subject must fill the entire frame from edge to edge — full-bleed, no empty margins, no cropping, composition occupies the whole card. Centered, complete image. Clean minimal background. CRITICAL: Absolutely NO text, NO labels, NO words, NO letters, NO writing, NO captions, NO watermarks anywhere in the image. Sharp, detailed, modern flat design, stylish.`;
};

const DELAY_BETWEEN_REQUESTS_MS = 4000; // Imagen quota ~20/min — пауза 4 сек

const MIN_IMAGE_SIZE = 800;

function getPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function validateImageBuffer(buffer: Buffer): { valid: boolean; width?: number; height?: number } {
  const dims = getPngDimensions(buffer);
  if (!dims) return { valid: false };
  const valid = dims.width >= MIN_IMAGE_SIZE && dims.height >= MIN_IMAGE_SIZE;
  return { valid, width: dims.width, height: dims.height };
}

async function generateImage(optionText: string, retries = 3): Promise<Buffer> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: CARD_PROMPT(optionText),
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
        },
      });

      const first = response?.generatedImages?.[0];
      const imagePayload = first?.image;
      if (!imagePayload) throw new Error('No image in Vertex AI response');
      const base64 = (imagePayload as { imageBytes?: string }).imageBytes;
      if (!base64) throw new Error('No imageBytes in response');
      return Buffer.from(base64, 'base64');
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      const msg = e instanceof Error ? e.message : String(e);
      const is429 = status === 429 || msg.includes('429') || msg.includes('Quota exceeded');
      const isNoImage = msg.includes('No image');

      if (is429 && attempt < retries) {
        const waitSec = 60 + attempt * 30; // 60s, 90s, 120s
        console.log(`    Quota exceeded. Waiting ${waitSec}s before retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }
      if (isNoImage && attempt < retries) {
        console.log(`    Retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw e;
    }
  }
  throw new Error('No image in Vertex AI response');
}

async function uploadToStorage(buffer: Buffer, path: string): Promise<string> {
  const file = bucket.file(path);
  await file.save(buffer, {
    metadata: { contentType: 'image/png' },
  });
  await file.makePublic();
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media`;
}

const FORCE_REGENERATE = process.argv.includes('--force');

async function main() {
  await verifyBucket();
  const snapshot = await db.collection(CARDS_COLLECTION).get();
  let generated = 0;
  if (FORCE_REGENERATE) console.log('--force: regenerating all images\n');

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const id = docSnap.id;
    const optionA = data.optionA as string;
    const optionB = data.optionB as string;
    let imageA = FORCE_REGENERATE ? undefined : (data.imageA as string | undefined);
    let imageB = FORCE_REGENERATE ? undefined : (data.imageB as string | undefined);
    let updated = false;

    if (!optionA || !optionB) continue;

    try {
      if (!imageA) {
        console.log(`  [${id}] Generating image for A: ${optionA}`);
        const buf = await generateImage(optionA);
        const checkA = validateImageBuffer(buf);
        if (!checkA.valid) {
          console.warn(`  [${id}] Image A ${checkA.width ?? '?'}×${checkA.height ?? '?'}px — минимум ${MIN_IMAGE_SIZE}×${MIN_IMAGE_SIZE}, пропуск`);
        } else {
          imageA = await uploadToStorage(buf, `${STORAGE_PREFIX}/${id}-A.png`);
          updated = true;
          generated++;
        }
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
      }
      if (!imageB) {
        console.log(`  [${id}] Generating image for B: ${optionB}`);
        const buf = await generateImage(optionB);
        const checkB = validateImageBuffer(buf);
        if (!checkB.valid) {
          console.warn(`  [${id}] Image B ${checkB.width ?? '?'}×${checkB.height ?? '?'}px — минимум ${MIN_IMAGE_SIZE}×${MIN_IMAGE_SIZE}, пропуск`);
        } else {
          imageB = await uploadToStorage(buf, `${STORAGE_PREFIX}/${id}-B.png`);
          updated = true;
          generated++;
        }
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
      }

      if (updated) {
        await docSnap.ref.update({ imageA: imageA || null, imageB: imageB || null });
        console.log(`  [${id}] Updated: ${optionA} vs ${optionB}`);
      }
    } catch (e) {
      console.error(`  [${id}] Error:`, e);
    }
  }

  console.log(`Done. Generated ${generated} images.`);
}

main().catch(console.error);