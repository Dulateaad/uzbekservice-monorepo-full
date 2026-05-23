/**
 * Migration: Create user_permissions table
 * Stores individual permission overrides for users
 */

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function createPermissionsTable() {
  const client = await pool.connect();

  try {
    // Check if table exists
    const tableCheck = await client.query(
      `SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_permissions'
      )`,
    );

    if (tableCheck.rows[0].exists) {
      console.log("✅ Table user_permissions already exists");
      return;
    }

    // Create table
    await client.query(`
      CREATE TABLE user_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        create_product BOOLEAN DEFAULT true,
        create_batch BOOLEAN DEFAULT true,
        edit_truck BOOLEAN DEFAULT true,
        edit_position BOOLEAN DEFAULT true,
        can_view_analytics BOOLEAN DEFAULT true,
        can_manage_users BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log("✅ Created user_permissions table");

    // Create index on user_id for faster lookups
    await client.query(
      `CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id)`,
    );

    console.log("✅ Created index on user_id");
  } catch (error) {
    console.error("❌ Error creating table:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createPermissionsTable();
