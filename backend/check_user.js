const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const email = 'dmeliansalem@gmail.com';
  const user = await prisma.usuario.findUnique({ where: { email } });
  if (user) {
    console.log(`Usuario encontrado: ${JSON.stringify(user, null, 2)}`);
  } else {
    console.log(`Usuario NO encontrado: ${email}`);
  }
  const allUsers = await prisma.usuario.findMany({ select: { email: true } });
  console.log(`Todos los emails registrados: ${allUsers.map(u => u.email).join(', ')}`);
  process.exit(0);
}

checkUser();
