/**
 * Сгенерировать тестовый JWT под тот же secret, что у Cloud Functions.
 * Не кладите прод-секрет в репо. Запуск: только на машине, где в env есть JWT_SECRET.
 *
 * Пример:
 *   cd /Users/.../peoplehub/loadtest/scripts
 *   JWT_SECRET="..." node mint-jwt.cjs tg_123 1111111 CLIENT
 *
 * В Firestore users/tg_123 должен существовать документ (и статус не BLOCKED).
 */
const path = require("path");
const jwt = require(path.join(__dirname, "../../functions/node_modules/jsonwebtoken"));

const [,, userId, telegramId, role] = process.argv;
if (!userId) {
  console.error("Usage: JWT_SECRET=... node mint-jwt.cjs <userId> <telegramId> <CLIENT|DRIVER>");
  process.exit(1);
}
const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error("Set JWT_SECRET (same as in Functions config / Secret Manager).");
  process.exit(1);
}
const tId = telegramId || "0";
const r = (role === "DRIVER" ? "DRIVER" : "CLIENT");
const token = jwt.sign(
  { userId, telegramId: tId, role: r },
  secret,
  { expiresIn: "2h" }
);
console.log(token);
