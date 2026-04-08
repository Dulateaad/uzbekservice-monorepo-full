import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, FieldValue } from "../config/firebase";
import { authMiddleware, requireRole } from "../middleware/auth";
import { calculateTripPrice } from "../utils/pricing";
import { haversineDistance, isWithinRadius } from "../utils/geo";
import { config } from "../config";

const router = Router();
router.use(authMiddleware);

// FSM
const TRANSITIONS: Record<string, string[]> = {
  SEARCHING: ["DRIVER_ASSIGNED", "CANCELLED", "NO_DRIVER"],
  DRIVER_ASSIGNED: ["DRIVER_ARRIVING", "CANCELLED"],
  DRIVER_ARRIVING: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["WAITING_PAYMENT", "CANCELLED"],
  WAITING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], CANCELLED: [], NO_DRIVER: ["SEARCHING"],
};

// POST /api/trips — создать заказ
router.post("/", requireRole("CLIENT"), async (req: Request, res: Response) => {
  const data = z.object({
    pickupLat: z.number(), pickupLng: z.number(), pickupAddress: z.string(),
    dropoffLat: z.number(), dropoffLng: z.number(), dropoffAddress: z.string(),
    distanceKm: z.number().positive(), estimatedMinutes: z.number().int().positive(),
  }).parse(req.body);

  // Проверяем активную поездку
  const active = await db.collection("trips").where("clientId", "==", req.user!.id)
    .where("status", "in", ["SEARCHING", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "WAITING_PAYMENT", "PAID", "IN_PROGRESS"]).limit(1).get();
  if (!active.empty) return res.status(400).json({ error: "У вас уже есть активная поездка" });

  const estimate = calculateTripPrice(data.distanceKm, data.estimatedMinutes);

  const tripRef = db.collection("trips").doc();
  const tripData = {
    clientId: req.user!.id,
    driverId: null,
    pickupLat: data.pickupLat, pickupLng: data.pickupLng, pickupAddress: data.pickupAddress,
    dropoffLat: data.dropoffLat, dropoffLng: data.dropoffLng, dropoffAddress: data.dropoffAddress,
    distanceKm: data.distanceKm, estimatedMinutes: data.estimatedMinutes,
    price: estimate.price, status: "SEARCHING",
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  };
  await tripRef.set(tripData);

  // Ищем водителя
  const driverSnap = await db.collection("users")
    .where("role", "==", "DRIVER")
    .where("driverProfile.driverStatus", "==", "ONLINE")
    .where("driverProfile.subscriptionActive", "==", true)
    .limit(10).get();

  let assigned = false;
  if (!driverSnap.empty) {
    // Находим ближайшего
    const candidates = driverSnap.docs
      .filter((d) => d.data().driverProfile?.currentLat)
      .map((d) => {
        const dp = d.data().driverProfile;
        return { id: d.id, dist: haversineDistance(data.pickupLat, data.pickupLng, dp.currentLat, dp.currentLng), trust: d.data().trustScore || 4.0 };
      })
      .filter((d) => d.dist <= 15000)
      .sort((a, b) => a.dist - b.dist);

    if (candidates.length > 0) {
      const best = candidates[0];
      await tripRef.update({ driverId: best.id, status: "DRIVER_ASSIGNED", driverAssignedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      await db.collection("users").doc(best.id).update({ "driverProfile.driverStatus": "BUSY" });
      assigned = true;
    }
  }

  if (!assigned) {
    // Через 60 сек пометим NO_DRIVER (в реальном MVP — через scheduled function)
    // Пока оставляем SEARCHING
  }

  const snap = await tripRef.get();
  res.status(201).json({ trip: { id: tripRef.id, ...snap.data() }, priceEstimate: estimate });
});

// GET /api/trips/price
router.get("/price", async (req: Request, res: Response) => {
  const { distanceKm, estimatedMinutes } = z.object({
    distanceKm: z.coerce.number().positive(),
    estimatedMinutes: z.coerce.number().int().positive(),
  }).parse(req.query);
  res.json(calculateTripPrice(distanceKm, estimatedMinutes));
});

// GET /api/trips/active
router.get("/active", async (req: Request, res: Response) => {
  const activeStatuses = ["SEARCHING", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "WAITING_PAYMENT", "PAID", "IN_PROGRESS"];

  // Ищем как клиент
  let snap = await db.collection("trips").where("clientId", "==", req.user!.id).where("status", "in", activeStatuses).limit(1).get();
  // Или как водитель
  if (snap.empty) {
    snap = await db.collection("trips").where("driverId", "==", req.user!.id).where("status", "in", activeStatuses).limit(1).get();
  }

  if (snap.empty) return res.json(null);

  const doc = snap.docs[0];
  const trip = { id: doc.id, ...doc.data() };

  // Подтягиваем данные участников
  const t = doc.data();
  const [clientSnap, driverSnap] = await Promise.all([
    db.collection("users").doc(t.clientId).get(),
    t.driverId ? db.collection("users").doc(t.driverId).get() : Promise.resolve(null),
  ]);

  const client = clientSnap.exists ? clientSnap.data() : null;
  const driver = driverSnap?.exists ? driverSnap.data() : null;

  res.json({
    ...trip,
    client: client ? { id: t.clientId, firstName: client.firstName, lastName: client.lastName, phone: client.phone, trustScore: { score: client.trustScore ?? 4.5 } } : null,
    driver: driver ? { id: t.driverId, firstName: driver.firstName, lastName: driver.lastName, phone: driver.phone, trustScore: { score: driver.trustScore ?? 4.5 }, driverProfile: driver.driverProfile || null } : null,
  });
});

// GET /api/trips/history
router.get("/history", async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || "1"));
  const limit = 20;

  const snap = await db.collection("trips")
    .where("clientId", "==", req.user!.id)
    .orderBy("createdAt", "desc")
    .limit(limit).get();

  const trips = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json({ trips, total: trips.length, page, totalPages: 1 });
});

