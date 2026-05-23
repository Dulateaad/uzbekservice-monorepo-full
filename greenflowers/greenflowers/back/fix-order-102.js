const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function fixOrder102() {
  const client = await pool.connect();
  try {
    // Исправляем заказ 102: seller_id должен быть user_id (17 - Admin 2), а не assigned_to (1 - Администратор)
    await client.query("UPDATE orders SET seller_id = 17 WHERE id = 102");

    // Обновляем shift_sales для этого заказа
    // Сначала удаляем старую запись
    await client.query("DELETE FROM shift_sales WHERE order_id = 102");

    // Создаем смену для Admin 2 если её нет
    let shiftResult = await client.query(
      "SELECT id FROM shifts WHERE user_id = 17 AND status = 'open'",
    );
    let shiftId;
    if (shiftResult.rows.length === 0) {
      const shiftInsert = await client.query(
        `INSERT INTO shifts (user_id, shift_date, started_at, status, opening_cash, total_sales) VALUES (17, '${new Date().toISOString().split("T")[0]}', '${new Date().toISOString()}', 'open', 0, 0) RETURNING id`,
      );
      shiftId = shiftInsert.rows[0].id;
    } else {
      shiftId = shiftResult.rows[0].id;
    }

    // Создаем новую запись продажи
    await client.query(
      "INSERT INTO shift_sales (shift_id, order_id, sale_amount, discount_amount, sale_time) VALUES ($1, 102, 222.00, 0, $2)",
      [shiftId, new Date()],
    );

    console.log("Заказ 102 исправлен");
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixOrder102();
