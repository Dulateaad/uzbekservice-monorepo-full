/**
 * Скрипт для загрузки стартовых карточек в Firestore
 * Запуск: npm run seed (из verdict-app)
 * Требуется .env с VITE_FIREBASE_* (см. .env.example)
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

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  appId: process.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
};

const CARDS = [
  { optionA: 'Месси', optionB: 'Роналду', category: 'popular', tags: ['champion:football'] },
  { optionA: 'Мбаппе', optionB: 'Холанд', category: 'popular', tags: ['champion:football'] },
  { optionA: 'iPhone', optionB: 'Samsung', category: 'popular', tags: ['champion:phones'] },
  { optionA: 'Кофе', optionB: 'Чай', category: 'popular', tags: ['champion:food'] },
  { optionA: 'Пицца', optionB: 'Суши', category: 'popular', tags: ['champion:food'] },
  { optionA: 'Барселона', optionB: 'Реал Мадрид', category: 'popular', tags: ['champion:football'] },
  { optionA: 'Париж', optionB: 'Рим', category: 'popular', tags: ['champion:cities'] },
  { optionA: 'Брэд Питт', optionB: 'Леонардо ДиКаприо', category: 'popular', tags: ['champion:cinema'] },
  { optionA: 'PlayStation', optionB: 'Xbox', category: 'gaming', tags: ['champion:gaming'] },
  { optionA: 'Marvel', optionB: 'DC', category: 'gaming', tags: ['champion:cinema'] },
  { optionA: 'Деньги', optionB: 'Свобода', category: 'paradox' },
  { optionA: 'Любовь', optionB: 'Деньги', category: 'paradox' },
  { optionA: 'Разум', optionB: 'Сердце', category: 'philosophy' },
  { optionA: 'Собака', optionB: 'Интернет', category: 'absurd' },
  { optionA: 'День', optionB: 'Ночь', category: 'fast' },
  { optionA: 'Лето', optionB: 'Зима', category: 'fast' },
  { optionA: 'Любовь', optionB: 'Свобода', category: 'love' },
  { optionA: 'Карьера', optionB: 'Семья', category: 'family' },
  { optionA: 'Риск', optionB: 'Безопасность', category: 'character' },
  { optionA: 'Работа', optionB: 'Бизнес', category: 'money' },
  { optionA: 'Город', optionB: 'Деревня', category: 'lifestyle' },
];

async function seed() {
  if (!firebaseConfig.projectId) {
    console.error('Создайте .env из .env.example и заполните VITE_FIREBASE_*');
    process.exit(1);
  }
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const col = collection(db, 'verdict_cards');

  for (const card of CARDS) {
    const ref = doc(col);
    await setDoc(ref, {
      ...card,
      votesA: 0,
      votesB: 0,
      createdAt: Timestamp.now(),
    });
    console.log(`Created: ${card.optionA} vs ${card.optionB}`);
  }
  console.log('Done!');
}

seed().catch(console.error);