// PATCH /api/trips/:id/status
router.patch("/:id/status", async (req: Request, res: Response) => {
  const { status, cancelReason } = z.object({
    status: z.string(), cancelReason: z.string().optional(),
  }).parse(req.body);

  const tripRef = db.collection("trips").doc(String(req.params.id));
  const snap = await tripRef.get();
  if (!snap.exists) return res.status(404).json({ error: "Поездка не найдена" });

  const trip = snap.data()!;
  if (trip.clientId !== req.user!.id && trip.driverId !== req.user!.id) return res.status(403).json({ error: "Нет доступа" });

  const allowed = TRANSITIONS[trip.status] || [];
  if (!allowed.includes(status)) return res.status(400).json({ error: `Нельзя: ${trip.status} → ${status}` });

  // GPS-антифрод для DRIVER_ARRIVED
  if (status === "DRIVER_ARRIVED" && trip.driverId) {
    const dSnap = await db.collection("users").doc(trip.driverId).get();
    const dp = dSnap.data()?.driverProfile;
    if (dp?.currentLat && !isWithinRadius(trip.pickupLat, trip.pickupLng, dp.currentLat, dp.currentLng, config.gps.arrivalRadius)) {
      return res.status(400).json({ error: "GPS: вы не в радиусе точки подачи", reason: "NOT_IN_RADIUS" });
    }
  }

  // GPS-антифрод для IN_PROGRESS
  if (status === "IN_PROGRESS" && trip.status !== "PAID") {
    return res.status(400).json({ error: "Сначала оплата" });
  }

  const update: any = { status, updatedAt: FieldValue.serverTimestamp() };
  if (status === "DRIVER_ARRIVED") update.driverArrivedAt = FieldValue.serverTimestamp();
  if (status === "PAID") update.paidAt = FieldValue.serverTimestamp();
  if (status === "IN_PROGRESS") update.startedAt = FieldValue.serverTimestamp();
  if (status === "COMPLETED") {
    update.completedAt = FieldValue.serverTimestamp();
    if (trip.driverId) await db.collection("users").doc(trip.driverId).update({ "driverProfile.driverStatus": "ONLINE" });
  }
  if (status === "CANCELLED") {
    update.cancelledAt = FieldValue.serverTimestamp();
    update.cancelledBy = req.user!.id;
    update.cancelReason = cancelReason || "";
    if (trip.driverId) await db.collection("users").doc(trip.driverId).update({ "driverProfile.driverStatus": "ONLINE" });
    // TrustScore penalty
    const penalty = req.user!.role === "DRIVER" ? -0.15 : -0.10;
    await db.collection("users").doc(req.user!.id).update({ trustScore: FieldValue.increment(penalty) });
  }

  await tripRef.update(update);
  const updated = await tripRef.get();
  res.json({ id: tripRef.id, ...updated.data() });
});

// POST /api/trips/:id/rate
router.post("/:id/rate", async (req: Request, res: Response) => {
  const { score, comment } = z.object({ score: z.number().int().min(1).max(5), comment: z.string().optional() }).parse(req.body);
  const tripId = String(req.params.id);
  const snap = await db.collection("trips").doc(tripId).get();
  if (!snap.exists) return res.status(404).json({ error: "Не найдена" });

  const trip = snap.data()!;
  const ratedId = trip.clientId === req.user!.id ? trip.driverId : trip.clientId;
  if (!ratedId) return res.status(400).json({ error: "Нет второго участника" });

  // Сохраняем оценку
  await db.collection("ratings").add({ tripId, raterId: req.user!.id, ratedId, score, comment: comment || "", createdAt: FieldValue.serverTimestamp() });

  // Обновляем TrustScore
  let delta = 0;
  if (score === 5) delta = 0.01;
  else if (score === 4) delta = 0.005;
  else if (score === 2) delta = -0.03;
  else if (score === 1) delta = -0.05;
  if (delta !== 0) {
    await db.collection("users").doc(ratedId).update({
      trustScore: FieldValue.increment(delta),
      totalRatings: FieldValue.increment(1),
    });
  }

  res.json({ success: true });
});

export default router;
