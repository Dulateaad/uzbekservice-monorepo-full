const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function checkOrderItems() {
  const client = await pool.connect();
  try {
    console.log("Проверяю структуру order_items...");

    // Проверим структуру таблицы order_items
    const columnsResult = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'order_items'
       ORDER BY ordinal_position`,
    );
    console.log("Столбцы таблицы order_items:");
    columnsResult.rows.forEach((col) => {
      console.log(
        `  ${col.column_name}: ${col.data_type} (${col.is_nullable})`,
      );
    });

    // Проверим элементы заказов
    const orderItemsResult = await client.query(`
      SELECT oi.order_id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price,
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

checkOrderItems();
