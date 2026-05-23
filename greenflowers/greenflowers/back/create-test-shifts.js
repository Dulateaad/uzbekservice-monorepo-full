const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function createTestData() {
  try {
    // Get first worker and truck
    const worker = await pool.query(
      `SELECT id FROM users WHERE role = 'worker' LIMIT 1`,
    );
    const truck = await pool.query(`SELECT id FROM trucks LIMIT 1`);
    const order = await pool.query(
      `SELECT id FROM orders WHERE truck_id IS NOT NULL LIMIT 1`,
    );

    if (!worker.rows.length || !truck.rows.length || !order.rows.length) {
      console.log("Missing test data");
      await pool.end();
      return;
    }

    const workerId = worker.rows[0].id;
    const truckId = truck.rows[0].id;
    const orderId = order.rows[0].id;

    console.log(`Worker ID: ${workerId}`);
    console.log(`Truck ID: ${truckId}`);
    console.log(`Order ID: ${orderId}`);

    // Create a shift for the worker
    const shift = await pool.query(
      `INSERT INTO shifts (user_id, shift_date, started_at, status) 
       VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'open')
       RETURNING id`,
      [workerId],
    );

    const shiftId = shift.rows[0].id;
    console.log(`\nCreated shift ID: ${shiftId}`);

    // Create shift_sales for the order
    const shiftSales = await pool.query(
      `INSERT INTO shift_sales (shift_id, order_id, sale_amount)
       VALUES ($1, $2, 1000)
       RETURNING id`,
      [shiftId, orderId],
    );

    console.log(`Created shift_sales ID: ${shiftSales.rows[0].id}`);

    // Now check again
    const workers = await pool.query(
      `
      SELECT DISTINCT
        COALESCE(u_seller.id, u_shift.id) as worker_id,
        COALESCE(u_seller.name, u_shift.name) as worker_name,
        COUNT(DISTINCT o.id) as order_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN shift_sales ss ON o.id = ss.order_id
      LEFT JOIN shifts s ON ss.shift_id = s.id
      LEFT JOIN users u_shift ON s.user_id = u_shift.id
      LEFT JOIN users u_seller ON o.seller_id = u_seller.id
      WHERE o.truck_id = $1 AND (o.seller_id IS NOT NULL OR s.user_id IS NOT NULL)
      GROUP BY worker_id, worker_name
      ORDER BY worker_id
      `,
      [truckId],
    );

    console.log(
      `\nWorkers for truck after creating shift_sales: ${workers.rows.length}`,
    );
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

createTestData();
