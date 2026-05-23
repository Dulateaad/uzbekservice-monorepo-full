const { Pool } = require("pg");
const CommissionCalculator = require("./services/commission-calculator");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
  user: "postgres",
  password: "Sula2206",
});

async function test() {
  try {
    console.log("🔧 Testing commission-calculator...");

    // Get truck ID
    const truckResult = await pool.query(
      `SELECT id FROM trucks WHERE identifier = 'ыыы'`,
    );
    const truckId = truckResult.rows[0].id;
    console.log("Truck ID:", truckId);

    const calculator = new CommissionCalculator(pool);
    const result = await calculator.calculateTruckCityCommission(
      truckId,
      "Almaty",
    );

    console.log("\n✅ Calculator Result:");
    console.log("A:", result.analytics?.A || "N/A");
    console.log("V:", result.analytics?.V || "N/A");
    console.log("E:", result.analytics?.E || "N/A");
    console.log("Workers count:", result.workers?.length || 0);

    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
  }
}

test();
