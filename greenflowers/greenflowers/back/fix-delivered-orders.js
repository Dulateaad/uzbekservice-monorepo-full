const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function fixDeliveredOrders() {
  const client = await pool.connect();
  try {
    console.log("Исправляю заказы со статусом delivered без seller_id...");

    // Находим заказы со статусом delivered без seller_id
    const ordersToFix = await client.query(`
      SELECT o.id, o.assigned_to, o.total_amount
      FROM orders o
      WHERE o.status = 'delivered' AND o.seller_id IS NULL AND o.assigned_to IS NOT NULL
    `);

    console.log(`Найдено заказов для исправления: ${ordersToFix.rows.length}`);

    for (const order of ordersToFix.rows) {
      // Устанавливаем seller_id = assigned_to
      await client.query("UPDATE orders SET seller_id = $1 WHERE id = $2", [
        order.assigned_to,
        order.id,
      ]);

      // Создаем запись в shift_sales
      // Проверяем, есть ли уже открытая смена для этого продавца
      let shiftResult = await client.query(
        "SELECT id FROM shifts WHERE user_id = $1 AND status = 'open'",
        [order.assigned_to],
      );

      let shiftId;
      if (shiftResult.rows.length === 0) {
        // Создаем новую смену
        const shiftInsert = await client.query(
          `INSERT INTO shifts (user_id, shift_date, started_at, status, opening_cash, total_sales)
           VALUES ($1, $2, $3, 'open', 0, 0) RETURNING id`,
          [
            order.assigned_to,
            new Date().toISOString().split("T")[0],
            new Date(),
          ],
        );
        shiftId = shiftInsert.rows[0].id;
        console.log(
          `Создана смена ${shiftId} для пользователя ${order.assigned_to}`,
        );
      } else {
        shiftId = shiftResult.rows[0].id;
      }

      // Проверяем, нет ли уже записи shift_sales для этого заказа
      const existingSale = await client.query(
        "SELECT id FROM shift_sales WHERE order_id = $1",
        [order.id],
      );

      if (existingSale.rows.length === 0) {
        // Создаем запись продажи
        await client.query(
          `INSERT INTO shift_sales (shift_id, order_id, sale_amount, discount_amount, sale_time)
           VALUES ($1, $2, $3, 0, $4)`,
          [shiftId, order.id, order.total_amount, new Date()],
        );
        console.log(
          `Создана продажа для заказа ${order.id}: сумма ${order.total_amount}`,
        );
      } else {
        console.log(`Продажа для заказа ${order.id} уже существует`);
      }
    }

    // Проверяем результат
    const fixedOrders = await client.query(`
      SELECT o.id, o.seller_id, u.name as seller_name, o.status
      FROM orders o
      LEFT JOIN users u ON o.seller_id = u.id
      WHERE o.status = 'delivered'
      ORDER BY o.id DESC
      LIMIT 5
    `);

    console.log("\nИсправленные заказы:");
    fixedOrders.rows.forEach((order) => {
      console.log(
        `ID: ${order.id}, Status: ${order.status}, Seller: ${order.seller_name || "NULL"}`,
      );
    });
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDeliveredOrders();
