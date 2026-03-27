/**
 * Seed объектов + карточек (архитектура: карточка = 2 объекта).
 * Картинки — Wikimedia Commons / бесплатные URL, без Vertex AI.
 *
 * GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:objects
 *
 * --replace  удалить все verdict_cards и verdict_objects, затем залить заново
 */
import { createHash } from 'crypto';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { OBJECTS, CARDS } from './lib/seed-objects-data';

function cardId(optionA: string, optionB: string, category: string): string {
  const h = createHash('sha256').update(`${category}:${optionA}:${optionB}`).digest('hex').slice(0, 24);
  return `card_${h}`;
}

const REPLACE = process.argv.includes('--replace');

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed:objects');
    process.exit(1);
  }

  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault() });
  }
  const db = getFirestore();

  if (REPLACE) {
    console.log('Removing verdict_objects and verdict_cards...');
    const batchSize = 400;
    for (const col of ['verdict_objects', 'verdict_cards']) {
      let snap = await db.collection(col).limit(batchSize).get();
      while (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        snap = await db.collection(col).limit(batchSize).get();
      }
    }
  }

  const objById = new Map(OBJECTS.map((o) => [o.id, o]));

  for (const o of OBJECTS) {
    await db.collection('verdict_objects').doc(o.id).set(
      {
        label: o.label,
        imageUrl: o.imageUrl,
        imageSource: o.imageSource,
        externalRef: o.externalRef ?? null,
        createdAt: Timestamp.now(),
      },
      { merge: true }
    );
    console.log(`Object: ${o.id}`);
  }

  for (const c of CARDS) {
    const id = cardId(c.optionA, c.optionB, c.category);
    const oa = objById.get(c.objectIdA);
    const ob = objById.get(c.objectIdB);
    if (!oa || !ob) {
      console.warn(`Skip card (missing object): ${c.optionA} vs ${c.optionB}`);
      continue;
    }

    await db
      .collection('verdict_cards')
      .doc(id)
      .set(
        {
          optionA: c.optionA,
          optionB: c.optionB,
          category: c.category,
          objectIdA: c.objectIdA,
          objectIdB: c.objectIdB,
          imageA: oa.imageUrl,
          imageB: ob.imageUrl,
          votesA: 0,
          votesB: 0,
          createdAt: Timestamp.now(),
          status: 'published',
          qualityScore: 0.85,
        },
        { merge: true }
      );
    console.log(`Card: ${c.optionA} vs ${c.optionB} [${id}]`);
  }

  console.log('Done. Objects:', OBJECTS.length, 'Cards:', CARDS.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
