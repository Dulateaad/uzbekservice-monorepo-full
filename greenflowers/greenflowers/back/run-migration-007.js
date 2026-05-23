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
    console.log("🔄 Running migration: 007_add_product_id_to_inventory.sql\n");

    const sql = fs.readFileSync(
      path.join(__dirname, "migrations/007_add_product_id_to_inventory.sql"),
      "utf-8",
    );

    await pool.query(sql);
    console.log(
      "\n✅ Migration completed successfully: product_id added to inventory_items",
    );

    // Проверяем что колонка существует
    const result = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'inventory_items' AND column_name = 'product_id'`,
    );

    if (result.rows.length > 0) {
      console.log("✅ Column product_id exists in inventory_items");

      // Показываем статистику
      const stats = await pool.query(
        `SELECT 
          COUNT(*) as total_inventory_items,
          COUNT(product_id) as items_with_product_id,
          COUNT(CASE WHEN product_id IS NULL THEN 1 END) as items_without_product_id
        FROM inventory_items`,
      );

      console.log("\n📊 Inventory Items Statistics:");
      console.log(`  Total items: ${stats.rows[0].total_inventory_items}`);
      console.log(
        `  Items linked to products: ${stats.rows[0].items_with_product_id}`,
      );
      console.log(
        `  Items without product_id: ${stats.rows[0].items_without_product_id}`,
      );
    } else {
      console.log("❌ Column product_id was not created in inventory_items");
    }

    await pool.end();
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
