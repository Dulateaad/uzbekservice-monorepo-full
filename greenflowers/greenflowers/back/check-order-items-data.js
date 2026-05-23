const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function checkOrderItemsData() {
  const client = await pool.connect();
  try {
    console.log("Проверяю данные order_items...");

    // Проверим элементы заказов
    const orderItemsResult = await client.query(`
      SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.unit_price, oi.truck_id,
             p.name as product_name, p.category
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id IN (100, 101)
      ORDER BY oi.id
    `);
    console.log("Элементы заказов:");
    console.log(orderItemsResult.rows);

    // Проверим, есть ли truck_id в order_items
    const truckIdsResult = await client.query(`
      SELECT DISTINCT oi.truck_id, t.identifier, t.status
      FROM order_items oi
      LEFT JOIN trucks t ON oi.truck_id = t.id
      WHERE oi.truck_id IS NOT NULL
    `);
    console.log("\nУникальные truck_id в order_items:");
    console.log(truckIdsResult.rows);
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkOrderItemsData();
