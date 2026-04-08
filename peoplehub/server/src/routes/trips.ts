import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middleware/auth';
import {
  createTrip,
  updateTripStatus,
  getActiveTrip,
  getTripHistory,
} from '../services/tripService';
import { validateArrival, validateTripStart, validateNoShow } from '../services/gpsAntiFraudService';
import { processRating } from '../services/trustScoreService';
import { calculateTripPrice } from '../utils/pricing';

const router = Router();

// Все роуты требуют авторизацию
router.use(authMiddleware);

// POST /api/trips — Создать заказ (только клиент)
const createTripSchema = z.object({
  pickupLat: z.number(),
  pickupLng: z.number(),
  pickupAddress: z.string().min(1),
  dropoffLat: z.number(),
  dropoffLng: z.number(),
  dropoffAddress: z.string().min(1),
  distanceKm: z.number().positive(),
  estimatedMinutes: z.number().int().positive(),
});

router.post('/', requireRole('CLIENT'), async (req: Request, res: Response) => {
  const data = createTripSchema.parse(req.body);
  const result = await createTrip({
    clientId: req.user!.id,
    ...data,
  });
  res.status(201).json(result);
});

// GET /api/trips/price — Расчёт цены (preview)
const priceSchema = z.object({
  distanceKm: z.coerce.number().positive(),
  estimatedMinutes: z.coerce.number().int().positive(),
});

router.get('/price', async (req: Request, res: Response) => {
  const data = priceSchema.parse(req.query);
  const estimate = calculateTripPrice(data.distanceKm, data.estimatedMinutes);
  res.json(estimate);
});

// GET /api/trips/active — Текущая активная поездка
router.get('/active', async (req: Request, res: Response) => {
  const trip = await getActiveTrip(req.user!.id);
  res.json(trip);
});

// GET /api/trips/history — История поездок
router.get('/history', async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '20'), 10);
  const result = await getTripHistory(req.user!.id, page, limit);
  res.json(result);
});

// PATCH /api/trips/:id/status — Обновить статус
const updateStatusSchema = z.object({
  status: z.enum([
    'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'WAITING_PAYMENT',
    'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
  ]),
  cancelReason: z.string().optional(),
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  const { status, cancelReason } = updateStatusSchema.parse(req.body);
  const tripId = String(req.params.id);
  const userId = req.user!.id;

  // GPS-антифрод валидации
  if (status === 'DRIVER_ARRIVED') {
    const validation = await validateArrival(userId, tripId);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'GPS-валидация не пройдена',
        reason: validation.reason,
      });
    }
  }

  if (status === 'IN_PROGRESS') {
    const validation = await validateTripStart(userId, tripId);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Невозможно начать поездку',
        reason: validation.reason,
      });
    }
  }

  const trip = await updateTripStatus(tripId, userId, status, { cancelReason });
  res.json(trip);
});

// POST /api/trips/:id/no-show — Клиент не вышел
router.post('/:id/no-show', requireRole('DRIVER'), async (req: Request, res: Response) => {
  const tripId = String(req.params.id);
  const validation = await validateNoShow(req.user!.id, tripId);
  
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Нельзя отметить "Не вышел"',
      reason: validation.reason,
    });
  }

  const trip = await updateTripStatus(tripId, req.user!.id, 'CANCELLED', {
    cancelReason: 'NO_SHOW',
  });

  res.json(trip);
});

// POST /api/trips/:id/rate — Оценить поездку
const rateSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

router.post('/:id/rate', async (req: Request, res: Response) => {
  const { score, comment } = rateSchema.parse(req.body);
  const { prisma } = await import('../config/database');

  const trip = await prisma.trip.findUnique({ where: { id: String(req.params.id) } });
  if (!trip) return res.status(404).json({ error: 'Поездка не найдена' });

  // Определяем кого оценивает пользователь
  const raterId = req.user!.id;
  const ratedId = trip.clientId === raterId ? trip.driverId : trip.clientId;

  if (!ratedId) return res.status(400).json({ error: 'Нет второго участника' });

  const rating = await processRating(trip.id, raterId, ratedId, score, comment);
  res.json(rating);
});

export default router;
