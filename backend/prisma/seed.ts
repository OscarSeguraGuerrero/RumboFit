import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ejercicios = [
    // --- PECHO ---
    { nombre: 'Press de Banca Plano', grupo_muscular: 'Pecho', descripcion: 'Ejercicio compuesto principal con barra plana.' },
    { nombre: 'Press de Banca Inclinado', grupo_muscular: 'Pecho', descripcion: 'Variante con banco inclinado para énfasis en haz clavicular.' },
    { nombre: 'Aperturas con Mancuernas', grupo_muscular: 'Pecho', descripcion: 'Ejercicio de aislamiento para pectoral en banco plano.' },
    { nombre: 'Cruce de Poleas', grupo_muscular: 'Pecho', descripcion: 'Ejercicio de tensión continua en polea alta.' },
    { nombre: 'Flexiones (Push-ups)', grupo_muscular: 'Pecho', descripcion: 'Ejercicio con peso corporal para empuje horizontal.' },

    // --- ESPALDA ---
    { nombre: 'Dominadas', grupo_muscular: 'Espalda', descripcion: 'Tracción vertical con peso corporal.' },
    { nombre: 'Jalón al Pecho', grupo_muscular: 'Espalda', descripcion: 'Tracción vertical en máquina de polea.' },
    { nombre: 'Remo con Barra', grupo_muscular: 'Espalda', descripcion: 'Tracción horizontal pesada con barra.' },
    { nombre: 'Remo Gironda', grupo_muscular: 'Espalda', descripcion: 'Tracción horizontal en polea baja.' },
    { nombre: 'Peso Muerto', grupo_muscular: 'Espalda/Piernas', descripcion: 'Levantamiento compuesto pesado desde el suelo.' },

    // --- PIERNAS ---
    { nombre: 'Sentadilla Libre', grupo_muscular: 'Piernas', descripcion: 'Flexión profunda de rodillas con barra en la espalda.' },
    { nombre: 'Prensa de Piernas', grupo_muscular: 'Piernas', descripcion: 'Empuje de piernas en máquina a 45 grados.' },
    { nombre: 'Zancadas (Lunges)', grupo_muscular: 'Piernas', descripcion: 'Flexión de piernas unilateral con mancuernas.' },
    { nombre: 'Peso Muerto Rumano', grupo_muscular: 'Piernas', descripcion: 'Énfasis en isquiosurales y glúteos con piernas semirrígidas.' },
    { nombre: 'Curl Femoral', grupo_muscular: 'Piernas', descripcion: 'Aislamiento de isquios en máquina.' },
    { nombre: 'Extensión de Cuádriceps', grupo_muscular: 'Piernas', descripcion: 'Aislamiento de cuádriceps en máquina.' },
    { nombre: 'Elevación de Talones', grupo_muscular: 'Piernas', descripcion: 'Ejercicio de aislamiento para gemelos.' },

    // --- HOMBROS ---
    { nombre: 'Press Militar con Barra', grupo_muscular: 'Hombros', descripcion: 'Empuje vertical por encima de la cabeza.' },
    { nombre: 'Press Arnold', grupo_muscular: 'Hombros', descripcion: 'Variante de empuje con mancuernas y rotación.' },
    { nombre: 'Elevaciones Laterales', grupo_muscular: 'Hombros', descripcion: 'Aislamiento para la cabeza lateral del deltoides.' },
    { nombre: 'Pájaros (Deltoides Posterior)', grupo_muscular: 'Hombros', descripcion: 'Aislamiento para la parte posterior del hombro.' },
    { nombre: 'Encogimientos', grupo_muscular: 'Hombros', descripcion: 'Énfasis en los trapecios superior.' },

    // --- BRAZOS (BÍCEPS Y TRÍCEPS) ---
    { nombre: 'Curl de Bíceps con Barra', grupo_muscular: 'Brazos', descripcion: 'Flexión de codo pesada para bíceps.' },
    { nombre: 'Curl Martillo', grupo_muscular: 'Brazos', descripcion: 'Flexión con agarre neutro para braquial.' },
    { nombre: 'Curl en Banco Scott', grupo_muscular: 'Brazos', descripcion: 'Flexión aislada en pupitre.' },
    { nombre: 'Press Francés', grupo_muscular: 'Brazos', descripcion: 'Extensión de codo tumbado para tríceps.' },
    { nombre: 'Extensión en Polea Alta', grupo_muscular: 'Brazos', descripcion: 'Aislamiento de tríceps en polea.' },
    { nombre: 'Fondos en Paralelas (Dips)', grupo_muscular: 'Brazos', descripcion: 'Empuje compuesto para tríceps y pecho bajo.' },

    // --- CORE / ABDOMEN ---
    { nombre: 'Crunch Abdominal', grupo_muscular: 'Core', descripcion: 'Flexión de tronco en el suelo.' },
    { nombre: 'Plancha (Plank)', grupo_muscular: 'Core', descripcion: 'Ejercicio isométrico para estabilización del core.' },
    { nombre: 'Rueda Abdominal (Ab Wheel)', grupo_muscular: 'Core', descripcion: 'Extensión y flexión resistida del core.' },
    { nombre: 'Elevación de Piernas Colgado', grupo_muscular: 'Core', descripcion: 'Flexión de cadera y abdomen en barra.' }
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
