const { Pool } = require("pg");
const bcrypt = require("bcrypt");

(async () => {
  const pool = new Pool({
    user: "postgres",
    password: "Sula2206",
    host: "localhost",
    port: 5432,
    database: "greenflowers_db",
  });

  try {
    // Создать хеш пароля
    const password = "test123";
    const passwordHash = await bcrypt.hash(password, 10);

    console.log(
      "Создаем тестового пользователя с email: test@example.com, пароль: test123",
    );
    console.log("Хеш пароля:", passwordHash);

    // Удалить старого тестового пользователя если есть
    await pool.query("DELETE FROM users WHERE email = $1", [
      "test@example.com",
    ]);

    // Создать нового
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone, city, company_name, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, 'user', true) 
       RETURNING id, email, role`,
      [
        "test@example.com",
        passwordHash,
        "Test User",
        "1234567890",
        "Almaty",
        "Test Co",
      ],
    );

    console.log("\n✅ Тестовый пользователь создан:");
    console.log(JSON.stringify(result.rows[0], null, 2));
    console.log("\nТеперь можете залогиниться с:");
    console.log("Email: test@example.com");
    console.log("Password: test123");
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  } finally {
    pool.end();
  }
})();
