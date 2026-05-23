const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function fixSellerIds() {
  const client = await pool.connect();
  try {
    console.log("Исправляю seller_id для заказов...");

    // Находим заказы со статусом delivered без seller_id
    const ordersToFix = await client.query(`
      SELECT o.id, o.user_id, o.assigned_to, o.status, u.name as creator_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.status = 'delivered' AND o.seller_id IS NULL
    `);

    console.log(`Найдено заказов для исправления: ${ordersToFix.rows.length}`);

    for (const order of ordersToFix.rows) {
      // Устанавливаем seller_id = user_id (создатель заказа)
      await client.query("UPDATE orders SET seller_id = $1 WHERE id = $2", [
        order.user_id,
        order.id,
      ]);

      // Создаем запись в shift_sales
      // Проверяем, есть ли уже открытая смена для этого продавца
      let shiftResult = await client.query(
        "SELECT id FROM shifts WHERE user_id = $1 AND status = 'open'",
        [order.user_id],
      );

      let shiftId;
      if (shiftResult.rows.length === 0) {
        // Создаем новую смену
        const shiftInsert = await client.query(
          `INSERT INTO shifts (user_id, shift_date, started_at, status, opening_cash, total_sales)
           VALUES ($1, $2, $3, 'open', 0, 0) RETURNING id`,
          [order.user_id, new Date().toISOString().split("T")[0], new Date()],
        );
        shiftId = shiftInsert.rows[0].id;
        console.log(
          `Создана смена ${shiftId} для пользователя ${order.user_id} (${order.creator_name})`,
        );
      } else {
        shiftId = shiftResult.rows[0].id;
      }

      // Получаем сумму заказа
      const orderTotal = await client.query(
        "SELECT total_amount FROM orders WHERE id = $1",
        [order.id],
      );

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
          [shiftId, order.id, orderTotal.rows[0].total_amount, new Date()],
        );
        console.log(
          `Создана продажа для заказа ${order.id}: сумма ${orderTotal.rows[0].total_amount}`,
        );
      } else {
        console.log(`Продажа для заказа ${order.id} уже существует`);
      }
    }

    // Проверяем результат
    const result = await client.query(`
      SELECT o.id, o.user_id, o.seller_id, o.status, u_creator.name as creator_name, u_seller.name as seller_name
      FROM orders o
      LEFT JOIN users u_creator ON o.user_id = u_creator.id
      LEFT JOIN users u_seller ON o.seller_id = u_seller.id
      WHERE o.status = 'delivered'
      ORDER BY o.id DESC
      LIMIT 5
    `);

    console.log("\nРезультат исправления:");
    result.rows.forEach((order) => {
      console.log(
        `ID: ${order.id}, Creator: ${order.creator_name}, Seller: ${order.seller_name}, Status: ${order.status}`,
      );
    });
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSellerIds();
