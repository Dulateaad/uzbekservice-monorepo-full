const { Pool } = require("pg");
const CommissionCalculator = require("./back/services/commission-calculator");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
  user: "postgres",
  password: "Sula2206",
});

async function testCalculator() {
  try {
    // Get truck ID for 'ыыы'
    const truckResult = await pool.query(
      `SELECT id FROM trucks WHERE identifier = 'ыыы'`,
    );
    const truckId = truckResult.rows[0].id;

    console.log("🔧 Testing commission-calculator directly...");
    console.log("Truck ID:", truckId);

    const calculator = new CommissionCalculator(pool);
    const result = await calculator.calculateTruckCityCommission(
      truckId,
      "Almaty",
    );

    console.log("\n📊 Result from calculator:");
    console.log("A:", result.analytics.A);
    console.log("V:", result.analytics.V);
    console.log("E:", result.analytics.E);
    console.log("Workers:", result.workers.length);

    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    await pool.end();
  }
}

testCalculator();
