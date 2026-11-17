const { Prisma, PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const plans = [
  { type: 'MONTHLY', durationDays: 30, price: new Prisma.Decimal('110000.00') },
  { type: 'QUARTERLY', durationDays: 90, price: new Prisma.Decimal('285000.00') },
  { type: 'SEMIANNUAL', durationDays: 180, price: new Prisma.Decimal('540000.00') },
  { type: 'ANNUAL', durationDays: 365, price: new Prisma.Decimal('960000.00') },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { type: plan.type },
      update: {
        durationDays: plan.durationDays,
        price: plan.price,
      },
      create: plan,
    });
  }
}

main()
  .catch(() => {
    console.error('Error al inicializar el catálogo de planes.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
