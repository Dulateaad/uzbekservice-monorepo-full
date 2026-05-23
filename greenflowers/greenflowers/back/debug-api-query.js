const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
  user: "postgres",
  password: "Sula2206",
});

async function check() {
  try {
    // Check order statuses for each truck
    const statusCheck = await pool.query(`
      SELECT 
        t.identifier,
        COUNT(*) as total,
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN o.status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN o.status = 'in_transit' THEN 1 END) as in_transit,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending
      FROM orders o
      LEFT JOIN trucks t ON o.truck_id = t.id
      GROUP BY t.identifier
      ORDER BY t.identifier
    `);

    console.log("\n📋 Order Status by Truck:\n");
    console.table(statusCheck.rows);

    // Check cities
    const cityCheck = await pool.query(`
      SELECT 
        t.identifier,
        COUNT(DISTINCT o.delivery_city) as cities,
        STRING_AGG(DISTINCT o.delivery_city, ', ') as city_list
      FROM orders o
      LEFT JOIN trucks t ON o.truck_id = t.id
      GROUP BY t.identifier
      ORDER BY t.identifier
    `);

    console.log("\n🏙️ Cities by Truck:\n");
    console.table(cityCheck.rows);

    // Check order_items truck assignment
    const itemsCheck = await pool.query(`
      SELECT 
        t.identifier,
        COUNT(*) as total_items,
        COUNT(CASE WHEN oi.truck_id IS NOT NULL THEN 1 END) as items_with_truck_id
      FROM order_items oi
      LEFT JOIN trucks t ON oi.truck_id = t.id
      GROUP BY t.identifier
      ORDER BY t.identifier
    `);

    console.log("\n📦 Order Items Truck Assignment:\n");
    console.table(itemsCheck.rows);

    // Check what the API query would return
    const truckId = "6decfe72-b3c7-4535-84c4-d82909245e57"; // ыыы truck
    const apiResult = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT o.id) as matched_orders,
        COUNT(CASE WHEN o.status IN ('confirmed', 'in_transit', 'delivered', 'completed') THEN 1 END) as completed_orders
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE (o.truck_id = $1 OR oi.truck_id = $1)
        AND ('Almaty' = 'ALL' OR o.city = 'Almaty' OR o.delivery_city = 'Almaty')
        AND o.status IN ('confirmed', 'in_transit', 'delivered', 'completed')
        AND o.payment_status != 'refunded'
    `,
      [truckId],
    );

    console.log("\n🔍 API Query Test for 'ыыы' truck:\n");
    console.table(apiResult.rows);

    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
  }
}

check();
