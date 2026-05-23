const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function createShiftSalesForOrders() {
  try {
    // Get all workers
    const workers = await pool.query(
      `SELECT id FROM users WHERE role = 'worker' ORDER BY id`,
    );

    if (!workers.rows.length) {
      console.log("No workers found");
      await pool.end();
      return;
    }

    console.log(`Found ${workers.rows.length} workers`);
    const workerIds = workers.rows.map((w) => w.id);

    // Get all orders without seller_id and without shift_sales
    const orders = await pool.query(
      `SELECT DISTINCT o.id, o.total_amount, o.truck_id FROM orders o
       LEFT JOIN shift_sales ss ON o.id = ss.order_id
       WHERE o.seller_id IS NULL AND ss.id IS NULL AND o.truck_id IS NOT NULL
       LIMIT 20`,
    );

    console.log(`Found ${orders.rows.length} orders without shift_sales`);

    let shiftCount = 0;
    let salesCount = 0;

    for (const order of orders.rows) {
      // Pick a random worker
      const randomWorker =
        workerIds[Math.floor(Math.random() * workerIds.length)];

      // Check if worker has an open shift
      let shift = await pool.query(
        `SELECT id FROM shifts WHERE user_id = $1 AND status = 'open'`,
        [randomWorker],
      );

      let shiftId;
      if (shift.rows.length > 0) {
        shiftId = shift.rows[0].id;
      } else {
        // Create a new shift for the worker
        const newShift = await pool.query(
          `INSERT INTO shifts (user_id, shift_date, started_at, status)
           VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'open')
           RETURNING id`,
          [randomWorker],
        );
        shiftId = newShift.rows[0].id;
        shiftCount++;
      }

      // Create shift_sales for the order
      await pool.query(
        `INSERT INTO shift_sales (shift_id, order_id, sale_amount)
         VALUES ($1, $2, $3)`,
        [shiftId, order.id, order.total_amount],
      );
      salesCount++;

      console.log(
        `Order ${order.id}: Created shift_sales (worker ${randomWorker}, shift ${shiftId})`,
      );
    }

    console.log(`\nCreated ${shiftCount} new shifts`);
    console.log(`Created ${salesCount} shift_sales records`);

    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

createShiftSalesForOrders();
