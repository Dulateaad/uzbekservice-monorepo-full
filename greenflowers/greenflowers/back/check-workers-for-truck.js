const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkWorkers() {
  try {
    // Get all trucks
    const trucks = await pool.query(`SELECT * FROM trucks LIMIT 5`);
    console.log(`Found ${trucks.rows.length} trucks`);

    if (trucks.rows.length === 0) {
      console.log("No trucks in database");
      await pool.end();
      return;
    }

    const truckId = trucks.rows[0].id;
    console.log(`\nUsing truck ID: ${truckId}`);

    // Get all orders for this truck
    const orders = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE truck_id = $1 OR EXISTS (
        SELECT 1 FROM order_items oi WHERE oi.order_id = orders.id AND oi.truck_id = $1
      )`,
      [truckId],
    );
    console.log(`Orders for this truck: ${orders.rows[0].count}`);

    // Get workers from shift_sales
    const workers = await pool.query(
      `
      SELECT DISTINCT
        u.id as worker_id,
        u.name as worker_name,
        COUNT(DISTINCT o.id) as order_count
      FROM shifts s
      JOIN shift_sales ss ON s.id = ss.shift_id
      JOIN orders o ON ss.order_id = o.id
      JOIN users u ON s.user_id = u.id
      WHERE (o.truck_id = $1 OR EXISTS (
        SELECT 1 FROM order_items oi 
        WHERE oi.order_id = o.id AND oi.truck_id = $1
      ))
      GROUP BY u.id, u.name
      ORDER BY u.id
      `,
      [truckId],
    );

    console.log(`\nWorkers for this truck: ${workers.rows.length}`);
    workers.rows.forEach((w) => {
      console.log(
        `  - ${w.worker_name} (ID: ${w.worker_id}) - ${w.order_count} orders`,
      );
    });

    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

checkWorkers();
