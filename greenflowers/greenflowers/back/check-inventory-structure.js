const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
  user: "postgres",
  password: "Sula2206",
});

pool.query(
  "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'inventory_items' ORDER BY ordinal_position",
  (err, res) => {
    if (err) {
      console.error("Error:", err.message);
    } else {
      console.log("inventory_items table structure:");
      console.table(res.rows);
    }
    pool.end();
  },
);
