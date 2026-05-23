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
    console.log("📋 Running migration 010: Create managers table...\n");

    const migrationPath = path.join(
      __dirname,
      "migrations",
      "010_create_managers_table.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    await pool.query(sql);

    console.log("✅ Migration 010 applied successfully!\n");
    console.log("📊 Managers table created with sample data:");

    const result = await pool.query("SELECT id, name, email FROM managers");
    console.table(result.rows);
  } catch (error) {
    console.error("❌ Migration error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
