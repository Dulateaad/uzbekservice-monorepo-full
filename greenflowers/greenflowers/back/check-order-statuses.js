const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkOrderStatuses() {
  try {
    const result = await pool.query(`
      SELECT 
        t.identifier as truck_name,
        o.status,
        COUNT(*) as count,
        SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END) as delivered_total
      FROM orders o
      JOIN trucks t ON o.truck_id = t.id
      WHERE o.truck_id IS NOT NULL
      GROUP BY t.identifier, o.status
      ORDER BY t.identifier, o.status
    `);

    console.log("\nOrder statuses by truck:");
    result.rows.forEach((row) => {
      console.log(
        `  ${row.truck_name}: status=${row.status}, count=${row.count}, delivered_total=${row.delivered_total}`,
      );
    });

    // Also check for orders without truck_id
    const noTruck = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE truck_id IS NULL`,
    );
    console.log(`\nOrders without truck_id: ${noTruck.rows[0].count}`);

    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

checkOrderStatuses();
