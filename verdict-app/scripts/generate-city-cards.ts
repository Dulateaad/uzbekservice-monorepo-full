/**
 * Генерация локальных карточек для конкретного города через Gemini.
 * Сохраняет в Firestore с geo_scope = 'city' / 'country'.
 *
 * Одиночный город:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run generate:city -- --city Алматы --country KZ --lang ru
 *
 * Все города из встроенного списка:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run generate:city -- --all
 *
 * Обновление просроченных (weekly cron):
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run generate:city -- --refresh
 */
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env'), override: false });

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'verdict-c5e0d';
const API_KEY = process.env.GEMINI_API_KEY;
const CARDS_COLLECTION = 'verdict_cards';
const CACHE_COLLECTION = 'geo_content_cache';
const CACHE_TTL_DAYS = 7;

interface CitySpec {
  city: string;
  country: string;
  lang: string;
  count?: number;
}

const CIS_CITIES: CitySpec[] = [
  // Kazakhstan
  { city: 'Алматы', country: 'KZ', lang: 'ru', count: 50 },
  { city: 'Астана', country: 'KZ', lang: 'ru', count: 50 },
  { city: 'Шымкент', country: 'KZ', lang: 'ru', count: 30 },
  { city: 'Караганда', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Актобе', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Тараз', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Павлодар', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Атырау', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Семей', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Костанай', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Петропавловск', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Уральск', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Кызылорда', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Актау', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Усть-Каменогорск', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Туркестан', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Талдыкорган', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Кокшетау', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Экибастуз', country: 'KZ', lang: 'ru', count: 20 },
  { city: 'Жезказган', country: 'KZ', lang: 'ru', count: 20 },
  // Russia
  { city: 'Москва', country: 'RU', lang: 'ru', count: 50 },
  { city: 'Санкт-Петербург', country: 'RU', lang: 'ru', count: 50 },
  { city: 'Екатеринбург', country: 'RU', lang: 'ru', count: 30 },
  { city: 'Новосибирск', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Казань', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Нижний Новгород', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Челябинск', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Самара', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Ростов-на-Дону', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Уфа', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Красноярск', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Воронеж', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Пермь', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Волгоград', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Краснодар', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Саратов', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Тюмень', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Тольятти', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Ижевск', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Барнаул', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Иркутск', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Хабаровск', country: 'RU', lang: 'ru', count: 20 },
  { city: 'Владивосток', country: 'RU', lang: 'ru', count: 20 },
  // Uzbekistan
  { city: 'Ташкент', country: 'UZ', lang: 'ru', count: 40 },
  { city: 'Самарканд', country: 'UZ', lang: 'ru', count: 25 },
  { city: 'Бухара', country: 'UZ', lang: 'ru', count: 20 },
  { city: 'Наманган', country: 'UZ', lang: 'ru', count: 20 },
  // Ukraine
  { city: 'Киев', country: 'UA', lang: 'ru', count: 40 },
  { city: 'Одесса', country: 'UA', lang: 'ru', count: 20 },
  { city: 'Харьков', country: 'UA', lang: 'ru', count: 20 },
  // Belarus
  { city: 'Минск', country: 'BY', lang: 'ru', count: 30 },
  // Kyrgyzstan
  { city: 'Бишкек', country: 'KG', lang: 'ru', count: 25 },
  // Georgia
  { city: 'Тбилиси', country: 'GE', lang: 'ru', count: 20 },
];

function buildPrompt(city: string, country: string, lang: string, count: number): string {
  return `Страна: «${country}»
Город: «${city}»
Язык карточек: «${lang === 'ru' ? 'русский' : lang === 'en' ? 'английский' : lang}»

Создай ${count} карточек A vs B ТОЛЬКО для этого города.

Темы карточек:
- Местные кафе и рестораны которые все знают
- Районы города — где лучше жить/гулять
- Местные бренды и сервисы
- Местные споры которые есть только здесь
- Места отдыха только этого города
- Местные знаменитости

Правила:
- Понятно ТОЛЬКО жителям этого города
- Вызывает локальный спор
- Нет политики, религии, войны
- optionA и optionB — короткие (1-3 слова)

Верни ТОЛЬКО валидный JSON массив, без markdown и пояснений:
[{"optionA":"строка","optionB":"строка","category":"popular"}]`;
}

function cardId(optionA: string, optionB: string, city: string): string {
  return 'city_' + createHash('sha256').update(`${city}:${optionA}:${optionB}`).digest('hex').slice(0, 20);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function generateForCity(
  db: FirebaseFirestore.Firestore,
  ai: GoogleGenAI,
  spec: CitySpec,
): Promise<number> {
  const count = spec.count ?? 20;
  const prompt = buildPrompt(spec.city, spec.country, spec.lang, count);

  console.log(`\n🌍 ${spec.city} (${spec.country}) — генерация ${count} карточек...`);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const text = response.text?.trim() || '';
  let jsonStr = text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  let cards: { optionA: string; optionB: string; category?: string }[];
  try {
    cards = JSON.parse(jsonStr);
  } catch {
    console.error(`  ❌ Невалидный JSON для ${spec.city}:`, text.slice(0, 150));
    return 0;
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    console.error(`  ❌ Пустой массив для ${spec.city}`);
    return 0;
  }

  let created = 0;
  const cardIds: string[] = [];
  for (const card of cards) {
    const a = String(card.optionA || '').trim();
    const b = String(card.optionB || '').trim();
    if (!a || !b) continue;

    const id = cardId(a, b, spec.city);
    cardIds.push(id);

    await db.collection(CARDS_COLLECTION).doc(id).set({
      optionA: a,
      optionB: b,
      category: card.category || 'popular',
      geoScope: 'city',
      country: spec.country,
      city: spec.city,
      language: spec.lang,
      votesA: 0,
      votesB: 0,
      status: 'published',
      createdAt: Timestamp.now(),
    }, { merge: true });

    console.log(`  ✅ ${a} vs ${b}`);
    created++;
  }

  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.collection(CACHE_COLLECTION).doc(`${spec.country}_${spec.city}`).set({
    city: spec.city,
    country: spec.country,
    language: spec.lang,
    cardCount: created,
    cardIds,
    generatedAt: now,
    expiresAt,
  });

  console.log(`  📊 ${spec.city}: ${created} карточек создано`);
  return created;
}

async function main() {
  if (!API_KEY) {
    console.error('GEMINI_API_KEY= в .env');
    process.exit(1);
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS=./service-account.json');
    process.exit(1);
  }

  if (getApps().length === 0) {
    initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });
  }
  const db = getFirestore();
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const args = process.argv.slice(2);

  if (args.includes('--refresh')) {
    console.log('🔄 Обновление просроченных городов...');
    const now = Timestamp.now();
    const snap = await db.collection(CACHE_COLLECTION).get();
    const expired: CitySpec[] = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      if (d.expiresAt && d.expiresAt.toMillis() < now.toMillis()) {
        expired.push({ city: d.city, country: d.country, lang: d.language || 'ru', count: d.cardCount || 20 });
      }
    }
    if (expired.length === 0) {
      console.log('Нет просроченных городов');
      return;
    }
    console.log(`Обновляем ${expired.length} городов...`);
    let total = 0;
    for (const spec of expired) {
      total += await generateForCity(db, ai, spec);
      await sleep(2000);
    }
    console.log(`\n✅ Обновлено карточек: ${total}`);
    return;
  }

  if (args.includes('--all')) {
    console.log(`🌍 Генерация для всех ${CIS_CITIES.length} городов СНГ...`);
    let total = 0;
    for (const spec of CIS_CITIES) {
      total += await generateForCity(db, ai, spec);
      await sleep(2000);
    }
    console.log(`\n✅ Всего создано карточек: ${total}`);
    return;
  }

  const cityIdx = args.indexOf('--city');
  const countryIdx = args.indexOf('--country');
  const langIdx = args.indexOf('--lang');
  const countIdx = args.indexOf('--count');

  if (cityIdx === -1 || countryIdx === -1) {
    console.log('Использование:');
    console.log('  --city Алматы --country KZ --lang ru [--count 20]');
    console.log('  --all      — все города СНГ');
    console.log('  --refresh  — обновить просроченные');
    process.exit(1);
  }

  const spec: CitySpec = {
    city: args[cityIdx + 1],
    country: args[countryIdx + 1],
    lang: langIdx !== -1 ? args[langIdx + 1] : 'ru',
    count: countIdx !== -1 ? parseInt(args[countIdx + 1]) : 20,
  };

  const created = await generateForCity(db, ai, spec);
  console.log(`\n✅ Создано ${created} карточек для ${spec.city}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
