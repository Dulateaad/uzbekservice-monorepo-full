const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function checkShiftsAndSales() {
  const client = await pool.connect();
  try {
    console.log("Проверяю смены и продажи...");

    // Проверим таблицу shifts
    const shiftsResult = await client.query("SELECT * FROM shifts LIMIT 5");
    console.log("Смены:", shiftsResult.rows);

    // Проверим таблицу shift_sales
    const shiftSalesResult = await client.query(
      "SELECT * FROM shift_sales LIMIT 5",
    );
    console.log("Продажи смен:", shiftSalesResult.rows);

    // Проверим, есть ли продажи для наших заказов
    const salesForOrders = await client.query(`
      SELECT ss.*, s.user_id, u.name as worker_name
      FROM shift_sales ss
      JOIN shifts s ON ss.shift_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE ss.order_id IN (100, 101)
    `);
    console.log("Продажи для заказов 100 и 101:", salesForOrders.rows);
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkShiftsAndSales();
