/**
 * Добавляет карточки только для категорий, в которых их ещё нет.
 * Не создаёт дубликаты.
 *
 * Запуск: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:missing
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const CARDS_BY_CATEGORY: Record<string, { optionA: string; optionB: string }[]> = {
  fast: [
    { optionA: 'День', optionB: 'Ночь' },
    { optionA: 'Лето', optionB: 'Зима' },
    { optionA: 'Кофе', optionB: 'Чай' },
    { optionA: 'Утро', optionB: 'Вечер' },
    { optionA: 'Солнце', optionB: 'Луна' },
  ],
  popular: [
    { optionA: 'Барселона', optionB: 'Реал Мадрид' },
    { optionA: 'Футбол', optionB: 'Баскетбол' },
  ],
  gaming: [
    { optionA: 'GTA', optionB: 'Call of Duty' },
    { optionA: 'Minecraft', optionB: 'Roblox' },
  ],
  paradox: [
    { optionA: 'Сон', optionB: 'Успех' },
    { optionA: 'Работа', optionB: 'Путешествия' },
  ],
  philosophy: [
    { optionA: 'Правда', optionB: 'Комфорт' },
    { optionA: 'Свобода', optionB: 'Стабильность' },
  ],
  absurd: [
    { optionA: 'Пицца', optionB: 'Сон' },
    { optionA: 'Кот', optionB: 'Wi-Fi' },
  ],
  love: [
    { optionA: 'Простить', optionB: 'Уйти' },
    { optionA: 'Романтика', optionB: 'Дружба' },
  ],
  family: [
    { optionA: 'Дети', optionB: 'Карьера' },
    { optionA: 'Родители', optionB: 'Друзья' },
  ],
  character: [
    { optionA: 'Логика', optionB: 'Интуиция' },
    { optionA: 'Лидер', optionB: 'Команда' },
  ],
  money: [
    { optionA: 'Экономить', optionB: 'Тратить' },
    { optionA: 'Зарплата', optionB: 'Свой бизнес' },
  ],
  lifestyle: [
    { optionA: 'Спорт', optionB: 'Отдых' },
    { optionA: 'ЗОЖ', optionB: 'Удовольствия' },
  ],
};

async function seedMissing() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:missing');
    process.exit(1);
  }

  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault() });
  }
  const db = getFirestore();

  const snapshot = await db.collection('verdict_cards').get();
  const categoriesPresent = new Set<string>();
  snapshot.docs.forEach((d) => {
    const cat = (d.data().category as string) || '';
    if (cat) categoriesPresent.add(cat);
  });

  let added = 0;
  for (const [category, cards] of Object.entries(CARDS_BY_CATEGORY)) {
    const count = snapshot.docs.filter((d) => (d.data().category as string) === category).length;
    if (count > 0) {
      console.log(`  [${category}] уже есть ${count} карточек, пропуск`);
      continue;
    }
    console.log(`  [${category}] добавляю ${cards.length} карточек`);
    for (const card of cards) {
      await db.collection('verdict_cards').add({
        optionA: card.optionA,
        optionB: card.optionB,
        category,
        votesA: 0,
        votesB: 0,
        createdAt: Timestamp.now(),
      });
      added++;
      console.log(`    + ${card.optionA} vs ${card.optionB}`);
    }
  }

  console.log(`\nГотово. Добавлено ${added} карточек.`);
}

seedMissing().catch((e) => {
  console.error(e);
  process.exit(1);
});
