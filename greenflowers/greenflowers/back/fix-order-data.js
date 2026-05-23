const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function fixOrderData() {
  const client = await pool.connect();
  try {
    console.log("Исправляю данные заказов...");

    // Получим worker пользователей
    const workersResult = await client.query(
      "SELECT id, name FROM users WHERE role = 'worker' ORDER BY id",
    );
    const workers = workersResult.rows;
    console.log("Работники:", workers);

    // Обновим orders на основе order_items
    // Для каждого заказа установим truck_id и seller_id
    const ordersToFix = await client.query(`
      SELECT DISTINCT o.id,
             oi.truck_id,
             o.city,
             o.delivery_city
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.truck_id IS NULL
        AND oi.truck_id IS NOT NULL
    `);

    console.log("Заказы для исправления:", ordersToFix.rows);

    // Назначим продавцов по очереди (чтобы распределить между работниками)
    let workerIndex = 0;

    for (const order of ordersToFix.rows) {
      const sellerId = workers[workerIndex % workers.length].id;
      workerIndex++;

      await client.query(
        "UPDATE orders SET truck_id = $1, seller_id = $2 WHERE id = $3",
        [order.truck_id, sellerId, order.id],
      );

      console.log(
        `Обновлен заказ ${order.id}: truck_id=${order.truck_id}, seller_id=${sellerId}`,
      );
    }

    // Проверим результат
    const fixedOrders = await client.query(`
      SELECT o.id, o.truck_id, o.seller_id, u.name as seller_name, o.status
      FROM orders o
      LEFT JOIN users u ON o.seller_id = u.id
      WHERE o.id IN (100, 101)
    `);

    console.log("Исправленные заказы:", fixedOrders.rows);
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixOrderData();
