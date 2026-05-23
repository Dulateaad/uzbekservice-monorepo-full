#!/usr/bin/env node

/**
 * Apply migration: 003_add_truck_city_to_orders.sql
 * Добавляет truck_id и city_id в таблицу orders
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "greenflowers_db",
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("\n📋 Running migration: 003_add_truck_city_to_orders.sql\n");

    // Read migration file
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "003_add_truck_city_to_orders.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Execute migration
    await client.query(migrationSQL);

    console.log("✅ Migration completed successfully!");
    console.log("✓ Added truck_id column to orders");
    console.log("✓ Added city column to orders");
    console.log("✓ Created indexes for truck_id and city");
    console.log("✓ Created triggers for auto-sync city from delivery_city\n");

    // Verify columns were added
    const columnsResult = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'orders' AND column_name IN ('truck_id', 'city')`,
    );

    if (columnsResult.rows.length === 2) {
      console.log("✓ Verification passed: Both columns exist\n");
    } else {
      console.log(
        "⚠️ Warning: Expected 2 columns, found " + columnsResult.rows.length,
      );
    }
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
    await pool.end();
  }
}

runMigration();
