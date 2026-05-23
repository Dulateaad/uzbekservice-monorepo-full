/**
 * Greenflowers API — Cloud Functions + Firestore (без PostgreSQL).
 * Auth: login-phone, email/password /users/login — см. lib/usersRouter.js
 * (login_logs: без undefined в полях Firestore)
 */

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const axios = require("axios");

const createUsersRouter = require("./lib/usersRouter");
const createProductsRouter = require("./lib/productsRouter");
const createCartRouter = require("./lib/cartRouter");
const createOrdersRouter = require("./lib/ordersRouter");
const { registerApiStubs } = require("./lib/apiStubs");
const catalogInventoryHandlers = require("./lib/catalogInventoryHandlers");

setGlobalOptions({
  region: "europe-west3",
  maxInstances: 20,
});

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/** Origins для браузера (Hosting + локальная разработка). Дополнительно: CORS_ORIGINS через запятую. */
const DEFAULT_CORS_ORIGINS = [
  "https://greenflowers-15776.web.app",
  "https://greenflowers-15776.firebaseapp.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

async function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return res.status(401).json({ success: false, error: "Требуется токен" });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(m[1]);
    req.user = decoded;
    next();
  } catch (e) {
    console.error("verifyIdToken:", e.message);
    return res.status(401).json({ success: false, error: "Недействительный токен" });
  }
}

const app = express();

const extraOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...DEFAULT_CORS_ORIGINS, ...extraOrigins]);

app.use(
  cors({
    origin(origin, callback) {
      if (process.env.CORS_ALLOW_ALL === "1" || process.env.CORS_ALLOW_ALL === "true") {
        return callback(null, true);
      }
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      console.warn("CORS blocked origin:", origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => {
  res.json({
    message: "Spray Flowers API (Firebase + Firestore)",
    status: "running",
    endpoints: [
      "/api/health",
      "/api/users",
      "/api/products",
      "/api/cart",
      "/api/orders",
      "/api/catalog/batches",
      "/api/inventory-items/categories/available",
      "/api/inventory-items/all-available",
    ],
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    backend: "firestore",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    await db.collection("_health").doc("ping").set(
      { at: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );
    const snap = await db.collection("_health").doc("ping").get();
    res.json({
      success: true,
      firestore: "ok",
      ping: snap.exists ? snap.data() : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const usersRouter = createUsersRouter({
  db,
  admin,
  bcrypt,
  axios,
  requireAuth,
});
const productsRouter = createProductsRouter({ db, admin });
const cartRouter = createCartRouter({ db, admin });
const ordersRouter = createOrdersRouter({ db, admin });

app.use("/api/users", usersRouter);
app.use("/api/products", productsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);

/** Каталог / склад — без express.Router, см. lib/catalogInventoryHandlers.js */
app.get("/api/catalog/batches", (req, res) =>
  catalogInventoryHandlers.getCatalogBatches(req, res, { db, admin }),
);
app.get("/api/inventory-items/categories/available", (req, res) =>
  catalogInventoryHandlers.getCategoriesAvailable(req, res, { db, admin }),
);
app.get("/api/inventory-items/all-available", (req, res) =>
  catalogInventoryHandlers.getAllAvailable(req, res, { db, admin }),
);

registerApiStubs(app);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: err.message || "Server error" });
});

exports.sprayApi = onRequest(
  {
    cors: false,
    invoker: "public",
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  app,
);
