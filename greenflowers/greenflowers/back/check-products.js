const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "greenflowers_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Sula2206",
});

pool.query("SELECT id, name FROM products LIMIT 5", (err, res) => {
  if (err) {
    console.error("Error:", err.message);
  } else {
    console.log("Available products:");
    console.log(res.rows);
  }
  pool.end();
});
