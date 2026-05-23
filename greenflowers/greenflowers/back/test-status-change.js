const axios = require("axios");
const { Pool } = require("pg");
require("dotenv").config();

const API_URL = "http://localhost:5000/api";

async function run() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  try {
    // find a non-delivered order with a truck assigned
    const res = await pool.query(
      "SELECT id, status FROM orders WHERE status != 'delivered' LIMIT 1",
    );
    if (res.rows.length === 0) {
      console.log("No suitable order found to test status change.");
      return;
    }
    const order = res.rows[0];
    console.log("Using order", order.id, "current status", order.status);

    // update to delivered
    console.log("Setting status to 'delivered' via API...");
    await axios.put(`${API_URL}/orders/${order.id}/status`, {
      userId: 1,
      status: "delivered",
    });

    // check shift_sales record
    const saleCheck = await pool.query(
      "SELECT * FROM shift_sales WHERE order_id = $1",
      [order.id],
    );
    console.log("shift_sales count after deliver:", saleCheck.rows.length);

    // revert status to pending
    console.log("Reverting status to 'pending' via API...");
    await axios.put(`${API_URL}/orders/${order.id}/status`, {
      userId: 1,
      status: "pending",
    });

    const saleCheck2 = await pool.query(
      "SELECT * FROM shift_sales WHERE order_id = $1",
      [order.id],
    );
    console.log("shift_sales count after reverting:", saleCheck2.rows.length);
  } catch (err) {
    console.error("Test failed:", err.message);
  } finally {
    pool.end();
  }
}

run();
