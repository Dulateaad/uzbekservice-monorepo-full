import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { config } from '../config';
import { logger } from '../config/logger';
import { haversineDistance, calculateSpeed, isWithinRadius } from '../utils/geo';
import { updateTrustScore } from './trustScoreService';
import { FraudType, FraudSeverity } from '@prisma/client';

// ==================== GPS LOCATION PROCESSING ====================

export interface GpsPoint {
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  isMockLocation?: boolean;
  timestamp: number;
}

/**
 * Обработка GPS-точки от водителя
 */
export async function processGpsUpdate(
  userId: string,
  tripId: string | null,
  point: GpsPoint
) {
  // 1. Фильтрация по точности
  if (point.accuracy > config.gps.accuracyThreshold) {
    logger.debug(`GPS point rejected: accuracy ${point.accuracy}m > ${config.gps.accuracyThreshold}m`);
    return { accepted: false, reason: 'LOW_ACCURACY' };
  }

  // 2. Детект mock location
  if (point.isMockLocation) {
    await logFraud(userId, tripId, 'GPS_SPOOF', 'CRITICAL', 'Mock location detected', {
      point,
    });
    await updateTrustScore(userId, 'GPS_FRAUD');
    return { accepted: false, reason: 'MOCK_LOCATION' };
  }

  // 3. Проверка аномальной скорости (телепортация)
  const lastPoint = await getLastGpsPoint(userId);
  if (lastPoint) {
    const speed = calculateSpeed(
      lastPoint.lat, lastPoint.lng, new Date(lastPoint.timestamp),
      point.lat, point.lng, new Date(point.timestamp)
    );

    // Если скорость > 200 км/ч — подозрительно
    if (speed > 200) {
      await logFraud(userId, tripId, 'GPS_SPOOF', 'HIGH', `Anomalous speed: ${speed.toFixed(1)} km/h`, {
        lastPoint,
        currentPoint: point,
        calculatedSpeed: speed,
      });
      return { accepted: false, reason: 'SPEED_ANOMALY' };
    }
  }

  // 4. Сохраняем точку
  await prisma.locationLog.create({
    data: {
      userId,
      tripId,
      lat: point.lat,
      lng: point.lng,
      accuracy: point.accuracy,
      speed: point.speed,
      heading: point.heading,
      isMockLocation: point.isMockLocation || false,
    },
  });

  // 5. Кэшируем последнюю точку в Redis
  await redis.setex(
    `gps:last:${userId}`,
    300,
    JSON.stringify({ ...point })
  );

  // 6. Обновляем позицию водителя
  await prisma.driverProfile.updateMany({
    where: { userId },
    data: {
      currentLat: point.lat,
      currentLng: point.lng,
      lastLocationAt: new Date(),
    },
  });

  return { accepted: true };
}

// ==================== EVENT VALIDATION ====================

/**
 * Валидация события "ARRIVED" (Водитель на месте)
 * Условия: в радиусе 120м, удержание ≥ 20 сек, скорость ≤ 8 км/ч
 */
