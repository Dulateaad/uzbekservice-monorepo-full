import { MessageType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

// Быстрые шаблоны сообщений
export const QUICK_TEMPLATES = {
  CLIENT: [
    { id: 'coming_out', text: 'Выхожу' },
    { id: 'wait_2min', text: 'Подождите 2 минуты' },
    { id: 'im_here', text: 'Я на месте' },
    { id: 'where_are_you', text: 'Где вы?' },
    { id: 'cancel_please', text: 'Хочу отменить' },
  ],
  DRIVER: [
    { id: 'arriving', text: 'Подъезжаю' },
    { id: 'im_here', text: 'Я на месте' },
    { id: 'waiting', text: 'Ожидаю вас' },
    { id: 'which_entrance', text: 'Какой подъезд?' },
    { id: 'traffic_jam', text: 'Стою в пробке, задержусь' },
  ],
};

/**
 * Отправить сообщение в чат поездки
 */
export async function sendMessage(
  tripId: string,
  senderId: string,
  type: MessageType,
  content: string,
  location?: { lat: number; lng: number }
) {
  // Проверяем доступ к чату
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new AppError(404, 'Поездка не найдена');

  // Проверяем что пользователь — участник
  if (trip.clientId !== senderId && trip.driverId !== senderId) {
    throw new AppError(403, 'Вы не участник этой поездки');
  }

  // Проверяем что чат ещё активен
  const chatActive = isChatActive(trip);
  if (!chatActive) {
    throw new AppError(400, 'Чат закрыт (прошло более 24 часов после поездки)');
  }

  // Проверяем длину голосового сообщения (15 сек макс — проверка на клиенте)
  // Проверяем длину текста
  if (type === 'TEXT' && content.length > 500) {
    throw new AppError(400, 'Сообщение слишком длинное (макс 500 символов)');
  }

  const message = await prisma.chatMessage.create({
    data: {
      tripId,
      senderId,
      type,
      content,
      lat: location?.lat,
      lng: location?.lng,
    },
    include: {
      sender: {
        select: { id: true, firstName: true, role: true },
      },
    },
  });

  return message;
}

/**
 * Получить историю чата
 */
export async function getChatHistory(
  tripId: string,
  userId: string,
  page: number = 1,
  limit: number = 50
) {
  // Проверяем доступ
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new AppError(404, 'Поездка не найдена');
  if (trip.clientId !== userId && trip.driverId !== userId) {
    throw new AppError(403, 'Вы не участник этой поездки');
  }

  const skip = (page - 1) * limit;

  const messages = await prisma.chatMessage.findMany({
    where: { tripId },
    orderBy: { createdAt: 'asc' },
    skip,
    take: limit,
    include: {
      sender: {
        select: { id: true, firstName: true, role: true },
      },
    },
  });

  // Помечаем как прочитанные
  await prisma.chatMessage.updateMany({
    where: {
      tripId,
      senderId: { not: userId },
      isRead: false,
    },
    data: { isRead: true },
  });

  return messages;
}

/**
 * Отправить системное сообщение
 */
export async function sendSystemMessage(tripId: string, content: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || !trip.driverId) return null;

  // Используем ID водителя как отправителя системных сообщений
  return prisma.chatMessage.create({
    data: {
      tripId,
      senderId: trip.driverId, // Будет помечено как SYSTEM type
      type: 'SYSTEM',
      content,
    },
  });
}

/**
 * Проверка активности чата
 * Чат активен во время поездки + 24 часа после
 */
function isChatActive(trip: any): boolean {
  const activeStatuses = [
    'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED',
    'WAITING_PAYMENT', 'PAID', 'IN_PROGRESS',
  ];

  if (activeStatuses.includes(trip.status)) return true;

  // После завершения — 24 часа
  if (trip.status === 'COMPLETED' && trip.completedAt) {
    const hoursSinceCompletion =
      (Date.now() - trip.completedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCompletion <= 24;
  }

  return false;
}
