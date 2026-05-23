const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function checkTables() {
  const client = await pool.connect();
  try {
    console.log("Проверяю структуру таблиц...");

    // Проверим структуру таблицы trucks
    const trucksColumnsResult = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'trucks'
       ORDER BY ordinal_position`,
    );
    console.log("Столбцы таблицы trucks:");
    trucksColumnsResult.rows.forEach((col) => {
      console.log(
        `  ${col.column_name}: ${col.data_type} (${col.is_nullable})`,
      );
    });

    // Проверим данные в trucks
    const trucksDataResult = await client.query("SELECT * FROM trucks LIMIT 5");
    console.log("\nДанные в таблице trucks:");
    console.log(trucksDataResult.rows);

    // Проверим данные в orders
    const ordersDataResult = await client.query(
      "SELECT id, truck_id, seller_id, status, city, delivery_city FROM orders LIMIT 5",
    );
    console.log("\nДанные в таблице orders:");
    console.log(ordersDataResult.rows);
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();
