import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Тестовый клиент
  const client = await prisma.user.upsert({
    where: { telegramId: BigInt(12345678) },
    update: {},
    create: {
      telegramId: BigInt(12345678),
      telegramName: 'testclient',
      firstName: 'Алия',
      lastName: 'Тестова',
      phone: '+77771234567',
      role: 'CLIENT',
      codexAccepted: true,
      codexAcceptedAt: new Date(),
      trustScore: {
        create: { score: 4.7, totalTrips: 15, totalRatings: 12 },
      },
    },
  });

  // Тестовый водитель
  const driver = await prisma.user.upsert({
    where: { telegramId: BigInt(87654321) },
    update: {},
    create: {
      telegramId: BigInt(87654321),
      telegramName: 'testdriver',
      firstName: 'Ерлан',
      lastName: 'Водителев',
      phone: '+77779876543',
      role: 'DRIVER',
      codexAccepted: true,
      codexAcceptedAt: new Date(),
      trustScore: {
        create: { score: 4.8, totalTrips: 120, totalRatings: 98 },
      },
      driverProfile: {
        create: {
          carBrand: 'Toyota',
          carModel: 'Camry',
          carColor: 'Белый',
          carYear: 2021,
          licensePlate: 'A 123 BCD',
          driverStatus: 'OFFLINE',
          isVerified: true,
          subscriptionActive: true,
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          currentLat: 43.238949,
          currentLng: 76.945465,
        },
      },
    },
  });

  console.log('✅ Seed completed');
  console.log(`   Client: ${client.firstName} (TG: ${client.telegramId})`);
  console.log(`   Driver: ${driver.firstName} (TG: ${driver.telegramId})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
