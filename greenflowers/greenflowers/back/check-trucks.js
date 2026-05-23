const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkTruckStructure() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trucks'
      ORDER BY ordinal_position
    `);

    console.log("🔍 Trucks table structure:");
    result.rows.forEach((col) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Get one sample truck
    const trucks = await pool.query(
      `SELECT id, identifier FROM trucks LIMIT 1`,
    );
    if (trucks.rows.length > 0) {
      console.log("\n📦 Sample truck:");
      console.log(`  ID type: ${typeof trucks.rows[0].id}`);
      console.log(`  ID value: ${trucks.rows[0].id}`);
      console.log(`  identifier: ${trucks.rows[0].identifier}`);
    }

    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
  }
}

checkTruckStructure();
