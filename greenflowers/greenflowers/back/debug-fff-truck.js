const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
  user: "postgres",
  password: "Sula2206",
});

async function checkTruckData() {
  try {
    // Check orders for ффф truck
    const truckResult = await pool.query(
      `SELECT id FROM trucks WHERE identifier = 'ффф'`,
    );
    const truckId = truckResult.rows[0].id;

    console.log("Truck ID for ффф:", truckId);

    // Check orders
    const orders = await pool.query(
      `
      SELECT
        o.id,
        o.total_amount,
        o.status,
        o.seller_id,
        ss.sale_amount,
        ss.id as ss_id,
        u.name as worker_name,
        u.id as worker_id
      FROM orders o
      LEFT JOIN shift_sales ss ON o.id = ss.order_id
      LEFT JOIN shifts s ON ss.shift_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE (o.truck_id = $1 OR EXISTS(
        SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.truck_id = $1
      ))
        AND o.delivery_city = 'Almaty'
        AND o.status IN ('confirmed', 'in_transit', 'delivered')
        AND o.payment_status != 'refunded'
      ORDER BY o.id
    `,
      [truckId],
    );

    console.log("\nOrders for ффф truck:");
    console.table(orders.rows);

    // Check shift_sales directly
    const shiftSales = await pool.query(
      `
      SELECT
        ss.id,
        ss.order_id,
        ss.sale_amount,
        s.user_id,
        u.name as worker_name,
        o.truck_id,
        o.total_amount
      FROM shift_sales ss
      LEFT JOIN shifts s ON ss.shift_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN orders o ON ss.order_id = o.id
      WHERE o.truck_id = $1 OR EXISTS(
        SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.truck_id = $1
      )
    `,
      [truckId],
    );

    console.log("\nShift sales for ффф truck:");
    console.table(shiftSales.rows);

    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

checkTruckData();
