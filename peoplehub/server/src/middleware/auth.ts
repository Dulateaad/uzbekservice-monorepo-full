import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';

export interface AuthUser {
  id: string;
  telegramId: bigint;
  role: 'CLIENT' | 'DRIVER';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Токен авторизации не предоставлен' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      telegramId: string;
      role: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, telegramId: true, role: true, status: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    if (user.status === 'BLOCKED') {
      return res.status(403).json({ error: 'Аккаунт заблокирован' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Аккаунт временно приостановлен' });
    }

    req.user = {
      id: user.id,
      telegramId: user.telegramId,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Токен истёк' });
    }
    return res.status(401).json({ error: 'Неверный токен' });
  }
}

export function requireRole(...roles: Array<'CLIENT' | 'DRIVER'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}
