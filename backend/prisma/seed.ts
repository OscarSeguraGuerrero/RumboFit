import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ejercicios = [
    // --- PECHO (Fuerza) ---
    { nombre: 'Press de Banca Plano', grupo_muscular: 'Pecho', material: 'Barra', nivel_minimo: 'Intermedio', es_senior_safe: false, dificultad: 3, categoria: 'Fuerza', descripcion: 'Ejercicio compuesto principal con barra plana.' },
    { nombre: 'Press de Banca con Mancuernas', grupo_muscular: 'Pecho', material: 'Mancuerna', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Variante segura y funcional con mancuernas.' },
    { nombre: 'Press Inclinado', grupo_muscular: 'Pecho', material: 'Barra', nivel_minimo: 'Intermedio', es_senior_safe: false, dificultad: 3, categoria: 'Fuerza', descripcion: 'Énfasis en la parte superior del pectoral.' },
    { nombre: 'Aperturas con Mancuernas', grupo_muscular: 'Pecho', material: 'Mancuerna', nivel_minimo: 'Intermedio', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Aislamiento pectoral en banco.' },
    { nombre: 'Cruce de Poleas', grupo_muscular: 'Pecho', material: 'Polea', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Tensión constante en poleas.' },
    { nombre: 'Flexiones (Push-ups)', grupo_muscular: 'Pecho', material: 'Peso Corporal', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Empuje horizontal básico.' },
    { nombre: 'Press en Máquina', grupo_muscular: 'Pecho', material: 'Maquina', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Fuerza', descripcion: 'Empuje guiado muy seguro para iniciación.' },

    // --- ESPALDA (Tracción) ---
    { nombre: 'Dominadas', grupo_muscular: 'Espalda', material: 'Peso Corporal', nivel_minimo: 'Atleta', es_senior_safe: false, dificultad: 5, categoria: 'Fuerza', descripcion: 'Tracción vertical avanzada.' },
    { nombre: 'Jalón al Pecho', grupo_muscular: 'Espalda', material: 'Polea', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Sustituto seguro de las dominadas.' },
    { nombre: 'Remo con Barra', grupo_muscular: 'Espalda', material: 'Barra', nivel_minimo: 'Intermedio', es_senior_safe: false, dificultad: 4, categoria: 'Fuerza', descripcion: 'Tracción horizontal pesada.' },
    { nombre: 'Remo con Mancuerna', grupo_muscular: 'Espalda', material: 'Mancuerna', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Remo unilateral más manejable.' },
    { nombre: 'Remo Gironda', grupo_muscular: 'Espalda', material: 'Polea', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Remo en polea baja, gran control.' },
    { nombre: 'Peso Muerto', grupo_muscular: 'Espalda/Piernas', material: 'Barra', nivel_minimo: 'Atleta', es_senior_safe: false, dificultad: 5, categoria: 'Fuerza', descripcion: 'El rey de los ejercicios de cadena posterior.' },
    { nombre: 'Extensiones de Espalda', grupo_muscular: 'Espalda', material: 'Maquina', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Fuerza', descripcion: 'Refuerzo lumbar seguro.' },

    // --- PIERNAS ---
    { nombre: 'Sentadilla Libre', grupo_muscular: 'Piernas', material: 'Barra', nivel_minimo: 'Intermedio', es_senior_safe: false, dificultad: 4, categoria: 'Fuerza', descripcion: 'Pilar del entrenamiento de pierna.' },
    { nombre: 'Sentadilla con Mancuernas', grupo_muscular: 'Piernas', material: 'Mancuerna', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Sentadilla más segura para seniors.' },
    { nombre: 'Prensa de Piernas', grupo_muscular: 'Piernas', material: 'Maquina', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Empuje guiado de pierna.' },
    { nombre: 'Zancadas (Lunges)', grupo_muscular: 'Piernas', material: 'Mancuerna', nivel_minimo: 'Intermedio', es_senior_safe: true, dificultad: 3, categoria: 'Fuerza', descripcion: 'Trabajo unilateral y de equilibrio.' },
    { nombre: 'Peso Muerto Rumano', grupo_muscular: 'Piernas', material: 'Barra', nivel_minimo: 'Intermedio', es_senior_safe: false, dificultad: 3, categoria: 'Fuerza', descripcion: 'Énfasis en isquios.' },
    { nombre: 'Curl Femoral', grupo_muscular: 'Piernas', material: 'Maquina', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Fuerza', descripcion: 'Aislamiento de isquios.' },
    { nombre: 'Extensión de Cuádriceps', grupo_muscular: 'Piernas', material: 'Maquina', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Fuerza', descripcion: 'Aislamiento de cuádriceps.' },
    { nombre: 'Elevación de Talones', grupo_muscular: 'Piernas', material: 'Mancuerna', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Fuerza', descripcion: 'Trabajo de gemelos.' },

    // --- HOMBROS ---
    { nombre: 'Press Militar con Barra', grupo_muscular: 'Hombros', material: 'Barra', nivel_minimo: 'Intermedio', es_senior_safe: false, dificultad: 4, categoria: 'Fuerza', descripcion: 'Empuje vertical puro.' },
    { nombre: 'Press Militar con Mancuernas', grupo_muscular: 'Hombros', material: 'Mancuerna', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Empuje vertical más equilibrado.' },
    { nombre: 'Press Arnold', grupo_muscular: 'Hombros', material: 'Mancuerna', nivel_minimo: 'Atleta', es_senior_safe: false, dificultad: 4, categoria: 'Fuerza', descripcion: 'Variante avanzada con giro.' },
    { nombre: 'Elevaciones Laterales', grupo_muscular: 'Hombros', material: 'Mancuerna', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Aislamiento hombro lateral.' },
    { nombre: 'Pájaros (Deltoides Posterior)', grupo_muscular: 'Hombros', material: 'Mancuerna', nivel_minimo: 'Intermedio', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Aislamiento hombro posterior.' },
    { nombre: 'Encogimientos', grupo_muscular: 'Hombros', material: 'Mancuerna', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Fuerza', descripcion: 'Trabajo de trapecio.' },

    // --- BRAZOS ---
    { nombre: 'Curl de Bíceps con Barra', grupo_muscular: 'Brazos', material: 'Barra', nivel_minimo: 'Intermedio', es_senior_safe: false, dificultad: 2, categoria: 'Fuerza', descripcion: 'Clásico de bíceps.' },
    { nombre: 'Curl de Bíceps con Mancuernas', grupo_muscular: 'Brazos', material: 'Mancuerna', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Fuerza', descripcion: 'Bíceps con giro, muy manejable.' },
    { nombre: 'Curl Martillo', grupo_muscular: 'Brazos', material: 'Mancuerna', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Fuerza', descripcion: 'Énfasis en braquial.' },
    { nombre: 'Press Francés', grupo_muscular: 'Brazos', material: 'Barra', nivel_minimo: 'Intermedio', es_senior_safe: false, dificultad: 3, categoria: 'Fuerza', descripcion: 'Tríceps pesado.' },
    { nombre: 'Extensión en Polea Alta', grupo_muscular: 'Brazos', material: 'Polea', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Fuerza', descripcion: 'Aislamiento de tríceps.' },
    { nombre: 'Fondos en Paralelas (Dips)', grupo_muscular: 'Brazos', material: 'Peso Corporal', nivel_minimo: 'Atleta', es_senior_safe: false, dificultad: 4, categoria: 'Fuerza', descripcion: 'Empuje potente de tríceps.' },

    // --- CORE / ABDOMINALES ---
    { nombre: 'Plancha (Plank)', grupo_muscular: 'Core', material: 'Peso Corporal', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 2, categoria: 'Fuerza', descripcion: 'Estabilidad isométrica.' },
    { nombre: 'Deadbug', grupo_muscular: 'Core', material: 'Peso Corporal', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Core Funcional', descripcion: 'Coordinación y estabilidad lumbar segura.' },
    { nombre: 'Bird-Dog', grupo_muscular: 'Core', material: 'Peso Corporal', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Core Funcional', descripcion: 'Mejora del equilibrio y control de espalda.' },
    { nombre: 'Crunch Abdominal', grupo_muscular: 'Core', material: 'Peso Corporal', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Fuerza', descripcion: 'Flexión abdominal básica.' },
    { nombre: 'Elevación de Piernas Colgado', grupo_muscular: 'Core', material: 'Peso Corporal', nivel_minimo: 'Intermedio', es_senior_safe: false, dificultad: 3, categoria: 'Fuerza', descripcion: 'Flexión de cadera y abdomen en barra.' },

    // --- MOVILIDAD Y ESTIRAMIENTO ---
    { nombre: 'Gato-Camello', grupo_muscular: 'Espalda/Core', material: 'Peso Corporal', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Movilidad', descripcion: 'Movilidad vertebral y alivio de tensión.' },
    { nombre: 'Apertura de Cadera', grupo_muscular: 'Piernas', material: 'Peso Corporal', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Movilidad', descripcion: 'Libera tensión en psoas y glúteos.' },
    { nombre: 'Rotación de Tronco', grupo_muscular: 'Espalda', material: 'Peso Corporal', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Movilidad', descripcion: 'Mejora la torsión de la columna.' },
    { nombre: 'Caminar', grupo_muscular: 'Global', material: 'Peso Corporal', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Cardio', descripcion: 'Actividad aeróbica de bajo impacto.' },
    { nombre: 'Estiramiento dinámico', grupo_muscular: 'Global', material: 'Peso Corporal', nivel_minimo: 'Principiante', es_senior_safe: true, dificultad: 1, categoria: 'Estiramiento', descripcion: 'Preparación articular previa al entreno.' }
  ];

  for (const ej of ejercicios) {
    await prisma.ejercicio.upsert({
      where: { nombre: ej.nombre },
      update: ej,
      create: ej,
    });
  }
  console.log('Seed exitoso: Catálogo maestro de ejercicios enriquecido.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
