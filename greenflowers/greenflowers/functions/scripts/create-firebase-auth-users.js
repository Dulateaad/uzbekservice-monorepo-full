/**
 * Создаёт пользователей Firebase Authentication (email/password).
 * В консоли Firebase: Authentication → Sign-in method → Email/Password — включить.
 *
 *   cd functions && node scripts/create-firebase-auth-users.js
 */
const admin = require("firebase-admin");

const USERS = [
  { email: "client@test.kz", password: "client123" },
  { email: "worker@sprayflowers.kz", password: "worker123" },
  { email: "admin@sprayflowers.kz", password: "admin123" },
];

async function main() {
  if (!admin.apps.length) admin.initializeApp();
  const auth = admin.auth();

  for (const u of USERS) {
    try {
      await auth.createUser({
        email: u.email,
        password: u.password,
        emailVerified: true,
      });
      console.log("Created Auth user:", u.email);
    } catch (e) {
      if (e.code === "auth/email-already-exists") {
        console.log("Already exists:", u.email);
      } else {
        console.error(u.email, e.message);
      }
    }
  }
  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
