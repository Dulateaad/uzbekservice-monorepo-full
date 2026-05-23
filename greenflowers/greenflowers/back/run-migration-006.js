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
    console.log(
      "🔄 Running migration: 006_add_category_height_to_inventory.sql",
    );

    const sql = fs.readFileSync(
      path.join(
        __dirname,
        "migrations/006_add_category_height_to_inventory.sql",
      ),
      "utf-8",
    );

    await pool.query(sql);
    console.log("✅ Migration completed successfully");

    // Проверяем что столбцы добавлены
    const columns = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'inventory_items' AND column_name IN ('category', 'height')
       ORDER BY ordinal_position`,
    );

    if (columns.rows.length >= 2) {
      console.log("✅ Category and height columns exist in inventory_items");
      console.log("\n📋 New columns:");
      columns.rows.forEach((col) => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log("⚠️  Some columns may not have been created");
    }

    // Проверяем что таблица категорий создана
    const categoriesTableExists = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'flower_categories'
      )`,
    );

    if (categoriesTableExists.rows[0].exists) {
      console.log("✅ Table flower_categories exists");

      const categoriesColumns = await pool.query(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = 'flower_categories'
         ORDER BY ordinal_position`,
      );

      console.log("\n📋 flower_categories structure:");
      categoriesColumns.rows.forEach((col) => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log("❌ Table flower_categories does not exist");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
