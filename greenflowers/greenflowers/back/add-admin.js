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
    const password = "admin123";
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone, city, company_name, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) 
       RETURNING id, email, role`,
      [
        "admin2@greenflowers.kz",
        passwordHash,
        "Admin 2",
        "1234567890",
        "Almaty",
        "Spray Flowers",
        "admin",
      ],
    );

    console.log("✅ Второй администратор создан:");
    console.log(JSON.stringify(result.rows[0], null, 2));
    console.log("\nДанные для входа:");
    console.log("Email: admin2@greenflowers.kz");
    console.log("Password: admin123");
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    process.exit(1);
  } finally {
    pool.end();
  }
})();
