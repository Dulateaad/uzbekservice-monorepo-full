const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function checkOrderAssignments() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT o.id, o.user_id, o.assigned_to, o.seller_id, o.status, o.created_at,
             u_creator.name as creator_name,
             u_assigned.name as assigned_name,
             u_seller.name as seller_name
      FROM orders o
      LEFT JOIN users u_creator ON o.user_id = u_creator.id
      LEFT JOIN users u_assigned ON o.assigned_to = u_assigned.id
      LEFT JOIN users u_seller ON o.seller_id = u_seller.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    console.log("Заказы с информацией о пользователях:");
    result.rows.forEach((order) => {
      console.log(
        `ID: ${order.id}, Creator: ${order.creator_name}, Assigned: ${order.assigned_name}, Seller: ${order.seller_name}, Status: ${order.status}`,
      );
    });
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkOrderAssignments();
