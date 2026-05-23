#!/usr/bin/env node
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "greenflowers_user",
  password: process.env.DB_PASSWORD || "greenflowers_password",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "greenflowers_db",
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Running migration: Add address field to users table...");

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
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
