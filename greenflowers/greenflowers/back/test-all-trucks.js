const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testAllTrucks() {
  try {
    // Get all trucks
    const trucks = await pool.query(`SELECT id, identifier FROM trucks`);
    console.log(`Found ${trucks.rows.length} trucks\n`);

    for (const truck of trucks.rows) {
      console.log(`\n=== Truck: ${truck.identifier} (ID: ${truck.id}) ===`);

      // Check orders for this truck
      const orders = await pool.query(
        `SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders 
         WHERE truck_id = $1 OR EXISTS (
           SELECT 1 FROM order_items oi WHERE oi.order_id = orders.id AND oi.truck_id = $1
         )`,
        [truck.id],
      );

      console.log(
        `  Orders: ${orders.rows[0].count}, Total: ${orders.rows[0].total}`,
      );

      // Check shift_sales
      const shiftSales = await pool.query(
        `SELECT COUNT(*) as count FROM shift_sales ss
         JOIN orders o ON ss.order_id = o.id
         WHERE o.truck_id = $1 OR EXISTS (
           SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.truck_id = $1
         )`,
        [truck.id],
      );

      console.log(`  Shift sales: ${shiftSales.rows[0].count}`);

      // Check workers
      const workers = await pool.query(
        `SELECT DISTINCT
          COALESCE(u_seller.id, u_shift.id) as worker_id,
          COALESCE(u_seller.name, u_shift.name) as worker_name,
          COUNT(DISTINCT o.id) as order_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN shift_sales ss ON o.id = ss.order_id
        LEFT JOIN shifts s ON ss.shift_id = s.id
        LEFT JOIN users u_shift ON s.user_id = u_shift.id
        LEFT JOIN users u_seller ON o.seller_id = u_seller.id
        WHERE (o.truck_id = $1 OR oi.truck_id = $1)
          AND (o.seller_id IS NOT NULL OR s.user_id IS NOT NULL)
        GROUP BY worker_id, worker_name
        ORDER BY worker_id`,
        [truck.id],
      );

      console.log(`  Workers: ${workers.rows.length}`);
      workers.rows.forEach((w) => {
        console.log(`    - ${w.worker_name}: ${w.order_count} orders`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

testAllTrucks();
