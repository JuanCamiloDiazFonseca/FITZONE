const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const safeSetupErrors = new Set([
  'Define INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD en el entorno.',
  'INITIAL_ADMIN_EMAIL no es válido.',
  'La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.',
  'Ya existe un administrador con ese correo.',
]);

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Define INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD en el entorno.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('INITIAL_ADMIN_EMAIL no es válido.');
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.');
  }

  const existing = await prisma.admin.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error('Ya existe un administrador con ese correo.');

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.admin.create({ data: { email, passwordHash } });
  console.log('Administrador inicial creado.');
}

main()
  .catch((error) => {
    if (error instanceof Error && safeSetupErrors.has(error.message)) {
      console.error(error.message);
    } else {
      console.error('No se pudo crear el administrador inicial.');
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
