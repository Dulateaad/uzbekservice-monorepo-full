const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Simple trucks endpoint for testing
app.get("/api/trucks", async (req, res) => {
  try {
    console.log("[*] GET /api/trucks called");
    const startTime = Date.now();
    const result = await pool.query(`SELECT * FROM trucks LIMIT 10`);
    const duration = Date.now() - startTime;
    console.log(
      `[✓] Query successful in ${duration}ms, rows:`,
      result.rows.length
    );
    res.json({
      success: true,
      data: result.rows,
      pagination: { page: 1, limit: 10, total: result.rows.length, pages: 1 },
    });
  } catch (error) {
    console.error("[✗] Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ success: false, error: err.message });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Simple test server running on http://localhost:${PORT}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
