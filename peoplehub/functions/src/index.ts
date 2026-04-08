import { https } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import tripRoutes from "./routes/trips";
import driverRoutes from "./routes/driver";
import chatRoutes from "./routes/chat";
import { processVerificationImage } from "./ocr";
import { expireStaleTrips } from "./scheduled";
import { notifyDriversNewTrip, notifyTripStatusChange } from "./notifications";

const app = express();

// CORS: явно для Cloud Run (preflight может не доходить до cors())
const allowOrigin = "https://taxi-eb8b7.web.app";
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));

// Health check (Cloud Functions передаёт путь без /api)
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));
app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// OCR handler (используется для обоих путей)
async function handleProcessVerificationImage(req: express.Request, res: express.Response) {
  try {
    const body = req.body as { base64?: string; mimeType?: string; type?: string };
    const base64 = typeof body?.base64 === "string" ? body.base64 : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "image/jpeg";
    const type =
      body?.type === "techPassport" || body?.type === "license" || body?.type === "photo"
        ? body.type
        : "photo";
    if (!base64) {
      return res.status(400).json({ error: "base64 required" });
    }
    const result = await processVerificationImage(base64, mimeType, type);
    return res.json(result);
  } catch (err) {
    console.error("processVerificationImage error:", err);
    return res.status(500).json({ error: "OCR failed", text: "", entities: [], labels: [] });
  }
}

// OCR (Document AI + Vision на сервере) — Cloud Functions передаёт путь без /api
app.post("/api/processVerificationImage", handleProcessVerificationImage);
app.post("/processVerificationImage", handleProcessVerificationImage);
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/chat", chatRoutes);

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err.name === "ZodError") {
    return res.status(400).json({ error: "Ошибка валидации", details: err.errors });
  }
  return res.status(err.statusCode || 500).json({ error: err.message || "Ошибка сервера" });
});

// Export as Firebase Cloud Function
export const api = https.onRequest(app);

// Scheduled: expire stale SEARCHING/BIDDING trips every 2 minutes
export const expireTrips = onSchedule("every 2 minutes", async () => {
  await expireStaleTrips();
});

// Firestore trigger: notify drivers when a new trip is created
export const tripCreated = onDocumentCreated("trips/{tripId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const trip = snap.data();
  if (trip.status === "SEARCHING") {
    await notifyDriversNewTrip({
      pickupAddress: trip.pickupAddress || "",
      price: trip.price || 0,
      city: trip.city || "",
      distanceKm: trip.distanceKm || 0,
    });
  }
});

// Firestore trigger: notify participants on trip status change
export const tripUpdated = onDocumentUpdated("trips/{tripId}", async (event) => {
  const change = event.data;
  if (!change) return;
  const before = change.before.data();
  const after = change.after.data();
  if (before.status === after.status) return;

  const tripId = event.params.tripId;

  if (["DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "COMPLETED", "NO_DRIVER"].includes(after.status)) {
    await notifyTripStatusChange(after.clientId, tripId, after.status, {
      driverName: after.driverName,
      price: after.finalPrice || after.price,
    });
  }

  if (["CANCELLED"].includes(after.status) && after.driverId) {
    await notifyTripStatusChange(after.driverId, tripId, after.status);
  }
});
