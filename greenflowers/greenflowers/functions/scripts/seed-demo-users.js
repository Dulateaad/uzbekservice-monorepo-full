/**
 * Создаёт демо-пользователей для входа по email/паролю.
 * Запуск из каталога functions с учётными данными Firebase Admin:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/seed-demo-users.js
 * или: firebase use greenflowers-15776 && npx firebase-tools functions:shell (не подходит)
 * Проще: gcloud auth application-default login && export GCLOUD_PROJECT=greenflowers-15776 && node scripts/seed-demo-users.js
 *
 * Либо из корня проекта с сервисным аккаунтом.
 */

const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
const { nextId } = require("../lib/counters");

const DEMO_USERS = [
  {
    email: "client@test.kz",
    password: "client123",
    role: "user",
    name: "Демо клиент",
    phone: "+77000000001",
  },
  {
    email: "worker@sprayflowers.kz",
    password: "worker123",
    role: "worker",
    name: "Демо работник",
    phone: "+77000000002",
  },
  {
    email: "admin@sprayflowers.kz",
    password: "admin123",
    role: "admin",
    name: "Демо админ",
    phone: "+77000000003",
  },
];

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  const db = admin.firestore();

  for (const u of DEMO_USERS) {
    const email = u.email.trim().toLowerCase();
    const snap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();
      const passwordHash = await bcrypt.hash(u.password, 10);
      await doc.ref.update({
        password_hash: passwordHash,
        role: u.role,
        name: u.name,
        phone: u.phone,
        is_active: true,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Updated:", email, "id=", data.id, "doc=", doc.id);
      continue;
    }

    const uid = await nextId(db, "UserId");
    const passwordHash = await bcrypt.hash(u.password, 10);
    const docId = String(uid);
    await db.collection("users").doc(docId).set({
      id: uid,
      email,
      password_hash: passwordHash,
      name: u.name,
      phone: u.phone,
      city: "Алматы",
      role: u.role,
      is_active: true,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("Created:", email, "id=", uid);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
