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
    console.log("🔄 Running migration: 009_add_unit_price_to_cart.sql\n");

    const sql = fs.readFileSync(
      path.join(__dirname, "migrations/009_add_unit_price_to_cart.sql"),
      "utf-8",
    );

    await pool.query(sql);
    console.log(
      "\n✅ Migration completed successfully: unit_price added to cart_items",
    );

    // Проверяем что колонка существует
    const result = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'cart_items' AND column_name = 'unit_price'`,
    );

    if (result.rows.length > 0) {
      console.log("✅ Column unit_price exists in cart_items");

      try {
        // Показываем статистику
        const stats = await pool.query(
          `SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN unit_price > 0 THEN 1 END) as items_with_price,
            COUNT(CASE WHEN unit_price IS NULL THEN 1 END) as items_with_null_price,
            AVG(unit_price) as avg_price,
            MIN(unit_price) as min_price,
            MAX(unit_price) as max_price
          FROM cart_items`,
        );

        console.log("\n📊 Cart Items Price Statistics:");
        console.log(`  Total items: ${stats.rows[0].total_items}`);
        console.log(`  Items with price: ${stats.rows[0].items_with_price}`);
        console.log(
          `  Items with NULL price: ${stats.rows[0].items_with_null_price}`,
        );
        if (stats.rows[0].avg_price) {
          console.log(
            `  Average price: ${Number(stats.rows[0].avg_price).toLocaleString(
              "ru-RU",
              { style: "currency", currency: "KZT" },
            )}`,
          );
        }
        console.log(
          `  Min price: ${Number(stats.rows[0].min_price || 0).toLocaleString(
            "ru-RU",
            { style: "currency", currency: "KZT" },
          )}`,
        );
        console.log(
          `  Max price: ${Number(stats.rows[0].max_price || 0).toLocaleString(
            "ru-RU",
            { style: "currency", currency: "KZT" },
          )}`,
        );

        // Показать примеры записей с пустой ценой (макс 5)
        const samplesNull = await pool.query(
          `SELECT id, user_id, product_id, quantity FROM cart_items WHERE unit_price IS NULL LIMIT 5`,
        );
        if (samplesNull.rows.length > 0) {
          console.log("\n🔎 Примеры записей с NULL unit_price (max 5):");
          samplesNull.rows.forEach((r) =>
            console.log(
              `  id=${r.id} user=${r.user_id} product=${r.product_id} qty=${r.quantity}`,
            ),
          );
        }

        // Показать примеры записей с положительной ценой (макс 5)
        const samplesWithPrice = await pool.query(
          `SELECT id, user_id, product_id, quantity, unit_price FROM cart_items WHERE unit_price > 0 LIMIT 5`,
        );
        if (samplesWithPrice.rows.length > 0) {
          console.log("\n🔎 Примеры записей с unit_price > 0 (max 5):");
          samplesWithPrice.rows.forEach((r) =>
            console.log(
              `  id=${r.id} user=${r.user_id} product=${r.product_id} qty=${r.quantity} price=${Number(r.unit_price).toLocaleString("ru-RU", { style: "currency", currency: "KZT" })}`,
            ),
          );
        }
      } catch (statsErr) {
        console.warn(
          "Не удалось собрать статистику по unit_price:",
          statsErr.message,
        );
      }
    } else {
      console.warn("⚠️ Column 'unit_price' not found in 'cart_items'");
    }

    console.log(
      "\n✅ Now cart items will preserve the price at the moment of adding to cart.",
    );
  } catch (error) {
    console.error("❌ Migration error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
