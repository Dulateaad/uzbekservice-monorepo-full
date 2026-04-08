import { TripStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { calculateTripPrice } from '../utils/pricing';
import { haversineDistance } from '../utils/geo';

// ==================== СОЗДАНИЕ ЗАКАЗА ====================

export interface CreateTripInput {
  clientId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress: string;
  distanceKm: number;
  estimatedMinutes: number;
}

export async function createTrip(input: CreateTripInput) {
  // Проверяем, нет ли уже активной поездки
  const activeTrip = await prisma.trip.findFirst({
    where: {
      clientId: input.clientId,
      status: {
        in: ['SEARCHING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'WAITING_PAYMENT', 'PAID', 'IN_PROGRESS'],
      },
    },
  });

  if (activeTrip) {
    throw new AppError(400, 'У вас уже есть активная поездка');
  }

  // Рассчитываем цену
  const priceEstimate = calculateTripPrice(input.distanceKm, input.estimatedMinutes);

  const trip = await prisma.trip.create({
    data: {
      clientId: input.clientId,
      pickupLat: input.pickupLat,
      pickupLng: input.pickupLng,
      pickupAddress: input.pickupAddress,
      dropoffLat: input.dropoffLat,
      dropoffLng: input.dropoffLng,
      dropoffAddress: input.dropoffAddress,
      distanceKm: input.distanceKm,
      estimatedMinutes: input.estimatedMinutes,
      price: priceEstimate.price,
      status: 'SEARCHING',
    },
  });

  // Ищем водителя
  await findAndAssignDriver(trip.id, input.pickupLat, input.pickupLng);

  return {
    trip,
    priceEstimate,
  };
}

// ==================== ПОИСК ВОДИТЕЛЯ ====================

async function findAndAssignDriver(tripId: string, pickupLat: number, pickupLng: number) {
  // Находим онлайн водителей с активной подпиской
  const availableDrivers = await prisma.driverProfile.findMany({
    where: {
      driverStatus: 'ONLINE',
      isVerified: true,
      subscriptionActive: true,
      currentLat: { not: null },
      currentLng: { not: null },
    },
    include: {
      user: {
        include: { trustScore: true },
      },
    },
  });

  if (availableDrivers.length === 0) {
    // Помечаем что водитель не найден (подождём, клиент может повторить)
    logger.info(`No drivers available for trip ${tripId}`);
    
    // Через 60 секунд если водитель не найден — отменяем
    setTimeout(async () => {
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (trip && trip.status === 'SEARCHING') {
        await prisma.trip.update({
          where: { id: tripId },
          data: { status: 'NO_DRIVER' },
        });
      }
    }, 60000);
    
    return null;
  }

  // Сортируем по: расстояние до клиента + TrustScore
  const driversWithDistance = availableDrivers
    .map((d) => ({
      driver: d,
      distance: haversineDistance(pickupLat, pickupLng, d.currentLat!, d.currentLng!),
      trustScore: d.user.trustScore?.score ?? 4.0,
    }))
    .filter((d) => d.distance <= d.driver.maxRadius * 1000) // В пределах радиуса
    .sort((a, b) => {
      // Комбинированная сортировка: 70% расстояние + 30% TrustScore
      const distScoreA = a.distance / 1000; // нормализуем в км
      const distScoreB = b.distance / 1000;
      const trustA = (5 - a.trustScore) * 3; // инвертируем и масштабируем
      const trustB = (5 - b.trustScore) * 3;
      return (distScoreA + trustA) - (distScoreB + trustB);
    });

  if (driversWithDistance.length === 0) {
    logger.info(`No drivers within radius for trip ${tripId}`);
    return null;
  }

  // Назначаем ближайшего подходящего водителя
  const bestDriver = driversWithDistance[0];
  
  await prisma.$transaction([
    prisma.trip.update({
      where: { id: tripId },
      data: {
        driverId: bestDriver.driver.userId,
        status: 'DRIVER_ASSIGNED',
        driverAssignedAt: new Date(),
      },
    }),
    prisma.driverProfile.update({
      where: { id: bestDriver.driver.id },
      data: { driverStatus: 'BUSY' },
    }),
  ]);

  // Кэшируем данные поездки в Redis для real-time
  await redis.setex(`trip:${tripId}:driver`, 3600, bestDriver.driver.userId);

  logger.info(`Driver ${bestDriver.driver.userId} assigned to trip ${tripId}`);
  return bestDriver.driver;
}

// ==================== ОБНОВЛЕНИЕ СТАТУСА ПОЕЗДКИ ====================

export async function updateTripStatus(
  tripId: string,
  userId: string,
  newStatus: TripStatus,
  extra?: { cancelReason?: string }
) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      driver: { include: { driverProfile: true } },
    },
  });

  if (!trip) {
    throw new AppError(404, 'Поездка не найдена');
  }

  // Проверяем что пользователь участник поездки
  if (trip.clientId !== userId && trip.driverId !== userId) {
    throw new AppError(403, 'Вы не участник этой поездки');
  }

  // FSM: Валидация переходов
  validateStatusTransition(trip.status, newStatus, userId === trip.driverId);

  const updateData: any = { status: newStatus };

  switch (newStatus) {
    case 'DRIVER_ARRIVING':
      // Водитель начал движение к клиенту
      break;

    case 'DRIVER_ARRIVED':
      updateData.driverArrivedAt = new Date();
      break;

    case 'PAID':
      updateData.paidAt = new Date();
      break;

    case 'IN_PROGRESS':
      updateData.startedAt = new Date();
      break;

    case 'COMPLETED':
      updateData.completedAt = new Date();
      // Рассчитать фактическое время
      if (trip.startedAt) {
        updateData.actualMinutes = Math.ceil(
          (Date.now() - trip.startedAt.getTime()) / (1000 * 60)
        );
      }
      // Освобождаем водителя
      if (trip.driver?.driverProfile) {
        await prisma.driverProfile.update({
          where: { id: trip.driver.driverProfile.id },
          data: { driverStatus: 'ONLINE' },
        });
      }
      break;

    case 'CANCELLED':
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = userId;
      updateData.cancelReason = extra?.cancelReason || 'Без причины';
      // Освобождаем водителя
      if (trip.driver?.driverProfile) {
        await prisma.driverProfile.update({
          where: { id: trip.driver.driverProfile.id },
          data: { driverStatus: 'ONLINE' },
        });
      }
      break;
  }

  const updatedTrip = await prisma.trip.update({
    where: { id: tripId },
    data: updateData,
    include: {
      client: { select: { id: true, firstName: true, telegramId: true } },
      driver: { select: { id: true, firstName: true, telegramId: true } },
    },
  });

  return updatedTrip;
}

