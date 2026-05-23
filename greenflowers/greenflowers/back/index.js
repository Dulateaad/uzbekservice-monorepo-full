const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
const Logger = require("./logger");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL connection pool
const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "postgres",
};

const pool = new Pool(poolConfig);

// Initialize logger
const logger = new Logger(pool);

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection error:", err.message);
  } else {
    console.log("✅ Database connected successfully at", res.rows[0].now);
  }
});

// Middleware — CORS (добавь домены продакшена в CORS_ORIGINS через запятую)
const defaultCorsOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://26.161.253.187:3000",
  "http://26.161.253.187:3001",
  "https://greenflowers-15776.web.app",
  "https://greenflowers-15776.firebaseapp.com",
];
const extraCors = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: [...defaultCorsOrigins, ...extraCors],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Global request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Serve static files FIRST
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Add logging middleware for uploads
app.use("/uploads", (req, res, next) => {
  console.log(`Static file request: ${req.path}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Spray Flowers API Server",
    status: "running",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      dbTest: "/api/db-test",
      register: "POST /api/users/register",
      login: "POST /api/users/login",
      products: "/api/products",
      testPage: "/test",
    },
  });
});

// Serve test HTML page
app.get("/test", (req, res) => {
  res.sendFile(__dirname + "/test-registration.html");
});

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test database query
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database(), current_user, version()",
    );
    res.json({
      success: true,
      database: result.rows[0].current_database,
      user: result.rows[0].current_user,
      version: result.rows[0].version,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Import routes
const usersRoutes = require("./routes/users")(pool, logger);
const productsRoutes = require("./routes/products")(pool, logger);
const ordersRoutes = require("./routes/orders")(pool, logger);
const logsRoutes = require("./routes/logs")(pool, logger);
const flowersRoutes = require("./routes/flowers")(pool, logger);
// const preordersRoutes = require("./routes/preorders")(pool); // preorders removed
const cartRoutes = require("./routes/cart")(pool);
const inventoryRoutes = require("./routes/inventory")(pool, logger);
const inventoryItemsRoutes = require("./routes/inventory-items")(pool, logger);
const flowerCategoriesRoutes = require("./routes/flower-categories")(
  pool,
  logger,
);
const shiftsRoutes = require("./routes/shifts")(pool, logger);
const calendarRoutes = require("./routes/calendar")(pool, logger);
const productsByDeliveriesRoutes = require("./routes/products-by-deliveries")(
  pool,
  logger,
);
const commissionsRoutes = require("./routes/commissions")(pool);
let trucksRoutes;
try {
  trucksRoutes = require("./routes/trucks")(pool, logger);
  console.log("✅ Trucks route loaded successfully");
} catch (error) {
  console.error("❌ Error loading trucks route:", error.message);
  // Fallback: create a simple error route
  trucksRoutes = express.Router();
  trucksRoutes.get("*", (req, res) => {
    res.status(500).json({
      success: false,
      error: "Trucks route not available: " + error.message,
    });
  });
}

// Use routes
// Test route for uploads
app.get("/test-upload", (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const filePath = path.join(
    __dirname,
    "public/uploads/inventory-1772051968145-770649647.jpg",
  );
  if (fs.existsSync(filePath)) {
    res.json({ exists: true, path: filePath });
  } else {
    res.json({ exists: false, path: filePath });
  }
});

app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/flowers", flowersRoutes);
app.use("/api/flower-categories", flowerCategoriesRoutes);
// app.use("/api/preorders", preordersRoutes); // page deleted
app.use("/api/cart", cartRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory-items", inventoryItemsRoutes);
app.use("/api/shifts", shiftsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/catalog", productsByDeliveriesRoutes);
app.use("/api/trucks", trucksRoutes);
app.use("/api/commissions", commissionsRoutes);
// User Permissions routes (NO middleware requirement)
try {
  const userPermissionsRoutes = require("./routes/user-permissions")(pool);
  app.use("/api/permissions", userPermissionsRoutes);
  console.log("✅ User Permissions route loaded successfully");
} catch (err) {
  console.error("❌ Error loading user permissions route:", err.message);
}
// Admin Settings routes
try {
  const adminSettingsRoutes = require("./routes/admin-settings")(pool);
  app.use("/api/admin", adminSettingsRoutes);
  console.log("✅ Admin Settings route loaded successfully");
} catch (err) {
  console.error("❌ Error loading admin settings route:", err.message);
}
// Clients (CRM) routes
try {
  const clientsRoutes = require("./routes/clients")(pool, logger);
  app.use("/api/clients", clientsRoutes);
  console.log("✅ Clients route loaded successfully");
} catch (err) {
  console.error("❌ Error loading clients route:", err.message);
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({ success: false, error: err.message });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Start server
app.listen(PORT, () => {
  console.log(`🌸 Server is running on http://localhost:${PORT}`);
});
