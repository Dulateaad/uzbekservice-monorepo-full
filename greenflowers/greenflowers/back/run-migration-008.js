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
    console.log("🔄 Running migration: 008_add_truck_id_to_cart.sql\n");

    const sql = fs.readFileSync(
      path.join(__dirname, "migrations/008_add_truck_id_to_cart.sql"),
      "utf-8",
    );

    await pool.query(sql);
    console.log(
      "\n✅ Migration completed successfully: truck_id added to cart_items",
    );

    // Проверяем что колонка существует
    const result = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'cart_items' AND column_name IN ('truck_id', 'batch_date')`,
    );

    console.log("\n📊 New columns in cart_items:");
    result.rows.forEach((row) => {
      console.log(`  ✅ ${row.column_name} (${row.data_type})`);
    });

    // Проверяем UNIQUE constraint
    const constraints = await pool.query(
      `SELECT constraint_name, constraint_type
       FROM information_schema.table_constraints
       WHERE table_name = 'cart_items'`,
    );

    console.log("\n📋 Constraints on cart_items:");
    constraints.rows.forEach((row) => {
      console.log(`  • ${row.constraint_name} (${row.constraint_type})`);
    });

    console.log(
      "\n✅ All changes applied. Now same product from different trucks will be separate cart items.",
    );
  } catch (error) {
    console.error("❌ Migration error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
