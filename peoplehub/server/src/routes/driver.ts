import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middleware/auth';
import { prisma } from '../config/database';
import { processGpsUpdate, GpsPoint } from '../services/gpsAntiFraudService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Все роуты только для водителей
router.use(authMiddleware);
router.use(requireRole('DRIVER'));

// POST /api/driver/go-online — Выйти на линию
router.post('/go-online', async (req: Request, res: Response) => {
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!profile) throw new AppError(404, 'Профиль водителя не найден');
  if (!profile.subscriptionActive) {
    throw new AppError(402, 'Активируйте абонентку (200 тг/день) для приёма заказов');
  }

  await prisma.driverProfile.update({
    where: { id: profile.id },
    data: { driverStatus: 'ONLINE' },
  });

  res.json({ status: 'ONLINE' });
});

// POST /api/driver/go-offline — Уйти с линии
router.post('/go-offline', async (req: Request, res: Response) => {
  // Проверяем нет ли активной поездки
  const activeTrip = await prisma.trip.findFirst({
    where: {
      driverId: req.user!.id,
      status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'PAID', 'IN_PROGRESS'] },
    },
  });

  if (activeTrip) {
    throw new AppError(400, 'Нельзя уйти с линии во время поездки');
  }

  await prisma.driverProfile.updateMany({
    where: { userId: req.user!.id },
    data: { driverStatus: 'OFFLINE' },
  });

  res.json({ status: 'OFFLINE' });
});

// POST /api/driver/location — Отправка GPS-координат
const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  isMockLocation: z.boolean().optional(),
  timestamp: z.number(),
});

router.post('/location', async (req: Request, res: Response) => {
  const point: GpsPoint = locationSchema.parse(req.body);

  // Проверяем есть ли активная поездка
  const activeTrip = await prisma.trip.findFirst({
    where: {
      driverId: req.user!.id,
      status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'PAID', 'IN_PROGRESS'] },
    },
  });

  const result = await processGpsUpdate(
    req.user!.id,
    activeTrip?.id || null,
    point
  );

  res.json(result);
});

// POST /api/driver/subscribe — Активировать абонентку
router.post('/subscribe', async (req: Request, res: Response) => {
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!profile) throw new AppError(404, 'Профиль водителя не найден');

  // Рассчитываем новую дату окончания
  const now = new Date();
  const currentExpiry = profile.subscriptionExpiresAt;
  const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000); // +1 день

  await prisma.$transaction([
    prisma.driverProfile.update({
      where: { id: profile.id },
      data: {
        subscriptionActive: true,
        subscriptionExpiresAt: newExpiry,
      },
    }),
    prisma.driverSubscription.create({
      data: {
        driverProfileId: profile.id,
        amount: 200,
        paidAt: now,
        expiresAt: newExpiry,
      },
    }),
  ]);

  res.json({
    subscriptionActive: true,
    expiresAt: newExpiry.toISOString(),
  });
});

// GET /api/driver/stats — Статистика водителя
router.get('/stats', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [totalTrips, todayTrips, totalEarnings, todayEarnings, trustScore] = await Promise.all([
    prisma.trip.count({
      where: { driverId: userId, status: 'COMPLETED' },
    }),
    prisma.trip.count({
      where: {
        driverId: userId,
        status: 'COMPLETED',
        completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.trip.aggregate({
      where: { driverId: userId, status: 'COMPLETED' },
      _sum: { price: true },
    }),
    prisma.trip.aggregate({
      where: {
        driverId: userId,
        status: 'COMPLETED',
        completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { price: true },
    }),
    prisma.trustScore.findUnique({ where: { userId } }),
  ]);

  res.json({
    totalTrips,
    todayTrips,
    totalEarnings: totalEarnings._sum.price || 0,
    todayEarnings: todayEarnings._sum.price || 0,
    trustScore: trustScore?.score ?? 4.5,
  });
});

// GET /api/driver/profile — Профиль водителя
router.get('/profile', async (req: Request, res: Response) => {
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: req.user!.id },
    include: {
      user: {
        include: { trustScore: true },
      },
    },
  });

  if (!profile) throw new AppError(404, 'Профиль водителя не найден');

  res.json({
    ...profile,
    trustScore: profile.user.trustScore?.score ?? 4.5,
  });
});

export default router;
