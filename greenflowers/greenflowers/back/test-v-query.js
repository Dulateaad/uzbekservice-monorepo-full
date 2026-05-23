const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
  user: "postgres",
  password: "Sula2206",
});

async function testVQuery() {
  try {
    // Get truck ID
    const truckResult = await pool.query(
      `SELECT id FROM trucks WHERE identifier = 'ыыы'`,
    );
    const truckId = truckResult.rows[0].id;

    // Test V query (delivered sales from shift_sales)
    const Vquery = `
      SELECT 
        COALESCE(SUM(ss.sale_amount), 0) as total_sales
      FROM orders o
      LEFT JOIN shift_sales ss ON o.id = ss.order_id
      WHERE (o.truck_id = $1 OR EXISTS(
        SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.truck_id = $1
      ))
        AND ('Almaty' = 'ALL' OR o.city = 'Almaty' OR o.delivery_city = 'Almaty')
        AND o.status IN ('confirmed', 'in_transit', 'delivered', 'completed')
        AND o.payment_status != 'refunded'
        AND ss.id IS NOT NULL
    `;

    const VResult = await pool.query(Vquery, [truckId]);
    console.log("✅ V (delivered sales):", VResult.rows[0].total_sales);

    // Also check orders with shift_sales
    const checkOrders = await pool.query(
      `
      SELECT 
        o.id,
        o.status,
        o.total_amount,
        ss.sale_amount,
        ss.id as ss_id
      FROM orders o
      LEFT JOIN shift_sales ss ON o.id = ss.order_id
      WHERE o.truck_id = $1 
        AND ('Almaty' = 'ALL' OR o.delivery_city = 'Almaty')
        AND o.status IN ('confirmed', 'in_transit', 'delivered', 'completed')
        AND ss.id IS NOT NULL
      LIMIT 5
    `,
      [truckId],
    );

    console.log("\n📊 Sample orders with shift_sales:");
    console.table(checkOrders.rows);

    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
  }
}

testVQuery();
