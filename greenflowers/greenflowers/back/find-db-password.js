const { Pool } = require("pg");

// Попытаемся подключиться с разными паролями
const testPasswords = [
  "postgres", // стандартный пароль
  "Sula2206", // пароль из .env
  "password", // общий пароль
  "admin", // admin
];

const testWithPassword = async (password) => {
  console.log(`\n🔐 Testing with password: "${password}"`);

  const pool = new Pool({
    host: "localhost",
    port: 5432,
    database: "postgres", // подключаемся к стандартной БД
    user: "postgres",
    password: password,
  });

  try {
    const result = await pool.query("SELECT version()");
    console.log("✅ Connected successfully!");
    console.log("Version:", result.rows[0].version.substring(0, 60) + "...");
    await pool.end();
    return true;
  } catch (error) {
    console.error("❌ Failed:", error.code, error.message.substring(0, 80));
    await pool.end();
    return false;
  }
};

const testAllPasswords = async () => {
  console.log("🔍 Testing PostgreSQL connection with different passwords...");

  for (const password of testPasswords) {
    const success = await testWithPassword(password);
    if (success) {
      console.log(`\n✅ FOUND: Use password "${password}" in .env`);
      return password;
    }
  }

  console.error("\n❌ Could not connect with any password");
  return null;
};

testAllPasswords();
