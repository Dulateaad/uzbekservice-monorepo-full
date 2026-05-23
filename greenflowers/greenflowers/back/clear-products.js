const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function clearProducts() {
  try {
    console.log("🗑️  Очистка данных...");

    // Сначала удаляем заказы и их позиции
    console.log("🗑️  Удаление заказов...");
    await pool.query("DELETE FROM order_items");
    await pool.query("DELETE FROM orders");

    // Теперь удаляем товары
    console.log("🗑️  Удаление товаров из каталога...");
    const result = await pool.query("DELETE FROM products");

    console.log(`✅ Удалено ${result.rowCount} товаров`);

    // Проверяем что все товары удалены
    const checkResult = await pool.query("SELECT COUNT(*) FROM products");
    console.log(`📊 Осталось товаров в каталоге: ${checkResult.rows[0].count}`);

    await pool.end();
    console.log("✅ Готово!");
  } catch (error) {
    console.error("❌ Ошибка при удалении товаров:", error);
    process.exit(1);
  }
}

clearProducts();
