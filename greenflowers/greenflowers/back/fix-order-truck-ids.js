const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function fixOrderTruckIds() {
  const client = await pool.connect();
  try {
    console.log("Исправляю truck_id для заказов...");

    // Находим заказы без truck_id, но с элементами, у которых есть truck_id
    const ordersToFix = await client.query(`
      SELECT DISTINCT o.id, oi.truck_id, o.city
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.truck_id IS NULL AND oi.truck_id IS NOT NULL
    `);

    console.log(`Найдено заказов для исправления: ${ordersToFix.rows.length}`);

    for (const order of ordersToFix.rows) {
      await client.query("UPDATE orders SET truck_id = $1 WHERE id = $2", [
        order.truck_id,
        order.id,
      ]);
      console.log(`Обновлен заказ ${order.id}: truck_id = ${order.truck_id}`);
    }

    // Проверяем результат
    const result = await client.query(`
      SELECT id, truck_id, seller_id, status, city
      FROM orders
      WHERE status = 'delivered'
      ORDER BY id DESC
      LIMIT 5
    `);

    console.log("\nРезультат:");
    result.rows.forEach((order) => {
      console.log(
        `ID: ${order.id}, Truck: ${order.truck_id}, Seller: ${order.seller_id}, City: ${order.city}`,
      );
    });
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixOrderTruckIds();
