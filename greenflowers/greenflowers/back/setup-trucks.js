const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setupTrucksTable() {
  try {
    console.log("Setting up trucks table...");

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS trucks (
        id SERIAL PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL UNIQUE,
        arrival_date TIMESTAMP NOT NULL,
        status VARCHAR(20) CHECK (status IN ('pending', 'in_transit', 'delivered', 'delayed')) DEFAULT 'pending',
        notes TEXT,
        metrics JSONB DEFAULT '[]'::jsonb,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_trucks_status ON trucks(status);
      CREATE INDEX IF NOT EXISTS idx_trucks_arrival_date ON trucks(arrival_date);
      CREATE INDEX IF NOT EXISTS idx_trucks_identifier ON trucks(identifier);
      CREATE INDEX IF NOT EXISTS idx_trucks_created_at ON trucks(created_at);
    `;

    await pool.query(createTableSQL);
    console.log("✅ Trucks table created successfully!");

    // Verify the table was created
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'trucks'
    `);

    if (result.rows.length > 0) {
      console.log("✅ Trucks table verified!");
    }
  } catch (error) {
    console.error("❌ Error setting up trucks table:", error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

setupTrucksTable();