export async function validateArrival(
  driverUserId: string,
  tripId: string
): Promise<{ valid: boolean; reason?: string }> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { valid: false, reason: 'TRIP_NOT_FOUND' };

  // Получаем последние GPS-точки водителя (за последние 30 секунд)
  const recentPoints = await prisma.locationLog.findMany({
    where: {
      userId: driverUserId,
      createdAt: { gte: new Date(Date.now() - 30000) },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (recentPoints.length === 0) {
    return { valid: false, reason: 'NO_GPS_DATA' };
  }

  const latestPoint = recentPoints[0];

  // Проверка радиуса
  if (!isWithinRadius(trip.pickupLat, trip.pickupLng, latestPoint.lat, latestPoint.lng, config.gps.arrivalRadius)) {
    await logFraud(driverUserId, tripId, 'FAKE_ARRIVAL', 'MEDIUM', 
      `Driver not within ${config.gps.arrivalRadius}m of pickup`, {
        driverLat: latestPoint.lat,
        driverLng: latestPoint.lng,
        pickupLat: trip.pickupLat,
        pickupLng: trip.pickupLng,
        distance: haversineDistance(trip.pickupLat, trip.pickupLng, latestPoint.lat, latestPoint.lng),
      });
    return { valid: false, reason: 'NOT_IN_RADIUS' };
  }

  // Проверка удержания (≥ 20 сек в зоне)
  const pointsInZone = recentPoints.filter((p) =>
    isWithinRadius(trip.pickupLat, trip.pickupLng, p.lat, p.lng, config.gps.arrivalRadius)
  );

  if (pointsInZone.length < 2) {
    return { valid: false, reason: 'HOLD_TOO_SHORT' };
  }

  const firstInZone = pointsInZone[pointsInZone.length - 1];
  const holdDuration = (Date.now() - firstInZone.createdAt.getTime()) / 1000;
  
  if (holdDuration < config.gps.arrivalHoldSeconds) {
    return { valid: false, reason: 'HOLD_TOO_SHORT' };
  }

  // Проверка скорости
  if (latestPoint.speed && latestPoint.speed > config.gps.maxArrivalSpeed) {
    return { valid: false, reason: 'SPEED_TOO_HIGH' };
  }

  return { valid: true };
}

/**
 * Валидация события "START TRIP" (Начало поездки)
 * Условия: после оплаты, в радиусе 200м, не более 15 мин после оплаты
 */
export async function validateTripStart(
  driverUserId: string,
  tripId: string
): Promise<{ valid: boolean; reason?: string }> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { valid: false, reason: 'TRIP_NOT_FOUND' };

  // Проверка оплаты
  if (trip.status !== 'PAID') {
    await logFraud(driverUserId, tripId, 'FAKE_START', 'HIGH', 'Attempted start without payment');
    return { valid: false, reason: 'NOT_PAID' };
  }

  // Проверка времени после оплаты
  if (trip.paidAt) {
    const minutesSincePayment = (Date.now() - trip.paidAt.getTime()) / (1000 * 60);
    if (minutesSincePayment > config.gps.maxTimeAfterPaymentMinutes) {
      return { valid: false, reason: 'PAYMENT_EXPIRED' };
    }
  }

  // Проверка геолокации
  const lastPoint = await getLastGpsPoint(driverUserId);
  if (lastPoint) {
    if (!isWithinRadius(trip.pickupLat, trip.pickupLng, lastPoint.lat, lastPoint.lng, config.gps.startRadius)) {
      return { valid: false, reason: 'NOT_IN_RADIUS' };
    }
  }

  return { valid: true };
}

/**
 * Валидация "Клиент не вышел"
 * Условие: 10 минут реального ожидания в геозоне
 */
export async function validateNoShow(
  driverUserId: string,
  tripId: string
): Promise<{ valid: boolean; reason?: string }> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || !trip.driverArrivedAt) {
    return { valid: false, reason: 'NOT_ARRIVED' };
  }

  // Проверка что прошло >= 10 минут
  const waitMinutes = (Date.now() - trip.driverArrivedAt.getTime()) / (1000 * 60);
  if (waitMinutes < config.gps.noShowWaitMinutes) {
    return { valid: false, reason: `WAIT_${Math.ceil(config.gps.noShowWaitMinutes - waitMinutes)}_MIN_MORE` };
  }

  // Проверка что водитель был в зоне всё это время
  const arrivalTime = trip.driverArrivedAt;
  const pointsInPeriod = await prisma.locationLog.findMany({
    where: {
      userId: driverUserId,
      createdAt: { gte: arrivalTime },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Минимум 80% точек должны быть в радиусе
  const pointsInZone = pointsInPeriod.filter((p) =>
    isWithinRadius(trip.pickupLat, trip.pickupLng, p.lat, p.lng, config.gps.arrivalRadius)
  );

  const inZoneRatio = pointsInPeriod.length > 0
    ? pointsInZone.length / pointsInPeriod.length
    : 0;

  if (inZoneRatio < 0.8) {
    await logFraud(driverUserId, tripId, 'FAKE_NO_SHOW', 'HIGH', 
      `Driver left zone during wait: ${(inZoneRatio * 100).toFixed(0)}% in zone`, {
        totalPoints: pointsInPeriod.length,
        inZonePoints: pointsInZone.length,
        inZoneRatio,
      });
    return { valid: false, reason: 'LEFT_ZONE' };
  }

  return { valid: true };
}

// ==================== HELPERS ====================

async function getLastGpsPoint(userId: string): Promise<GpsPoint | null> {
  const cached = await redis.get(`gps:last:${userId}`);
  if (cached) return JSON.parse(cached);
  return null;
}

async function logFraud(
  userId: string,
  tripId: string | null,
  type: FraudType,
  severity: FraudSeverity,
  description: string,
  metadata?: any
) {
  await prisma.fraudLog.create({
    data: {
      userId,
      tripId,
      type,
      severity,
      description,
      metadata: metadata || undefined,
    },
  });

  logger.warn(`🚨 FRAUD: ${type} | user=${userId} | trip=${tripId} | ${description}`);
}
