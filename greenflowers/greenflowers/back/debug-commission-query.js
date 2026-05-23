const { Pool } = require("pg");

console.log("🔧 Starting debug...");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
  user: "postgres",
  password: "Sula2206",
});

console.log("📡 Connected to pool");

async function debugQuery() {
  try {
    // Get the ыыы truck ID
    const truckResult = await pool.query(
      `SELECT id, identifier FROM trucks WHERE identifier = 'ыыы'`,
    );
    const truck = truckResult.rows[0];
    console.log("Truck ID:", truck.id);
    console.log("Truck identifier:", truck.identifier);

    // Test the exact query that commission-calculator should run
    const testQuery = `
      SELECT DISTINCT
        o.id,
        o.total_amount,
        o.status,
        o.delivery_city,
        oi.truck_id as item_truck_id,
        oi.unit_price,
        oi.quantity
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE (o.truck_id = $1 OR oi.truck_id = $1)
        AND ('Almaty' = 'ALL' OR o.city = 'Almaty' OR o.delivery_city = 'Almaty')
        AND o.status IN ('confirmed', 'in_transit', 'delivered', 'completed')
        AND o.payment_status != 'refunded'
      LIMIT 10
    `;

    const result = await pool.query(testQuery, [truck.id]);
    console.log("\n✅ Found", result.rows.length, "matching orders");
    if (result.rows.length > 0) {
      console.table(result.rows.slice(0, 3));
    }

    // Now test the A calculation
    const AQuery = `
      SELECT COALESCE(SUM(
        oi.quantity *
        CASE
          WHEN p.price_per_unit IS NOT NULL
               AND oi.unit_price IS NOT NULL
               AND oi.unit_price / NULLIF(p.price_per_unit,0) = 50
          THEN oi.unit_price / 50
          ELSE oi.unit_price
        END
      ), 0) as total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE (o.truck_id = $1 OR oi.truck_id = $1)
        AND ('Almaty' = 'ALL' OR o.city = 'Almaty' OR o.delivery_city = 'Almaty')
        AND o.status IN ('confirmed', 'in_transit', 'delivered', 'completed')
        AND o.payment_status != 'refunded'
    `;

    const AResult = await pool.query(AQuery, [truck.id]);
    console.log("\n📊 A (all goods total):", AResult.rows[0].total);

    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
  }
}

debugQuery();
