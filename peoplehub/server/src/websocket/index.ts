import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../config/logger';
import { redis } from '../config/redis';

let io: Server;

export function initWebSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Аутентификация через JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Не авторизован'));

      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        role: string;
      };

      (socket as any).userId = decoded.userId;
      (socket as any).userRole = decoded.role;
      next();
    } catch {
      next(new Error('Неверный токен'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const role = (socket as any).userRole;

    logger.debug(`WS connected: ${userId} (${role})`);

    // Подписка на обновления своих поездок
    socket.join(`user:${userId}`);

    // Подписка на конкретную поездку
    socket.on('join:trip', (tripId: string) => {
      socket.join(`trip:${tripId}`);
      logger.debug(`User ${userId} joined trip room: ${tripId}`);
    });

    socket.on('leave:trip', (tripId: string) => {
      socket.leave(`trip:${tripId}`);
    });

    // GPS-обновления от водителя (real-time для клиента)
    socket.on('driver:location', async (data: {
      tripId: string;
      lat: number;
      lng: number;
      heading?: number;
    }) => {
      // Транслируем координаты водителя в комнату поездки
      socket.to(`trip:${data.tripId}`).emit('driver:location:update', {
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        timestamp: Date.now(),
      });

      // Кэшируем в Redis для быстрого доступа
      await redis.setex(
        `trip:${data.tripId}:driver_location`,
        60,
        JSON.stringify({ lat: data.lat, lng: data.lng, heading: data.heading })
      );
    });

    // Новое сообщение чата — транслируем
    socket.on('chat:message', (data: {
      tripId: string;
      message: any;
    }) => {
      socket.to(`trip:${data.tripId}`).emit('chat:new_message', data.message);
    });

    // Typing indicator
    socket.on('chat:typing', (data: { tripId: string }) => {
      socket.to(`trip:${data.tripId}`).emit('chat:typing', { userId });
    });

    socket.on('disconnect', () => {
      logger.debug(`WS disconnected: ${userId}`);
    });
  });

  return io;
}

// ==================== EMIT HELPERS ====================

/**
 * Отправить обновление статуса поездки
 */
export function emitTripStatusUpdate(tripId: string, data: any) {
  if (io) {
    io.to(`trip:${tripId}`).emit('trip:status_update', data);
  }
}

/**
 * Отправить уведомление пользователю
 */
export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Отправить новое сообщение в чат поездки
 */
export function emitChatMessage(tripId: string, message: any) {
  if (io) {
    io.to(`trip:${tripId}`).emit('chat:new_message', message);
  }
}

export { io };
