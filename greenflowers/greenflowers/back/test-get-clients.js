const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

(async () => {
  try {
    const res = await pool.query(
      "SELECT id, name, phone, email, balance, last_activity, total_orders, total_profit FROM clients LIMIT 50",
    );
    console.log("Rows:", res.rows.length);
    console.dir(res.rows, { depth: null, maxArrayLength: null });
  } catch (err) {
    console.error("Error querying clients table:", err.message);
    process.exitCode = 2;
  } finally {
    await pool.end();
  }
})();
