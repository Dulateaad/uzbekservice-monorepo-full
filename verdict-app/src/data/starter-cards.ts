import type { VerdictCard } from '@/types/card';

/**
 * 100 стартовых залипательных карточек
 * Категории: звёзды, спорт, фильмы, игры, технологии, еда, путешествия, отношения, жизненные выборы
 */

const generateId = () => Math.random().toString(36).slice(2, 11);

export const STARTER_CARDS: Omit<VerdictCard, 'votesA' | 'votesB' | 'totalVotes' | 'createdAt'>[] = [
  // Звёзды
  { id: generateId(), optionA: 'Месси', optionB: 'Роналду', category: 'popular' },
  { id: generateId(), optionA: 'Мбаппе', optionB: 'Холанд', category: 'popular' },
  { id: generateId(), optionA: 'Брэд Питт', optionB: 'Леонардо ДиКаприо', category: 'popular' },
  { id: generateId(), optionA: 'Том Круз', optionB: 'Киану Ривз', category: 'popular' },
  { id: generateId(), optionA: 'Дуэйн Джонсон', optionB: 'Джейсон Стэйтем', category: 'popular' },
  { id: generateId(), optionA: 'Майкл Джордан', optionB: 'Леброн Джеймс', category: 'popular' },
  { id: generateId(), optionA: 'Пеле', optionB: 'Марадона', category: 'popular' },
  // Спорт
  { id: generateId(), optionA: 'Барселона', optionB: 'Реал Мадрид', category: 'popular' },
  { id: generateId(), optionA: 'UFC', optionB: 'Бокс', category: 'popular' },
  { id: generateId(), optionA: 'Формула 1', optionB: 'MotoGP', category: 'popular' },
  { id: generateId(), optionA: 'Футбол', optionB: 'Баскетбол', category: 'popular' },
  // Фильмы
  { id: generateId(), optionA: 'Marvel', optionB: 'DC', category: 'gaming' },
  { id: generateId(), optionA: 'Бэтмен', optionB: 'Человек-паук', category: 'gaming' },
  { id: generateId(), optionA: 'Гарри Поттер', optionB: 'Властелин колец', category: 'gaming' },
  { id: generateId(), optionA: 'Аватар', optionB: 'Титаник', category: 'gaming' },
  { id: generateId(), optionA: 'Форсаж', optionB: 'Трансформеры', category: 'gaming' },
  // Игры
  { id: generateId(), optionA: 'PlayStation', optionB: 'Xbox', category: 'gaming' },
  { id: generateId(), optionA: 'GTA', optionB: 'Call of Duty', category: 'gaming' },
  { id: generateId(), optionA: 'PUBG', optionB: 'Fortnite', category: 'gaming' },
  { id: generateId(), optionA: 'Minecraft', optionB: 'Roblox', category: 'gaming' },
  { id: generateId(), optionA: 'Dota', optionB: 'League of Legends', category: 'gaming' },
  // Технологии
  { id: generateId(), optionA: 'iPhone', optionB: 'Samsung', category: 'popular' },
  { id: generateId(), optionA: 'Android', optionB: 'iOS', category: 'popular' },
  { id: generateId(), optionA: 'MacBook', optionB: 'Windows', category: 'popular' },
  { id: generateId(), optionA: 'Tesla', optionB: 'BMW', category: 'popular' },
  { id: generateId(), optionA: 'Apple', optionB: 'Samsung', category: 'popular' },
  // Авто
  { id: generateId(), optionA: 'Ferrari', optionB: 'Lamborghini', category: 'popular' },
  { id: generateId(), optionA: 'BMW', optionB: 'Mercedes', category: 'popular' },
  { id: generateId(), optionA: 'Porsche', optionB: 'Audi', category: 'popular' },
  { id: generateId(), optionA: 'Range Rover', optionB: 'Land Cruiser', category: 'popular' },
  // Еда
  { id: generateId(), optionA: 'Пицца', optionB: 'Суши', category: 'popular' },
  { id: generateId(), optionA: 'Бургер', optionB: 'Шаурма', category: 'popular' },
  { id: generateId(), optionA: 'Кофе', optionB: 'Чай', category: 'popular' },
  { id: generateId(), optionA: 'Шоколад', optionB: 'Мороженое', category: 'popular' },
  { id: generateId(), optionA: 'Паста', optionB: 'Рамен', category: 'popular' },
  // Путешествия
  { id: generateId(), optionA: 'Бали', optionB: 'Таиланд', category: 'popular' },
  { id: generateId(), optionA: 'Париж', optionB: 'Рим', category: 'popular' },
  { id: generateId(), optionA: 'Море', optionB: 'Горы', category: 'popular' },
  { id: generateId(), optionA: 'Отель', optionB: 'Airbnb', category: 'popular' },
  { id: generateId(), optionA: 'Лето', optionB: 'Зима', category: 'popular' },
  // Парадокс
  { id: generateId(), optionA: 'Деньги', optionB: 'Свобода', category: 'paradox' },
  { id: generateId(), optionA: 'Любовь', optionB: 'Деньги', category: 'paradox' },
  { id: generateId(), optionA: 'Сон', optionB: 'Успех', category: 'paradox' },
  { id: generateId(), optionA: 'Работа', optionB: 'Путешествия', category: 'paradox' },
  { id: generateId(), optionA: 'Дом', optionB: 'Мир', category: 'paradox' },
  { id: generateId(), optionA: 'Риск', optionB: 'Комфорт', category: 'paradox' },
  { id: generateId(), optionA: 'Время', optionB: 'Деньги', category: 'paradox' },
  // Философия
  { id: generateId(), optionA: 'Разум', optionB: 'Сердце', category: 'philosophy' },
  { id: generateId(), optionA: 'Правда', optionB: 'Комфорт', category: 'philosophy' },
  { id: generateId(), optionA: 'Свобода', optionB: 'Стабильность', category: 'philosophy' },
  { id: generateId(), optionA: 'Успех', optionB: 'Счастье', category: 'philosophy' },
  { id: generateId(), optionA: 'Мечта', optionB: 'Реальность', category: 'philosophy' },
  // Быстрые (простые моментальные)
  { id: generateId(), optionA: 'День', optionB: 'Ночь', category: 'fast' },
  { id: generateId(), optionA: 'Лето', optionB: 'Зима', category: 'fast' },
  { id: generateId(), optionA: 'Кофе', optionB: 'Чай', category: 'fast' },
  { id: generateId(), optionA: 'Утро', optionB: 'Вечер', category: 'fast' },
  { id: generateId(), optionA: 'Горячее', optionB: 'Холодное', category: 'fast' },
  { id: generateId(), optionA: 'Солнце', optionB: 'Луна', category: 'fast' },
  { id: generateId(), optionA: 'Город', optionB: 'Природа', category: 'fast' },
  // Абсурд
  { id: generateId(), optionA: 'Собака', optionB: 'Интернет', category: 'absurd' },
  { id: generateId(), optionA: 'Пицца', optionB: 'Сон', category: 'absurd' },
  { id: generateId(), optionA: 'Кофе', optionB: 'Отпуск', category: 'absurd' },
  { id: generateId(), optionA: 'Кот', optionB: 'Wi-Fi', category: 'absurd' },
  { id: generateId(), optionA: 'Утро', optionB: 'Ночь', category: 'absurd' },
  // Отношения (Познай себя)
  { id: generateId(), optionA: 'Любовь', optionB: 'Свобода', category: 'love' },
  { id: generateId(), optionA: 'Простить', optionB: 'Уйти', category: 'love' },
  { id: generateId(), optionA: 'Романтика', optionB: 'Дружба', category: 'love' },
  { id: generateId(), optionA: 'Карьера', optionB: 'Семья', category: 'family' },
  { id: generateId(), optionA: 'Дети', optionB: 'Карьера', category: 'family' },
  { id: generateId(), optionA: 'Родители', optionB: 'Друзья', category: 'family' },
  { id: generateId(), optionA: 'Риск', optionB: 'Безопасность', category: 'character' },
  { id: generateId(), optionA: 'Логика', optionB: 'Интуиция', category: 'character' },
  { id: generateId(), optionA: 'Лидер', optionB: 'Команда', category: 'character' },
  { id: generateId(), optionA: 'Работа', optionB: 'Бизнес', category: 'money' },
  { id: generateId(), optionA: 'Экономить', optionB: 'Тратить', category: 'money' },
  { id: generateId(), optionA: 'Зарплата', optionB: 'Свой бизнес', category: 'money' },
  { id: generateId(), optionA: 'Город', optionB: 'Деревня', category: 'lifestyle' },
  { id: generateId(), optionA: 'Спорт', optionB: 'Отдых', category: 'lifestyle' },
  { id: generateId(), optionA: 'ЗОЖ', optionB: 'Удовольствия', category: 'lifestyle' },
];

export function getCardsWithVotes(): VerdictCard[] {
  return STARTER_CARDS.map(c => ({
    ...c,
    votesA: Math.floor(Math.random() * 500) + 50,
    votesB: Math.floor(Math.random() * 500) + 50,
    totalVotes: 0,
    createdAt: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
  })).map(c => ({
    ...c,
    totalVotes: c.votesA + c.votesB,
  }));
}

export function getCardsByCategory(category: string): VerdictCard[] {
  const cards = getCardsWithVotes();
  return cards.filter(c => c.category === category);
}
