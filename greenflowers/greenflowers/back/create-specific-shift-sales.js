const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function createShiftSalesForSpecificOrders() {
  const client = await pool.connect();
  try {
    console.log("Создаю shift_sales для заказов 100 и 101...");

    // Проверим, есть ли уже shift_sales для этих заказов
    const existingSales = await client.query(`
      SELECT order_id FROM shift_sales WHERE order_id IN (100, 101)
    `);

    if (existingSales.rows.length > 0) {
      console.log("shift_sales уже существуют для этих заказов");
      return;
    }

    // Получим данные о заказах
    const ordersData = await client.query(`
      SELECT o.id, o.seller_id, u.name as seller_name,
             SUM(oi.quantity * oi.unit_price) as total_amount
      FROM orders o
      JOIN users u ON o.seller_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id IN (100, 101)
      GROUP BY o.id, o.seller_id, u.name
    `);

    console.log("Данные заказов:", ordersData.rows);

    for (const order of ordersData.rows) {
      // Создадим смену для продавца, если её нет
      const existingShift = await client.query(
        `
        SELECT id FROM shifts
        WHERE user_id = $1 AND status = 'open'
        ORDER BY started_at DESC LIMIT 1
      `,
        [order.seller_id],
      );

      let shiftId;
      if (existingShift.rows.length === 0) {
        // Создадим новую смену
        const now = new Date();
        const shiftResult = await client.query(
          `
          INSERT INTO shifts (user_id, shift_date, started_at, status, opening_cash, total_sales)
          VALUES ($1, $2, $3, 'open', 0, 0)
          RETURNING id
        `,
          [order.seller_id, now.toISOString().split("T")[0], now],
        );

        shiftId = shiftResult.rows[0].id;
        console.log(
          `Создана смена ${shiftId} для пользователя ${order.seller_id} (${order.seller_name})`,
        );
      } else {
        shiftId = existingShift.rows[0].id;
        console.log(
          `Используем существующую смену ${shiftId} для пользователя ${order.seller_id}`,
        );
      }

      // Создадим запись shift_sales
      await client.query(
        `
        INSERT INTO shift_sales (shift_id, order_id, sale_amount, discount_amount, sale_time)
        VALUES ($1, $2, $3, 0, $4)
      `,
        [shiftId, order.id, order.total_amount.toString(), new Date()],
      );

      console.log(
        `Создана продажа: shift=${shiftId}, order=${order.id}, amount=${order.total_amount}`,
      );
    }

    // Проверим результат
    const finalResult = await client.query(`
      SELECT ss.id, ss.shift_id, ss.order_id, ss.sale_amount,
             s.user_id, u.name as worker_name
      FROM shift_sales ss
      JOIN shifts s ON ss.shift_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE ss.order_id IN (100, 101)
      ORDER BY ss.order_id
    `);

    console.log("Итоговые продажи:", finalResult.rows);
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

createShiftSalesForSpecificOrders();
