const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function addMissingColumns() {
  try {
    console.log("Adding missing columns to trucks table...");

    // Add metrics column if it doesn't exist
    await pool.query(`
      ALTER TABLE trucks 
      ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '[]'::jsonb
    `);
    console.log("✅ Added metrics column");

    // Add created_by_name column if it doesn't exist
    await pool.query(`
      ALTER TABLE trucks 
      ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255)
    `);
    console.log("✅ Added created_by_name column");

    // Verify columns
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trucks'
      ORDER BY ordinal_position
    `);

    console.log("\nUpdated trucks table schema:");
    result.rows.forEach((row) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

addMissingColumns();
