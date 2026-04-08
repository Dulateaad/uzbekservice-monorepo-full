import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';

import { config } from './config';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { initWebSocket } from './websocket';

// Routes
import authRoutes from './routes/auth';
import tripRoutes from './routes/trips';
import driverRoutes from './routes/driver';
import chatRoutes from './routes/chat';

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/trips', tripRoutes);
  app.use('/api/driver', driverRoutes);
  app.use('/api/chat', chatRoutes);

  // Error handler
  app.use(errorHandler);

  // WebSocket
  initWebSocket(server);

  // Database
  await connectDatabase();

  // Start
  server.listen(config.port, () => {
    logger.info(`
╔══════════════════════════════════════════════╗
║          🚖 PeopleHub API Server             ║
║──────────────────────────────────────────────║
║  Port:    ${String(config.port).padEnd(35)}║
║  Env:     ${config.nodeEnv.padEnd(35)}║
║  WS:      enabled${' '.repeat(28)}║
╚══════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    server.close();
    const { disconnectDatabase } = await import('./config/database');
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
