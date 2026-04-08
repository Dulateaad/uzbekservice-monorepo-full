import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config';
import { validateTelegramWebAppData, TelegramUser } from '../utils/telegram';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

export interface AuthResult {
  token: string;
  user: {
    id: string;
    telegramId: string;
    firstName: string;
    lastName?: string;
    role: string;
    codexAccepted: boolean;
    trustScore: number;
  };
  isNewUser: boolean;
}

/**
 * Авторизация через Telegram WebApp initData
 */
export async function authenticateWithTelegram(initData: string): Promise<AuthResult> {
  // В development режиме можно пропустить проверку подписи
  let telegramUser: TelegramUser;

  if (config.nodeEnv === 'development' && initData.startsWith('{')) {
    // Dev mode: принимаем JSON напрямую
    telegramUser = JSON.parse(initData);
  } else {
    const validation = validateTelegramWebAppData(initData);
    if (!validation.valid || !validation.user) {
      throw new AppError(401, 'Неверные данные Telegram');
    }
    telegramUser = validation.user;
  }

  // Ищем существующего пользователя
  let user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramUser.id) },
    include: { trustScore: true },
  });

  let isNewUser = false;

  if (!user) {
    // Создаём нового пользователя (роль выберет позже)
    isNewUser = true;
    user = await prisma.user.create({
      data: {
        telegramId: BigInt(telegramUser.id),
        telegramName: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        avatarUrl: telegramUser.photo_url,
        role: 'CLIENT', // По умолчанию, изменит при регистрации
        trustScore: {
          create: {
            score: 4.5,
          },
        },
      },
      include: { trustScore: true },
    });

    logger.info(`New user registered: ${user.id} (TG: ${telegramUser.id})`);
  }

  // Генерируем JWT
  const token = jwt.sign(
    {
      userId: user.id,
      telegramId: user.telegramId.toString(),
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );

  return {
    token,
    user: {
      id: user.id,
      telegramId: user.telegramId.toString(),
      firstName: user.firstName,
      lastName: user.lastName || undefined,
      role: user.role,
      codexAccepted: user.codexAccepted,
      trustScore: user.trustScore?.score ?? 4.5,
    },
    isNewUser,
  };
}

/**
 * Выбор роли и принятие кодекса
 */
export async function completeRegistration(
  userId: string,
  data: {
    role: 'CLIENT' | 'DRIVER';
    phone: string;
    codexAccepted: boolean;
    // Для водителей
    carBrand?: string;
    carModel?: string;
    carColor?: string;
    carYear?: number;
    licensePlate?: string;
  }
) {
  if (!data.codexAccepted) {
    throw new AppError(400, 'Необходимо принять Кодекс PeopleHub');
  }

  const updateData: any = {
    role: data.role,
    phone: data.phone,
    codexAccepted: true,
    codexAcceptedAt: new Date(),
  };

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    include: { trustScore: true },
  });

  // Если водитель — создаём профиль
  if (data.role === 'DRIVER') {
    if (!data.carBrand || !data.carModel || !data.carColor || !data.carYear || !data.licensePlate) {
      throw new AppError(400, 'Для водителя необходимо указать данные автомобиля');
    }

    await prisma.driverProfile.create({
      data: {
        userId: user.id,
        carBrand: data.carBrand,
        carModel: data.carModel,
        carColor: data.carColor,
        carYear: data.carYear,
        licensePlate: data.licensePlate,
      },
    });
  }

  // Обновляем JWT
  const token = jwt.sign(
    {
      userId: user.id,
      telegramId: user.telegramId.toString(),
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );

  return {
    token,
    user: {
      id: user.id,
      telegramId: user.telegramId.toString(),
      firstName: user.firstName,
      lastName: user.lastName || undefined,
      role: user.role,
      codexAccepted: user.codexAccepted,
      trustScore: user.trustScore?.score ?? 4.5,
    },
  };
}
