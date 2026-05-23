#!/usr/bin/env node
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Sula2206",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "greenflowers_db",
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Running migration: Add assigned_to to orders table...");

    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);
    `);

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
