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
    const password = "worker123";
    const passwordHash = await bcrypt.hash(password, 10);

    // Удаляем старого пользователя с таким email
    await pool.query("DELETE FROM users WHERE email = $1", [
      "worker2@sprayflowers.kz",
    ]);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone, city, company_name, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) 
       RETURNING id, email, role`,
      [
        "worker2@sprayflowers.kz",
        passwordHash,
        "Worker 2",
        "0987654321",
        "Almaty",
        "Spray Flowers",
        "worker",
      ],
    );

    console.log("✅ Второй сотрудник (worker) создан:");
    console.log(JSON.stringify(result.rows[0], null, 2));
    console.log("\nДанные для входа:");
    console.log("Email: worker2@sprayflowers.kz");
    console.log("Password: worker123");
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    process.exit(1);
  } finally {
    pool.end();
  }
})();
