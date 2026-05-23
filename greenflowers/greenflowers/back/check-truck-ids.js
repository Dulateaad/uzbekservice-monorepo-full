const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function checkOrderTruckIds() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, truck_id, seller_id, status FROM orders WHERE status = 'delivered' ORDER BY id DESC LIMIT 5",
    );
    console.log("Заказы:", result.rows);
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkOrderTruckIds();
