import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db, FieldValue } from "../config/firebase";
import { config } from "../config";
import { validateTelegramWebAppData, TelegramUser } from "../utils/telegram";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// POST /api/auth/telegram
router.post("/telegram", async (req: Request, res: Response) => {
  const { initData } = z.object({ initData: z.string().min(1) }).parse(req.body);

  let tgUser: TelegramUser;
  if (initData.startsWith("{")) {
    tgUser = JSON.parse(initData); // dev mode
  } else {
    const v = validateTelegramWebAppData(initData);
    if (!v.valid || !v.user) return res.status(401).json({ error: "Неверные данные Telegram" });
    tgUser = v.user;
  }

  const userId = `tg_${tgUser.id}`;
  const userRef = db.collection("users").doc(userId);
  const snap = await userRef.get();
  let isNewUser = false;

  if (!snap.exists) {
    isNewUser = true;
    await userRef.set({
      telegramId: String(tgUser.id),
      telegramName: tgUser.username || null,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name || null,
      phone: null,
      role: "CLIENT",
      status: "ACTIVE",
      codexAccepted: false,
      avatarUrl: tgUser.photo_url || null,
      trustScore: 4.5,
      totalTrips: 0,
      totalRatings: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const userData = isNewUser ? { role: "CLIENT", codexAccepted: false, trustScore: 4.5, firstName: tgUser.first_name, lastName: tgUser.last_name } : snap.data()!;

  const token = jwt.sign({ userId, telegramId: String(tgUser.id), role: userData.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);

  res.json({
    token,
    user: { id: userId, telegramId: String(tgUser.id), firstName: userData.firstName, lastName: userData.lastName, role: userData.role, codexAccepted: userData.codexAccepted, trustScore: userData.trustScore ?? 4.5 },
    isNewUser,
  });
});

// POST /api/auth/register
const regSchema = z.object({
  role: z.enum(["CLIENT", "DRIVER"]),
  phone: z.string().min(10),
  codexAccepted: z.boolean(),
  carBrand: z.string().optional(),
  carModel: z.string().optional(),
  carColor: z.string().optional(),
  carYear: z.number().optional(),
  licensePlate: z.string().optional(),
});

router.post("/register", authMiddleware, async (req: Request, res: Response) => {
  const data = regSchema.parse(req.body);
  if (!data.codexAccepted) return res.status(400).json({ error: "Примите Кодекс PeopleHub" });

  const userRef = db.collection("users").doc(req.user!.id);
  await userRef.update({ role: data.role, phone: data.phone, codexAccepted: true, codexAcceptedAt: FieldValue.serverTimestamp() });

  if (data.role === "DRIVER") {
    if (!data.carBrand || !data.carModel || !data.licensePlate) return res.status(400).json({ error: "Укажите данные авто" });
    await userRef.update({
      "driverProfile.carBrand": data.carBrand,
      "driverProfile.carModel": data.carModel,
      "driverProfile.carColor": data.carColor || "",
      "driverProfile.carYear": data.carYear || 2020,
      "driverProfile.licensePlate": data.licensePlate,
      "driverProfile.driverStatus": "OFFLINE",
      "driverProfile.isVerified": false,
      "driverProfile.subscriptionActive": false,
    });
  }

  const snap = await userRef.get();
  const u = snap.data()!;
  const token = jwt.sign({ userId: req.user!.id, telegramId: u.telegramId, role: data.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);

  res.json({ token, user: { id: req.user!.id, telegramId: u.telegramId, firstName: u.firstName, lastName: u.lastName, role: data.role, codexAccepted: true, trustScore: u.trustScore ?? 4.5 } });
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  const snap = await db.collection("users").doc(req.user!.id).get();
  if (!snap.exists) return res.status(404).json({ error: "Не найден" });
  const u = snap.data()!;
  res.json({
    id: req.user!.id, telegramId: u.telegramId, firstName: u.firstName, lastName: u.lastName, phone: u.phone,
    role: u.role, status: u.status, codexAccepted: u.codexAccepted, avatarUrl: u.avatarUrl,
    trustScore: u.trustScore ?? 4.5,
    driverProfile: u.driverProfile || null,
  });
});

export default router;
