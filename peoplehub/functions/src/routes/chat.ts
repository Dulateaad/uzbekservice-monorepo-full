import { Router, Request, Response } from "express";
import { z } from "zod";
import { db, FieldValue } from "../config/firebase";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

const TEMPLATES = {
  CLIENT: [
    { id: "coming_out", text: "Выхожу" },
    { id: "wait_2min", text: "Подождите 2 минуты" },
    { id: "im_here", text: "Я на месте" },
    { id: "where_are_you", text: "Где вы?" },
  ],
  DRIVER: [
    { id: "arriving", text: "Подъезжаю" },
    { id: "im_here", text: "Я на месте" },
    { id: "waiting", text: "Ожидаю вас" },
    { id: "which_entrance", text: "Какой подъезд?" },
    { id: "traffic", text: "Стою в пробке, задержусь" },
  ],
};

// GET /api/chat/templates
router.get("/templates", (_req: Request, res: Response) => {
  res.json(TEMPLATES);
});

// GET /api/chat/:tripId
router.get("/:tripId", async (req: Request, res: Response) => {
  const tripId = String(req.params.tripId);
  const snap = await db.collection("trips").doc(tripId).collection("messages")
    .orderBy("createdAt", "asc").limit(100).get();
  const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(messages);
});

// POST /api/chat/:tripId
router.post("/:tripId", async (req: Request, res: Response) => {
  const tripId = String(req.params.tripId);
  const data = z.object({
    type: z.enum(["TEXT", "VOICE", "LOCATION", "TEMPLATE"]),
    content: z.string().min(1).max(500),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).parse(req.body);

  const tripSnap = await db.collection("trips").doc(tripId).get();
  if (!tripSnap.exists) return res.status(404).json({ error: "Поездка не найдена" });
  const trip = tripSnap.data()!;
  if (trip.clientId !== req.user!.id && trip.driverId !== req.user!.id) return res.status(403).json({ error: "Нет доступа" });

  const userSnap = await db.collection("users").doc(req.user!.id).get();
  const u = userSnap.data()!;

  const msgRef = await db.collection("trips").doc(tripId).collection("messages").add({
    senderId: req.user!.id,
    type: data.type,
    content: data.content,
    lat: data.lat || null,
    lng: data.lng || null,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
    sender: { id: req.user!.id, firstName: u.firstName, role: u.role },
  });

  const msgSnap = await msgRef.get();
  res.status(201).json({ id: msgRef.id, ...msgSnap.data() });
});

export default router;
