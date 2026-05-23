const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = 5000;

console.log("[1] Starting server...");

// Minimal pool configuration
const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
  user: "postgres",
  password: "Sula2206",
});

console.log("[2] Pool created");

// Minimal middleware
app.use(express.json());

console.log("[3] Middleware configured");

// Single simple route
app.get("/api/trucks", (req, res) => {
  console.log("[4] Route handler called");
  res.json({ success: true, data: [] });
});

console.log("[5] Route registered");

// Start server
app.listen(PORT, () => {
  console.log(`[6] ✅ Server running on port ${PORT}`);
});

console.log("[7] Listener started");
