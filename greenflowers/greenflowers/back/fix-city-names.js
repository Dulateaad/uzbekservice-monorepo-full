const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
  user: "postgres",
  password: "Sula2206",
});

async function fixCities() {
  try {
    console.log("🔄 Normalizing cities to English...\n");

    // Fix delivery_city
    const result1 = await pool.query(`
      UPDATE orders 
      SET delivery_city = 'Almaty'
      WHERE delivery_city IN ('Алматы', 'almaty')
    `);

    console.log(`✅ Updated ${result1.rowCount} orders with delivery_city`);

    // Fix city field
    const result2 = await pool.query(`
      UPDATE orders 
      SET city = 'Almaty'
      WHERE city IN ('Алматы', 'almaty')
    `);

    console.log(`✅ Updated ${result2.rowCount} orders with city`);

    // Verify
    const verify = await pool.query(`
      SELECT delivery_city, COUNT(*) as count 
      FROM orders 
      GROUP BY delivery_city
      ORDER BY delivery_city
    `);

    console.log("\n📊 Cities after fix:\n");
    console.table(verify.rows);

    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
  }
}

fixCities();
