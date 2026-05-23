const { Pool } = require("pg");
require("dotenv").config();

const testConnection = async () => {
  console.log("Testing PostgreSQL connection...");

  const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: "", // Trust authentication - no password needed
  };

  console.log("Config:", config);

  const pool = new Pool(config);

  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Connection successful!");
    console.log("Current time:", result.rows[0].now);
  } catch (error) {
    console.error("❌ Connection failed:");
    console.error("Error:", error.message);
    console.error("Code:", error.code);

    if (error.code === "ECONNREFUSED") {
      console.error("→ PostgreSQL server is not running");
    } else if (error.code === "3D000") {
      console.error("→ Database does not exist");
    } else if (error.code === "28P01") {
      console.error("→ Invalid password");
    }
  } finally {
    await pool.end();
  }
};

testConnection();
