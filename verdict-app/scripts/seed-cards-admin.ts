/**
 * Seed через Firebase Admin SDK (обходит Firestore rules).
 * Нужен service account: Firebase Console → Project Settings → Service Accounts → Generate key.
 *
 * Запуск:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:admin
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const CARDS = [
  // Популярные
  { optionA: 'Месси', optionB: 'Роналду', category: 'popular' },
  { optionA: 'Мбаппе', optionB: 'Холанд', category: 'popular' },
  { optionA: 'iPhone', optionB: 'Samsung', category: 'popular' },
  { optionA: 'Кофе', optionB: 'Чай', category: 'popular' },
  { optionA: 'Пицца', optionB: 'Суши', category: 'popular' },
  { optionA: 'Барселона', optionB: 'Реал Мадрид', category: 'popular' },
  { optionA: 'Футбол', optionB: 'Баскетбол', category: 'popular' },
  // Игровые
  { optionA: 'PlayStation', optionB: 'Xbox', category: 'gaming' },
  { optionA: 'Marvel', optionB: 'DC', category: 'gaming' },
  { optionA: 'GTA', optionB: 'Call of Duty', category: 'gaming' },
  { optionA: 'Minecraft', optionB: 'Roblox', category: 'gaming' },
  // Парадокс
  { optionA: 'Деньги', optionB: 'Свобода', category: 'paradox' },
  { optionA: 'Любовь', optionB: 'Деньги', category: 'paradox' },
  { optionA: 'Сон', optionB: 'Успех', category: 'paradox' },
  { optionA: 'Работа', optionB: 'Путешествия', category: 'paradox' },
  // Философия
  { optionA: 'Разум', optionB: 'Сердце', category: 'philosophy' },
  { optionA: 'Правда', optionB: 'Комфорт', category: 'philosophy' },
  { optionA: 'Свобода', optionB: 'Стабильность', category: 'philosophy' },
  // Абсурд
  { optionA: 'Собака', optionB: 'Интернет', category: 'absurd' },
  { optionA: 'Пицца', optionB: 'Сон', category: 'absurd' },
  { optionA: 'Кот', optionB: 'Wi-Fi', category: 'absurd' },
  // Быстрые
  { optionA: 'День', optionB: 'Ночь', category: 'fast' },
  { optionA: 'Лето', optionB: 'Зима', category: 'fast' },
  { optionA: 'Кофе', optionB: 'Чай', category: 'fast' },
  { optionA: 'Утро', optionB: 'Вечер', category: 'fast' },
  { optionA: 'Солнце', optionB: 'Луна', category: 'fast' },
  // Познай себя
  { optionA: 'Любовь', optionB: 'Свобода', category: 'love' },
  { optionA: 'Простить', optionB: 'Уйти', category: 'love' },
  { optionA: 'Карьера', optionB: 'Семья', category: 'family' },
  { optionA: 'Дети', optionB: 'Карьера', category: 'family' },
  { optionA: 'Риск', optionB: 'Безопасность', category: 'character' },
  { optionA: 'Логика', optionB: 'Интуиция', category: 'character' },
  { optionA: 'Работа', optionB: 'Бизнес', category: 'money' },
  { optionA: 'Экономить', optionB: 'Тратить', category: 'money' },
  { optionA: 'Город', optionB: 'Деревня', category: 'lifestyle' },
  { optionA: 'Спорт', optionB: 'Отдых', category: 'lifestyle' },
];

async function seed() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Укажите GOOGLE_APPLICATION_CREDENTIALS с путём к service account JSON');
    console.error('Пример: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:admin');
    process.exit(1);
  }

  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault() });
  }
  const db = getFirestore();

  for (const card of CARDS) {
    await db.collection('verdict_cards').add({
      ...card,
      votesA: 0,
      votesB: 0,
      createdAt: Timestamp.now(),
    });
    console.log(`Created: ${card.optionA} vs ${card.optionB}`);
  }
  console.log('Done!');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
