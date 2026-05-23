const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setup() {
  try {
    console.log("🔄 Setting up inventory system with UUID...");

    // Drop existing table if exists
    console.log("  - Dropping old table if exists...");
    await pool.query(`
      DROP TABLE IF EXISTS inventory_items CASCADE;
      DROP FUNCTION IF EXISTS update_inventory_items_updated_at();
    `);

    // Create new table with UUID
    console.log("  - Creating inventory_items table...");
    await pool.query(`
      CREATE TABLE inventory_items (
        id SERIAL PRIMARY KEY,
        truck_id UUID REFERENCES trucks(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        variety VARCHAR(255),
        price DECIMAL(10, 2) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        photo_url TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    console.log("  - Creating indexes...");
    await pool.query(`
      CREATE INDEX idx_inventory_items_truck_id ON inventory_items(truck_id);
      CREATE INDEX idx_inventory_items_name ON inventory_items(name);
      CREATE INDEX idx_inventory_items_created_at ON inventory_items(created_at);
    `);

    // Create trigger function
    console.log("  - Creating trigger function...");
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_inventory_items_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_update_inventory_items_updated_at
      BEFORE UPDATE ON inventory_items
      FOR EACH ROW
      EXECUTE FUNCTION update_inventory_items_updated_at();
    `);

    console.log("✅ Setup completed successfully!");

    // Verify
    const result = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_name = 'inventory_items' ORDER BY ordinal_position`,
    );

    console.log("\n📋 Table inventory_items structure:");
    result.rows.forEach((col) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    await pool.end();
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

setup();
