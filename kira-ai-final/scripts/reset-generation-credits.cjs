/**
 * Одноразовый сброс лимитов генераций для всех профилей в Firestore (коллекция userProfiles).
 *
 * Запуск (из корня репозитория kira-ai-final):
 *   GOOGLE_APPLICATION_CREDENTIALS="/полный/путь/serviceAccount.json" node scripts/reset-generation-credits.cjs
 *
 * Или:
 *   node scripts/reset-generation-credits.cjs /полный/путь/serviceAccount.json
 *
 * Пользователи: photoCredits=5, videoCredits=10 (как при регистрации).
 * Партнёры (role === 'partner'): photoCredits=10, videoCredits=10.
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || process.argv[2];

if (!keyPath || !fs.existsSync(path.resolve(keyPath))) {
  console.error(
    "Укажите JSON ключ сервис-аккаунта:\n" +
      "  GOOGLE_APPLICATION_CREDENTIALS=/path/to.json node scripts/reset-generation-credits.cjs\n" +
      "или\n" +
      "  node scripts/reset-generation-credits.cjs /path/to.json"
  );
  process.exit(1);
}

const cred = JSON.parse(fs.readFileSync(path.resolve(keyPath), "utf8"));
admin.initializeApp({ credential: admin.credential.cert(cred) });

const db = admin.firestore();

function creditsFor(data) {
  if (data.role === "partner") {
    return { photoCredits: 10, videoCredits: 10 };
  }
  return { photoCredits: 5, videoCredits: 10 };
}

async function main() {
  const snap = await db.collection("userProfiles").get();
  if (snap.empty) {
    console.log("Коллекция userProfiles пуста.");
    return;
  }

  let updated = 0;
  const docs = snap.docs;
  const chunkSize = 450;

  for (let i = 0; i < docs.length; i += chunkSize) {
    const batch = db.batch();
    const slice = docs.slice(i, i + chunkSize);
    for (const doc of slice) {
      const data = doc.data();
      const { photoCredits, videoCredits } = creditsFor(data);
      batch.update(doc.ref, {
        photoCredits,
        videoCredits,
        updatedAt: new Date().toISOString(),
      });
      updated++;
    }
    await batch.commit();
    console.log(`Обновлено ${updated} / ${docs.length}…`);
  }

  console.log(`Готово. Всего профилей обновлено: ${updated}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