// ==================== FSM ПЕРЕХОДОВ СТАТУСОВ ====================

const VALID_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  SEARCHING: ['DRIVER_ASSIGNED', 'CANCELLED', 'NO_DRIVER'],
  DRIVER_ASSIGNED: ['DRIVER_ARRIVING', 'CANCELLED'],
  DRIVER_ARRIVING: ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED: ['WAITING_PAYMENT', 'CANCELLED'],
  WAITING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_DRIVER: ['SEARCHING'], // Можно повторить поиск
};

function validateStatusTransition(
  current: TripStatus,
  next: TripStatus,
  isDriver: boolean
) {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new AppError(
      400,
      `Невозможно перейти из "${current}" в "${next}"`
    );
  }
}

// ==================== ПОЛУЧЕНИЕ ПОЕЗДОК ====================

export async function getActiveTrip(userId: string) {
  return prisma.trip.findFirst({
    where: {
      OR: [{ clientId: userId }, { driverId: userId }],
      status: {
        in: ['SEARCHING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'WAITING_PAYMENT', 'PAID', 'IN_PROGRESS'],
      },
    },
    include: {
      client: {
        select: {
          id: true, firstName: true, lastName: true, phone: true,
          trustScore: { select: { score: true } },
        },
      },
      driver: {
        select: {
          id: true, firstName: true, lastName: true, phone: true,
          trustScore: { select: { score: true } },
          driverProfile: {
            select: {
              carBrand: true, carModel: true, carColor: true, licensePlate: true,
              currentLat: true, currentLng: true,
            },
          },
        },
      },
    },
  });
}

export async function getTripHistory(userId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;

  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where: {
        OR: [{ clientId: userId }, { driverId: userId }],
        status: { in: ['COMPLETED', 'CANCELLED'] },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        client: { select: { id: true, firstName: true } },
        driver: { select: { id: true, firstName: true } },
        ratings: true,
      },
    }),
    prisma.trip.count({
      where: {
        OR: [{ clientId: userId }, { driverId: userId }],
        status: { in: ['COMPLETED', 'CANCELLED'] },
      },
    }),
  ]);

  return { trips, total, page, limit, totalPages: Math.ceil(total / limit) };
}
