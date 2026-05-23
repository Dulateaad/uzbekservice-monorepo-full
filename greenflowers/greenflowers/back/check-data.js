const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkData() {
  try {
    // Get shifts count
    const shiftsCount = await pool.query(
      `SELECT COUNT(*) as count FROM shifts`,
    );
    console.log(`Total shifts: ${shiftsCount.rows[0].count}`);

    // Get shift_sales count
    const shiftSalesCount = await pool.query(
      `SELECT COUNT(*) as count FROM shift_sales`,
    );
    console.log(`Total shift_sales: ${shiftSalesCount.rows[0].count}`);

    // Get orders count
    const ordersCount = await pool.query(
      `SELECT COUNT(*) as count FROM orders`,
    );
    console.log(`Total orders: ${ordersCount.rows[0].count}`);

    // Get users with role worker
    const workers = await pool.query(
      `SELECT id, name FROM users WHERE role = 'worker'`,
    );
    console.log(`\nTotal workers: ${workers.rows.length}`);
    workers.rows.forEach((w) => {
      console.log(`  - ${w.name} (ID: ${w.id})`);
    });

    // Get trucks
    const trucks = await pool.query(
      `SELECT id, identifier FROM trucks LIMIT 5`,
    );
    console.log(`\nTrucks (showing first 5):`);
    trucks.rows.forEach((t) => {
      console.log(`  - ${t.identifier} (ID: ${t.id})`);
    });

    // Check first truck and its orders
    if (trucks.rows.length > 0) {
      const truck = trucks.rows[0];
      const ordersForTruck = await pool.query(
        `SELECT id, user_id, seller_id, truck_id, status FROM orders WHERE truck_id = $1 LIMIT 3`,
        [truck.id],
      );
      console.log(`\nFirst 3 orders for truck ${truck.identifier}:`);
      ordersForTruck.rows.forEach((o) => {
        console.log(
          `  - Order ${o.id}: user_id=${o.user_id}, seller_id=${o.seller_id}, status=${o.status}`,
        );
      });

      // Check if these orders have shift_sales
      if (ordersForTruck.rows.length > 0) {
        const orderId = ordersForTruck.rows[0].id;
        const shiftSales = await pool.query(
          `SELECT * FROM shift_sales WHERE order_id = $1`,
          [orderId],
        );
        console.log(
          `\nShift sales for order ${orderId}: ${shiftSales.rows.length}`,
        );
        shiftSales.rows.forEach((ss) => {
          console.log(
            `  - shift_id=${ss.shift_id}, sale_amount=${ss.sale_amount}`,
          );
        });
      }
    }

    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

checkData();
