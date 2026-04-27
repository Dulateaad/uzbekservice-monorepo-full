import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, FieldValue } from "../config/firebase";
import { authMiddleware, requireRole } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);
router.use(requireRole("DRIVER"));

// POST /api/driver/go-online
router.post("/go-online", async (req: Request, res: Response) => {
  const snap = await db.collection("users").doc(req.user!.id).get();
  const u = snap.data();
  const dp = u?.driverProfile;
  if (!dp) return res.status(404).json({ error: "Профиль не найден" });
  if (!dp.subscriptionActive) return res.status(402).json({ error: "Активируйте абонентку (200 тг/день)" });
  const avatar = typeof u?.avatarUrl === "string" ? u.avatarUrl.trim() : "";
  if (!avatar) {
    return res.status(400).json({ error: "Сделайте селфи в «Профиль» — без фото нельзя выйти на линию" });
  }
  await db.collection("users").doc(req.user!.id).update({ "driverProfile.driverStatus": "ONLINE" });
  res.json({ status: "ONLINE" });
});

// POST /api/driver/go-offline
router.post("/go-offline", async (req: Request, res: Response) => {
  const active = await db.collection("trips").where("driverId", "==", req.user!.id)
    .where("status", "in", ["DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "PAID", "IN_PROGRESS"]).limit(1).get();
  if (!active.empty) return res.status(400).json({ error: "Нельзя уйти во время поездки" });
  await db.collection("users").doc(req.user!.id).update({ "driverProfile.driverStatus": "OFFLINE" });
  res.json({ status: "OFFLINE" });
});

// POST /api/driver/location — GPS
router.post("/location", async (req: Request, res: Response) => {
  const data = z.object({
    lat: z.number(), lng: z.number(), accuracy: z.number(),
    speed: z.number().optional(), heading: z.number().optional(),
    isMockLocation: z.boolean().optional(), timestamp: z.number(),
  }).parse(req.body);

  if (data.accuracy > 30) return res.json({ accepted: false, reason: "LOW_ACCURACY" });
  if (data.isMockLocation) return res.json({ accepted: false, reason: "MOCK_LOCATION" });

  // Обновляем позицию водителя
  await db.collection("users").doc(req.user!.id).update({
    "driverProfile.currentLat": data.lat,
    "driverProfile.currentLng": data.lng,
    "driverProfile.lastLocationAt": FieldValue.serverTimestamp(),
  });

  // Real-time позиция для клиента (отдельная коллекция для быстрого onSnapshot)
  await db.collection("driverLocations").doc(req.user!.id).set({
    lat: data.lat, lng: data.lng, heading: data.heading || 0,
    speed: data.speed || 0, updatedAt: FieldValue.serverTimestamp(),
  });

  res.json({ accepted: true });
});

// POST /api/driver/subscribe
router.post("/subscribe", async (req: Request, res: Response) => {
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await db.collection("users").doc(req.user!.id).update({
    "driverProfile.subscriptionActive": true,
    "driverProfile.subscriptionExpiresAt": expires,
  });
  await db.collection("subscriptions").add({
    driverId: req.user!.id, amount: 200, paidAt: FieldValue.serverTimestamp(), expiresAt: expires,
  });
  res.json({ subscriptionActive: true, expiresAt: expires.toISOString() });
});

// GET /api/driver/stats
router.get("/stats", async (req: Request, res: Response) => {
  const snap = await db.collection("users").doc(req.user!.id).get();
  const u = snap.data()!;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayTrips = await db.collection("trips").where("driverId", "==", req.user!.id)
    .where("status", "==", "COMPLETED").where("completedAt", ">=", today).get();

  let todayEarnings = 0;
  todayTrips.docs.forEach((d) => { todayEarnings += d.data().price || 0; });

  res.json({
    totalTrips: u.totalTrips || 0, todayTrips: todayTrips.size,
    totalEarnings: 0, todayEarnings,
    trustScore: u.trustScore ?? 4.5,
  });
});

// GET /api/driver/profile
router.get("/profile", async (req: Request, res: Response) => {
  const snap = await db.collection("users").doc(req.user!.id).get();
  if (!snap.exists) return res.status(404).json({ error: "Не найден" });
  res.json({ id: req.user!.id, ...snap.data() });
});

export default router;
