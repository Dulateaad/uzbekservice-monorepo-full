const express = require("express");
const { Pool } = require("pg");
const Logger = require("./logger");
require("dotenv").config();

console.log("[1] Starting...");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

console.log("[2] Pool created");

const logger = new Logger(pool);

console.log("[3] Logger created");

try {
  const router = require("./routes/trucks")(pool, logger);
  console.log("[4] Trucks router loaded");
} catch (error) {
  console.error("[ERROR] Failed to load trucks router:", error.message);
  process.exit(1);
}

console.log("[5] All loaded successfully!");
