/**
 * Генерация карточек через Gemini API.
 * Создаёт текст (optionA vs optionB) и сохраняет в Firestore.
 *
 * Требования:
 * - GEMINI_API_KEY в .env (https://aistudio.google.com/apikey)
 * - GOOGLE_APPLICATION_CREDENTIALS для Firebase Admin
 *
 * Запуск: npm run generate:cards
 */
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
config({ path: envPath, override: false });

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'verdict-c5e0d';
const API_KEY = process.env.GEMINI_API_KEY;

const PROMPT = `Сгенерируй 50 карточек для приложения голосования "A vs B".

Формат вывода — ТОЛЬКО валидный JSON массив, без markdown и пояснений:
[{"optionA":"строка","optionB":"строка","category":"категория"}]

Правила:
- optionA и optionB — короткие (1-3 слова), залипательные сравнения
- Категории: popular, paradox, philosophy, absurd, fast, gaming
- popular: звёзды, спорт, технологии, еда, путешествия
- paradox: неожиданные контрасты (Деньги vs Свобода)
- philosophy: глубокие жизненные вопросы
- absurd: смешные неожиданные пары
- fast: максимально простые (День vs Ночь)
- gaming: игры, фильмы, сериалы

Выведи только JSON массив.`;

async function main() {
  if (!API_KEY) {
    console.error('Добавь GEMINI_API_KEY в .env (https://aistudio.google.com/apikey)');
    console.error('Или запусти: GEMINI_API_KEY=твой_ключ npm run generate:cards');
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Укажи GOOGLE_APPLICATION_CREDENTIALS=./service-account.json');
    process.exit(1);
  }

  if (getApps().length === 0) {
    initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });
  }
  const db = getFirestore();

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  console.log('Генерация карточек через Gemini...');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: PROMPT,
  });

  const text = response.text?.trim() || '';
  let jsonStr = text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  let cards: { optionA: string; optionB: string; category: string }[];
  try {
    cards = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Gemini вернул невалидный JSON:', text.slice(0, 200));
    process.exit(1);
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    console.error('Пустой или неверный массив карточек');
    process.exit(1);
  }

  const validCategories = ['popular', 'paradox', 'philosophy', 'absurd', 'fast', 'gaming'];
  let created = 0;
  for (const card of cards) {
    const a = String(card.optionA || '').trim();
    const b = String(card.optionB || '').trim();
    const cat = validCategories.includes(card.category) ? card.category : 'popular';
    if (!a || !b) continue;

    await db.collection('verdict_cards').add({
      optionA: a,
      optionB: b,
      category: cat,
      votesA: 0,
      votesB: 0,
      status: 'published',
      createdAt: Timestamp.now(),
    });
    console.log(`  ${a} vs ${b} [${cat}]`);
    created++;
  }

  console.log(`\nГотово! Создано ${created} карточек.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
