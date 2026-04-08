import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || '',

  // Self-hosted Maps (no paid APIs)
  osrmUrl: process.env.OSRM_URL || 'http://localhost:5000',
  nominatimUrl: process.env.NOMINATIM_URL || 'http://localhost:8088',

  // Pricing (in KZT)
  pricing: {
    baseFare: parseInt(process.env.BASE_FARE_KZT || '500', 10),
    perKm: parseInt(process.env.PER_KM_FARE_KZT || '120', 10),
    perMin: parseInt(process.env.PER_MIN_FARE_KZT || '40', 10),
    minFare: parseInt(process.env.MIN_FARE_KZT || '800', 10),
    waitPerMin: parseInt(process.env.WAIT_PER_MIN_KZT || '100', 10),
  },

  // Driver subscription
  driverDailyFee: parseInt(process.env.DRIVER_DAILY_FEE_KZT || '200', 10),

  // GPS Anti-fraud thresholds
  gps: {
    accuracyThreshold: parseInt(process.env.GPS_ACCURACY_THRESHOLD || '30', 10),
    arrivalRadius: parseInt(process.env.ARRIVAL_RADIUS_METERS || '120', 10),
    startRadius: parseInt(process.env.START_RADIUS_METERS || '200', 10),
    arrivalHoldSeconds: parseInt(process.env.ARRIVAL_HOLD_SECONDS || '20', 10),
    maxArrivalSpeed: parseInt(process.env.MAX_ARRIVAL_SPEED_KMH || '8', 10),
    noShowWaitMinutes: parseInt(process.env.NO_SHOW_WAIT_MINUTES || '10', 10),
    maxTimeAfterPaymentMinutes: parseInt(process.env.MAX_TIME_AFTER_PAYMENT_MINUTES || '15', 10),
  },
} as const;
