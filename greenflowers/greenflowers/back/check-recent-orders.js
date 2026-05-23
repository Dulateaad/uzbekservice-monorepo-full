const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function checkRecentOrders() {
  const client = await pool.connect();
  try {
    console.log("Проверяю последние заказы...");

    const ordersResult = await client.query(`
      SELECT o.id, o.truck_id, o.seller_id, o.status, o.city, o.created_at,
             u.name as seller_name
      FROM orders o
      LEFT JOIN users u ON o.seller_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    console.log("Последние заказы:");
    ordersResult.rows.forEach((order) => {
      console.log(
        `ID: ${order.id}, Status: ${order.status}, Seller: ${order.seller_name || "NULL"}, Created: ${order.created_at}`,
      );
    });

    // Проверим shift_sales для последних заказов
    if (ordersResult.rows.length > 0) {
      const orderIds = ordersResult.rows.map((o) => o.id).join(",");
      const shiftSalesResult = await client.query(`
        SELECT ss.order_id, ss.sale_amount, s.user_id, u.name as worker_name
        FROM shift_sales ss
        JOIN shifts s ON ss.shift_id = s.id
        JOIN users u ON s.user_id = u.id
        WHERE ss.order_id IN (${orderIds})
        ORDER BY ss.order_id
      `);

      console.log("\nПродажи для последних заказов:");
      shiftSalesResult.rows.forEach((sale) => {
        console.log(
          `Order ${sale.order_id}: ${sale.worker_name} - ${sale.sale_amount}`,
        );
      });
    }
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkRecentOrders();
