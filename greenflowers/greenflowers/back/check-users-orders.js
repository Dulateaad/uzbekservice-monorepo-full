const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function checkUsersAndOrders() {
  const client = await pool.connect();
  try {
    console.log("Проверяю пользователей и заказы...");

    // Проверим пользователей
    const usersResult = await client.query(
      "SELECT id, name, role FROM users LIMIT 10",
    );
    console.log("Пользователи:");
    console.log(usersResult.rows);

    // Проверим заказы с деталями
    const ordersResult = await client.query(`
      SELECT o.id, o.truck_id, o.seller_id, o.status, o.city, o.delivery_city,
             u.name as seller_name, t.identifier as truck_identifier
      FROM orders o
      LEFT JOIN users u ON o.seller_id = u.id
      LEFT JOIN trucks t ON o.truck_id = t.id
      ORDER BY o.id DESC
      LIMIT 10
    `);
    console.log("\nЗаказы с деталями:");
    console.log(ordersResult.rows);

    // Проверим элементы заказов
    const orderItemsResult = await client.query(`
      SELECT oi.order_id, oi.product_id, oi.quantity, oi.price,
             p.name as product_name, p.category
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id IN (100, 101)
      LIMIT 20
    `);
    console.log("\nЭлементы заказов:");
    console.log(orderItemsResult.rows);
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsersAndOrders();
