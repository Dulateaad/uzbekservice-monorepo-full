const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function clearTrucks() {
  try {
    console.log("🧹 Clearing trucks table...");
    const result = await pool.query("DELETE FROM trucks");
    console.log(`✅ Deleted ${result.rowCount} trucks`);

    console.log("\n📊 Table stats:");
    const stats = await pool.query("SELECT COUNT(*) as count FROM trucks");
    console.log(`Total trucks: ${stats.rows[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

clearTrucks();
