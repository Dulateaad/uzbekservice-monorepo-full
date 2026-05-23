/**
 * Запуск `firebase emulators:exec` с абсолютным `--prefix` к `emulator-tests` (корень peoplehub),
 * чтобы `npm test` не искал папку от текущего cwd (`loadtest/locust` и т.д.).
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const firebase = path.join(root, "node_modules", ".bin", "firebase");
if (!fs.existsSync(firebase) && !fs.existsSync(firebase + ".cmd")) {
  console.error("Сначала из peoplehub: npm install  (нужен firebase-tools в node_modules).");
  process.exit(1);
}
const prefix = path.join(root, "emulator-tests");
const subcommand = `npm run test --prefix "${prefix}"`;

const r = spawnSync(firebase, ["emulators:exec", "--only", "firestore", "--project", "demo-peoplehub", subcommand], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

if (r.error) {
  console.error(r.error);
  process.exit(1);
}
process.exit(r.status === null || r.status === undefined ? 1 : r.status);
