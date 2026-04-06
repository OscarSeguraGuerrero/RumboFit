import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ejercicios = [
    {
      nombre: 'Sentadilla',
      descripcion: 'Ejercicio compuesto para tren inferior. Implica extensión de cadera y rodilla.',
      grupo_muscular: 'Piernas'
    },
    {
      nombre: 'Press de Banca',
      descripcion: 'Ejercicio compuesto para tren superior. Trabaja pectorales y tríceps.',
      grupo_muscular: 'Pecho'
    },
    {
      nombre: 'Peso Muerto',
      descripcion: 'Ejercicio compuesto fundamental. Fortalece cadena posterior.',
      grupo_muscular: 'Espalda'
    },
    {
      nombre: 'Dominadas',
      descripcion: 'Ejercicio de tirón vertical. Excelente para dorsales.',
      grupo_muscular: 'Espalda'
    },
    {
      nombre: 'Press Militar',
      descripcion: 'Ejercicio de empuje vertical para hombros.',
      grupo_muscular: 'Hombros'
    }
  ];

  for (const ej of ejercicios) {
    await prisma.ejercicio.upsert({
      where: { nombre: ej.nombre },
      update: {},
      create: ej,
    });
  }
  console.log('Seed exitoso: Ejercicios iniciales creados.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
