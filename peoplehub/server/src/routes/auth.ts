import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateWithTelegram, completeRegistration } from '../services/authService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/auth/telegram — Авторизация через Telegram WebApp
const telegramAuthSchema = z.object({
  initData: z.string().min(1),
});

router.post('/telegram', async (req: Request, res: Response) => {
  const { initData } = telegramAuthSchema.parse(req.body);
  const result = await authenticateWithTelegram(initData);
  res.json(result);
});

// POST /api/auth/register — Завершение регистрации (выбор роли + кодекс)
const registerSchema = z.object({
  role: z.enum(['CLIENT', 'DRIVER']),
  phone: z.string().min(10).max(15),
  codexAccepted: z.boolean(),
  // Для водителей
  carBrand: z.string().optional(),
  carModel: z.string().optional(),
  carColor: z.string().optional(),
  carYear: z.number().int().min(1990).max(2030).optional(),
  licensePlate: z.string().optional(),
});

router.post('/register', authMiddleware, async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);
  const result = await completeRegistration(req.user!.id, data);
  res.json(result);
});

// GET /api/auth/me — Текущий пользователь
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const { prisma } = await import('../config/database');
  
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      trustScore: true,
      driverProfile: true,
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  res.json({
    id: user.id,
    telegramId: user.telegramId.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    codexAccepted: user.codexAccepted,
    avatarUrl: user.avatarUrl,
    trustScore: user.trustScore?.score ?? 4.5,
    driverProfile: user.driverProfile ? {
      carBrand: user.driverProfile.carBrand,
      carModel: user.driverProfile.carModel,
      carColor: user.driverProfile.carColor,
      carYear: user.driverProfile.carYear,
      licensePlate: user.driverProfile.licensePlate,
      driverStatus: user.driverProfile.driverStatus,
      isVerified: user.driverProfile.isVerified,
      subscriptionActive: user.driverProfile.subscriptionActive,
    } : null,
  });
});

export default router;
