const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
const Logger = require("./logger");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const cors = require("cors");

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://26.161.253.187:3000",
      "http://26.161.253.187:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("DB error:", err.message);
  } else {
    console.log("DB ok");
  }
});

const logger = new Logger(pool);

const usersRoutes = require("./routes/users")(pool, logger);
console.log("users loaded");

const productsRoutes = require("./routes/products")(pool, logger);
console.log("products loaded");

const ordersRoutes = require("./routes/orders")(pool, logger);
console.log("orders loaded");

const logsRoutes = require("./routes/logs")(pool, logger);
console.log("logs loaded");

const flowersRoutes = require("./routes/flowers")(pool, logger);
console.log("flowers loaded");

const cartRoutes = require("./routes/cart")(pool);
console.log("cart loaded");

const inventoryRoutes = require("./routes/inventory")(pool, logger);
console.log("inventory loaded");

const inventoryItemsRoutes = require("./routes/inventory-items")(pool, logger);
console.log("inventory-items loaded");

const flowerCategoriesRoutes = require("./routes/flower-categories")(
  pool,
  logger,
);
console.log("flower-categories loaded");

const shiftsRoutes = require("./routes/shifts")(pool, logger);
console.log("shifts loaded");

const calendarRoutes = require("./routes/calendar")(pool, logger);
console.log("calendar loaded");

const productsByDeliveriesRoutes = require("./routes/products-by-deliveries")(
  pool,
  logger,
);
console.log("products-by-deliveries loaded");

const commissionsRoutes = require("./routes/commissions")(pool);
console.log("commissions loaded");

try {
  const trucksRoutes = require("./routes/trucks")(pool, logger);
  console.log("trucks loaded");
} catch (error) {
  console.log("error loading trucks:", error.message);
}

try {
  const userPermissionsRoutes = require("./routes/user-permissions")(pool);
  console.log("user-permissions loaded");
} catch (err) {
  console.log("error loading user-permissions:", err.message);
}

try {
  const adminSettingsRoutes = require("./routes/admin-settings")(pool);
  console.log("admin-settings loaded");
} catch (err) {
  console.log("error loading admin-settings:", err.message);
}

try {
  const clientsRoutes = require("./routes/clients")(pool, logger);
  console.log("clients loaded");
} catch (err) {
  console.log("error loading clients:", err.message);
}

app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
