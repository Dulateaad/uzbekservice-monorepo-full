const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  try {
    console.log("🔄 Running migration: 005_create_inventory_items.sql");

    const sql = fs.readFileSync(
      path.join(__dirname, "migrations/005_create_inventory_items.sql"),
      "utf-8",
    );

    await pool.query(sql);
    console.log("✅ Migration completed successfully");

    // Проверяем что таблица создана
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'inventory_items'
      )`,
    );

    if (result.rows[0].exists) {
      console.log("✅ Table inventory_items exists");

      // Показываем структуру таблицы
      const columns = await pool.query(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = 'inventory_items'
         ORDER BY ordinal_position`,
      );

      console.log("\n📋 Table structure:");
      columns.rows.forEach((col) => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log("❌ Table inventory_items does not exist");
    }

    await pool.end();
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
