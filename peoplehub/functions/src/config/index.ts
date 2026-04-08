export const config = {
  jwtSecret: process.env.JWT_SECRET || "peoplehub-jwt-secret-change-in-prod",
  jwtExpiresIn: "30d",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",

  pricing: {
    baseFare: 500,
    perKm: 120,
    perMin: 40,
    minFare: 800,
    waitPerMin: 100,
  },

  driverDailyFee: 200,

  gps: {
    accuracyThreshold: 30,
    arrivalRadius: 120,
    startRadius: 200,
    arrivalHoldSeconds: 20,
    maxArrivalSpeed: 8,
    noShowWaitMinutes: 10,
    maxTimeAfterPaymentMinutes: 15,
  },
};
