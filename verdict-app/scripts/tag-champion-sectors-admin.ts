/**
 * Проставляет tags champion:* существующим карточкам в Firestore (по паре optionA/optionB).
 * Firebase Admin — нужен GOOGLE_APPLICATION_CREDENTIALS.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run tag:champion
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/** Совпадение по точной строке (как в сидах) */
const PAIR_TAGS: { a: string; b: string; tag: string }[] = [
  { a: 'Месси', b: 'Роналду', tag: 'champion:football' },
  { a: 'Мбаппе', b: 'Холанд', tag: 'champion:football' },
  { a: 'Барселона', b: 'Реал Мадрид', tag: 'champion:football' },
  { a: 'iPhone', b: 'Samsung', tag: 'champion:phones' },
  { a: 'Пицца', b: 'Суши', tag: 'champion:food' },
  { a: 'Париж', b: 'Рим', tag: 'champion:cities' },
  { a: 'Брэд Питт', b: 'Леонардо ДиКаприо', tag: 'champion:cinema' },
  { a: 'Marvel', b: 'DC', tag: 'champion:cinema' },
  { a: 'PlayStation', b: 'Xbox', tag: 'champion:gaming' },
  { a: 'Кофе', b: 'Чай', tag: 'champion:food' },
  { a: 'Бэтмен', b: 'Человек-паук', tag: 'champion:gaming' },
  { a: 'Гарри Поттер', b: 'Властелин колец', tag: 'champion:gaming' },
  { a: 'GTA', b: 'Call of Duty', tag: 'champion:gaming' },
  { a: 'PUBG', b: 'Fortnite', tag: 'champion:gaming' },
  { a: 'Dota', b: 'League of Legends', tag: 'champion:gaming' },
];

function tagForDoc(optionA: string, optionB: string): string | null {
  for (const r of PAIR_TAGS) {
    if (optionA === r.a && optionB === r.b) return r.tag;
    if (optionA === r.b && optionB === r.a) return r.tag;
  }
  return null;
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Нужен GOOGLE_APPLICATION_CREDENTIALS=./service-account.json');
    process.exit(1);
  }
  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault() });
  }
  const db = getFirestore();
  const snap = await db.collection('verdict_cards').get();
  let updated = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const a = String(d.optionA ?? '');
    const b = String(d.optionB ?? '');
    const tag = tagForDoc(a, b);
    if (!tag) continue;
    const existing: string[] = Array.isArray(d.tags) ? d.tags : [];
    if (existing.includes(tag)) continue;
    await doc.ref.update({ tags: [...existing, tag] });
    updated++;
    console.log(`+ ${tag} ← ${a} vs ${b}`);
  }
  console.log(`Done. Updated ${updated} documents.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
