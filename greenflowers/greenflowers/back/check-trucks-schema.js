const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "Sula2206",
  database: "greenflowers_db",
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'trucks'
      ORDER BY ordinal_position
    `);

    console.log("\n📋 Trucks table schema:");
    result.rows.forEach((r) => {
      console.log(
        `  • ${r.column_name}: ${r.data_type} ${r.is_nullable === "YES" ? "(nullable)" : "(not null)"}`,
      );
    });

    const sampleTruck = await pool.query("SELECT * FROM trucks LIMIT 1");
    if (sampleTruck.rows.length > 0) {
      console.log("\n📦 Sample truck record:");
      console.log(JSON.stringify(sampleTruck.rows[0], null, 2));
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
