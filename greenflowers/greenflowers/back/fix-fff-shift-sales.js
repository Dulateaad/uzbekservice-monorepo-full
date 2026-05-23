const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "greenflowers_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Sula2206",
});

async function fixFffTruck() {
  try {
    // Get ффф truck ID
    const truckResult = await pool.query(
      `SELECT id FROM trucks WHERE identifier = 'ффф'`,
    );
    const truckId = truckResult.rows[0].id;
    console.log("Truck ID for ффф:", truckId);

    // Get workers
    const workers = await pool.query(
      `SELECT id FROM users WHERE role IN ('worker', 'admin') ORDER BY id LIMIT 2`,
    );
    const workerIds = workers.rows.map((w) => w.id);
    console.log("Available workers:", workerIds);

    // Get orders for ффф truck that don't have shift_sales
    const ordersWithoutSales = await pool.query(
      `
      SELECT o.id, o.total_amount
      FROM orders o
      WHERE (o.truck_id = $1 OR EXISTS(
        SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.truck_id = $1
      ))
        AND o.delivery_city = 'Almaty'
        AND o.status IN ('confirmed', 'in_transit', 'delivered')
        AND o.payment_status != 'refunded'
        AND NOT EXISTS (
          SELECT 1 FROM shift_sales ss WHERE ss.order_id = o.id
        )
    `,
      [truckId],
    );

    console.log(
      `Found ${ordersWithoutSales.rows.length} orders without shift_sales`,
    );

    let created = 0;
    for (let i = 0; i < ordersWithoutSales.rows.length; i++) {
      const order = ordersWithoutSales.rows[i];
      const workerId = workerIds[i % workerIds.length];

      // Create shift if needed
      let shiftResult = await pool.query(
        `SELECT id FROM shifts WHERE user_id = $1 AND status = 'open' LIMIT 1`,
        [workerId],
      );

      let shiftId;
      if (shiftResult.rows.length === 0) {
        const newShift = await pool.query(
          `INSERT INTO shifts (user_id, shift_date, started_at, status)
           VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'open')
           RETURNING id`,
          [workerId],
        );
        shiftId = newShift.rows[0].id;
      } else {
        shiftId = shiftResult.rows[0].id;
      }

      // Create shift_sales
      await pool.query(
        `INSERT INTO shift_sales (shift_id, order_id, sale_amount)
         VALUES ($1, $2, $3)`,
        [shiftId, order.id, order.total_amount],
      );

      console.log(
        `Created shift_sales for order ${order.id} (${order.total_amount} ₸) -> worker ${workerId}`,
      );
      created++;
    }

    console.log(`\n✅ Created ${created} shift_sales records for ффф truck`);

    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
  }
}

fixFffTruck();
