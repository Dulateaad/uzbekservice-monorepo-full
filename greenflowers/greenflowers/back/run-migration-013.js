const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log(
      "Running migration: Update status constraint to include 'new'...",
    );

    await client.query(`
      ALTER TABLE orders 
      DROP CONSTRAINT IF EXISTS orders_status_check;
    `);

    await client.query(`
      ALTER TABLE orders 
      ADD CONSTRAINT orders_status_check 
      CHECK (status IN ('new', 'pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled'));
    `);

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
