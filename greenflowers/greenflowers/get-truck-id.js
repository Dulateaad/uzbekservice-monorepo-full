const pg = require("pg");
const { Pool } = pg;

require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    // Get first truck
    const result = await pool.query(
      "SELECT id, identifier FROM trucks LIMIT 1",
    );
    if (result.rows.length === 0) {
      console.log("No trucks found");
      return;
    }

    const truck = result.rows[0];
    console.log(`First truck: ${truck.identifier} (${truck.id})`);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

main();
