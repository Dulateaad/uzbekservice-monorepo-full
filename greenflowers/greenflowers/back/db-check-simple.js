const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
  user: "postgres",
  password: "Sula2206",
});

async function checkOrders() {
  try {
    // Check orders by truck
    const orders = await pool.query(`
      SELECT 
        t.identifier,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as delivered_orders,
        SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END) as delivered_sum
      FROM orders o
      LEFT JOIN trucks t ON o.truck_id = t.id
      GROUP BY t.identifier
      ORDER BY t.identifier
    `);

    console.log("\n📊 Orders by Truck:\n");
    console.table(orders.rows);

    // Check inventory
    const inventory = await pool.query(`
      SELECT 
        t.identifier,
        COUNT(*) as items,
        SUM(i.quantity) as total_qty
      FROM inventory_items i
      LEFT JOIN trucks t ON i.truck_id = t.id
      GROUP BY t.identifier
      ORDER BY t.identifier
    `);

    console.log("\n📦 Inventory by Truck:\n");
    console.table(inventory.rows);

    // Check shift_sales
    const shifts = await pool.query(`
      SELECT 
        t.identifier,
        COUNT(DISTINCT ss.id) as shift_sales_count,
        SUM(ss.sale_amount) as total_sales
      FROM shift_sales ss
      LEFT JOIN orders o ON ss.order_id = o.id
      LEFT JOIN trucks t ON o.truck_id = t.id
      GROUP BY t.identifier
      ORDER BY t.identifier
    `);

    console.log("\n🔗 Shift Sales by Truck:\n");
    console.table(shifts.rows);

    await pool.end();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
  }
}

checkOrders();
