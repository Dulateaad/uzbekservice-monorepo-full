import { prisma } from '../config/database';
import { logger } from '../config/logger';

// ==================== CONSTANTS ====================

const TRUST_SCORE_BOUNDS = { min: 1.0, max: 5.0 };

// Положительные факторы
const POSITIVE_FACTORS = {
  FIVE_STAR_RATING: +0.01,
  FOUR_STAR_RATING: +0.005,
  CLEAN_STREAK_30_DAYS: +0.05,
  PUNCTUALITY_BONUS: +0.03,
};

// Отрицательные факторы
const NEGATIVE_FACTORS = {
  ONE_STAR_RATING: -0.05,
  TWO_STAR_RATING: -0.03,
  CANCEL_CLIENT: -0.10,
  CANCEL_DRIVER: -0.15,
  NO_SHOW: -0.20,
  RUDE_CHAT: -0.15,
  START_WITHOUT_PAYMENT: -0.50,
  GPS_FRAUD: -0.60,
};

// Пороги для действий
const THRESHOLDS = {
  WARNING: 3.5,      // Предупреждение
  RESTRICTION: 3.0,  // Ограничение функций
  SUSPENSION: 2.5,   // Временная блокировка
  BAN: 2.0,          // Блокировка аккаунта
};

// ==================== CORE FUNCTIONS ====================

export type TrustScoreReason = keyof typeof POSITIVE_FACTORS | keyof typeof NEGATIVE_FACTORS;

/**
 * Обновить TrustScore пользователя
 */
export async function updateTrustScore(
  userId: string,
  reason: TrustScoreReason,
  customDelta?: number
) {
  const trustScore = await prisma.trustScore.findUnique({
    where: { userId },
  });

  if (!trustScore) {
    logger.error(`TrustScore not found for user ${userId}`);
    return null;
  }

  // Определяем дельту
  const allFactors = { ...POSITIVE_FACTORS, ...NEGATIVE_FACTORS };
  const delta = customDelta ?? (allFactors as any)[reason] ?? 0;
  
  if (delta === 0) {
    logger.warn(`Unknown TrustScore reason: ${reason}`);
    return trustScore;
  }

  // Вычисляем новый score
  const newScore = Math.max(
    TRUST_SCORE_BOUNDS.min,
    Math.min(TRUST_SCORE_BOUNDS.max, trustScore.score + delta)
  );

  // Обновляем в транзакции
  const [updated] = await prisma.$transaction([
    prisma.trustScore.update({
      where: { userId },
      data: {
        score: newScore,
        lastUpdatedAt: new Date(),
        // Обновляем счётчики
        ...(reason === 'FIVE_STAR_RATING' && { fiveStarCount: { increment: 1 } }),
        ...(reason.startsWith('CANCEL') && { cancellations: { increment: 1 } }),
        ...(reason === 'NO_SHOW' && { noShows: { increment: 1 } }),
        ...(reason === 'RUDE_CHAT' && { rudeReports: { increment: 1 } }),
        ...(reason === 'GPS_FRAUD' && { fraudAttempts: { increment: 1 } }),
      },
    }),
    prisma.trustScoreHistory.create({
      data: {
        trustScoreId: trustScore.id,
        previousScore: trustScore.score,
        newScore,
        reason,
        delta,
      },
    }),
  ]);

  // Проверяем пороги
  await checkThresholds(userId, newScore);

  logger.info(
    `TrustScore updated: user=${userId}, ${trustScore.score.toFixed(2)} → ${newScore.toFixed(2)} (${reason}, ${delta > 0 ? '+' : ''}${delta})`
  );

  return updated;
}

/**
 * Обработать оценку поездки
 */
export async function processRating(
  tripId: string,
  raterId: string,
  ratedId: string,
  score: number,
  comment?: string
) {
  // Сохраняем оценку
  const rating = await prisma.rating.create({
    data: {
      tripId,
      raterId,
      ratedId,
      score,
      comment,
    },
  });

  // Обновляем TrustScore в зависимости от оценки
  let reason: TrustScoreReason;
  if (score === 5) reason = 'FIVE_STAR_RATING';
  else if (score === 4) reason = 'FOUR_STAR_RATING';
  else if (score === 2) reason = 'TWO_STAR_RATING';
  else if (score === 1) reason = 'ONE_STAR_RATING';
  else return rating; // 3 звезды — нейтрально

  await updateTrustScore(ratedId, reason);

  // Обновляем количество оценок
  await prisma.trustScore.update({
    where: { userId: ratedId },
    data: {
      totalRatings: { increment: 1 },
      totalTrips: { increment: 1 },
    },
  });

  return rating;
}

/**
 * Проверка пороговых значений и автоматические действия
 */
async function checkThresholds(userId: string, score: number) {
  if (score <= THRESHOLDS.BAN) {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'BLOCKED' },
    });
    logger.warn(`User ${userId} BLOCKED — TrustScore ${score}`);
  } else if (score <= THRESHOLDS.SUSPENSION) {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
    });
    logger.warn(`User ${userId} SUSPENDED — TrustScore ${score}`);
  }
}

/**
 * Получить TrustScore пользователя
 */
export async function getUserTrustScore(userId: string) {
  return prisma.trustScore.findUnique({
    where: { userId },
    include: {
      history: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}
