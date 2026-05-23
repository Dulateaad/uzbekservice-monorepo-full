const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "greenflowers_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Sula2206",
});

async function createTestDeliveredOrders() {
  const client = await pool.connect();
  try {
    // Get all trucks
    const trucks = await pool.query(`SELECT id, identifier FROM trucks`);
    console.log(`Found ${trucks.rows.length} trucks\n`);

    // Get workers
    const workers = await pool.query(
      `SELECT id FROM users WHERE role = 'worker' ORDER BY id LIMIT 2`,
    );
    const workerIds = workers.rows.map((w) => w.id);
    console.log(`Found ${workerIds.length} workers\n`);

    if (workerIds.length === 0) {
      console.log("No workers found");
      await client.release();
      await pool.end();
      return;
    }

    let createdCount = 0;

    for (const truck of trucks.rows) {
      // Check if truck already has delivered orders
      const check = await pool.query(
        `SELECT COUNT(*) as cnt FROM orders WHERE truck_id = $1 AND status = 'delivered'`,
        [truck.id],
      );

      if (check.rows[0].cnt > 0) {
        console.log(
          `${truck.identifier}: Already has ${check.rows[0].cnt} delivered orders`,
        );
        continue;
      }

      // Create 3 delivered orders for this truck
      const amounts = [10000, 15000, 12000];
      for (let i = 0; i < amounts.length; i++) {
        const workerId = workerIds[i % workerIds.length];

        const order = await pool.query(
          `INSERT INTO orders 
           (user_id, customer_name, customer_phone, total_amount, 
            delivery_city, delivery_address, status, truck_id, seller_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            1,
            `Customer ${truck.identifier} ${i}`,
            "555-0000",
            amounts[i],
            "Almaty",
            `Address ${truck.identifier} ${i}`,
            "delivered",
            truck.id,
            workerId,
          ],
        );

        const orderId = order.rows[0].id;

        // Create order item
        await pool.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, truck_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, 41, 10, amounts[i] / 10, truck.id],
        );

        // Create shift_sales
        const shift = await pool.query(
          `SELECT id FROM shifts WHERE user_id = $1 AND status = 'open' LIMIT 1`,
          [workerId],
        );

        let shiftId;
        if (shift.rows.length > 0) {
          shiftId = shift.rows[0].id;
        } else {
          const newShift = await pool.query(
            `INSERT INTO shifts (user_id, shift_date, started_at, status)
             VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'open')
             RETURNING id`,
            [workerId],
          );
          shiftId = newShift.rows[0].id;
        }

        await pool.query(
          `INSERT INTO shift_sales (shift_id, order_id, sale_amount)
           VALUES ($1, $2, $3)`,
          [shiftId, orderId, amounts[i]],
        );

        createdCount++;
        console.log(
          `${truck.identifier}: Created order ${orderId} (${amounts[i]} ₸)`,
        );
      }
    }

    console.log(`\nTotal orders created: ${createdCount}`);
    await client.release();
    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await client.release();
    await pool.end();
  }
}

createTestDeliveredOrders();
