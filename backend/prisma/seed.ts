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
  console.log(`Seed ejercicios: ${ejercicios.length} ejercicios insertados.`);

  // ==========================================
  // CATÁLOGO DE ALIMENTOS
  // ==========================================
  const alimentos = [
    // --- PROTEINAS ANIMALES ---
    { nombre: 'Pechuga de pollo', calorias_100g: 165, proteinas_100g: 31.0, carbohidratos_100g: 0.0, grasas_100g: 3.6 },
    { nombre: 'Pechuga de pavo', calorias_100g: 135, proteinas_100g: 29.0, carbohidratos_100g: 0.0, grasas_100g: 1.0 },
    { nombre: 'Ternera magra', calorias_100g: 135, proteinas_100g: 21.0, carbohidratos_100g: 0.0, grasas_100g: 5.0 },
    { nombre: 'Cerdo magro', calorias_100g: 143, proteinas_100g: 21.0, carbohidratos_100g: 0.0, grasas_100g: 6.0 },
    { nombre: 'Salmon', calorias_100g: 208, proteinas_100g: 20.0, carbohidratos_100g: 0.0, grasas_100g: 13.0 },
    { nombre: 'Atun en lata al natural', calorias_100g: 116, proteinas_100g: 26.0, carbohidratos_100g: 0.0, grasas_100g: 1.0 },
    { nombre: 'Merluza', calorias_100g: 86, proteinas_100g: 17.0, carbohidratos_100g: 0.0, grasas_100g: 1.9 },
    { nombre: 'Sardina', calorias_100g: 208, proteinas_100g: 24.0, carbohidratos_100g: 0.0, grasas_100g: 12.0 },
    { nombre: 'Huevo entero', calorias_100g: 155, proteinas_100g: 13.0, carbohidratos_100g: 1.1, grasas_100g: 11.0 },
    { nombre: 'Clara de huevo', calorias_100g: 52, proteinas_100g: 11.0, carbohidratos_100g: 0.7, grasas_100g: 0.2 },
    { nombre: 'Pavo en lonchas', calorias_100g: 104, proteinas_100g: 18.0, carbohidratos_100g: 2.0, grasas_100g: 2.0 },
    { nombre: 'Jamon serrano', calorias_100g: 241, proteinas_100g: 31.0, carbohidratos_100g: 0.1, grasas_100g: 13.0 },
    { nombre: 'Jamon cocido', calorias_100g: 116, proteinas_100g: 18.0, carbohidratos_100g: 1.5, grasas_100g: 4.0 },
    { nombre: 'Carne picada magra', calorias_100g: 137, proteinas_100g: 21.0, carbohidratos_100g: 0.0, grasas_100g: 5.7 },
    { nombre: 'Solomillo de ternera', calorias_100g: 187, proteinas_100g: 20.0, carbohidratos_100g: 0.0, grasas_100g: 12.0 },
    { nombre: 'Lomo de cerdo', calorias_100g: 172, proteinas_100g: 21.0, carbohidratos_100g: 0.0, grasas_100g: 9.0 },
    { nombre: 'Bacalao', calorias_100g: 82, proteinas_100g: 18.0, carbohidratos_100g: 0.0, grasas_100g: 0.7 },
    { nombre: 'Lubina', calorias_100g: 97, proteinas_100g: 19.0, carbohidratos_100g: 0.0, grasas_100g: 2.0 },
    { nombre: 'Gambas', calorias_100g: 99, proteinas_100g: 24.0, carbohidratos_100g: 0.2, grasas_100g: 0.3 },
    { nombre: 'Tofu firme', calorias_100g: 144, proteinas_100g: 17.0, carbohidratos_100g: 3.0, grasas_100g: 8.0 },

    // --- LACTEOS ---
    { nombre: 'Leche entera', calorias_100g: 61, proteinas_100g: 3.2, carbohidratos_100g: 4.8, grasas_100g: 3.3 },
    { nombre: 'Leche desnatada', calorias_100g: 35, proteinas_100g: 3.4, carbohidratos_100g: 5.0, grasas_100g: 0.1 },
    { nombre: 'Yogur natural', calorias_100g: 59, proteinas_100g: 3.5, carbohidratos_100g: 4.0, grasas_100g: 3.3 },
    { nombre: 'Yogur griego', calorias_100g: 97, proteinas_100g: 9.0, carbohidratos_100g: 3.6, grasas_100g: 5.0 },
    { nombre: 'Queso fresco', calorias_100g: 98, proteinas_100g: 13.0, carbohidratos_100g: 3.0, grasas_100g: 4.0 },
    { nombre: 'Requeson', calorias_100g: 74, proteinas_100g: 11.0, carbohidratos_100g: 3.0, grasas_100g: 1.0 },
    { nombre: 'Queso parmesano', calorias_100g: 392, proteinas_100g: 36.0, carbohidratos_100g: 3.2, grasas_100g: 26.0 },
    { nombre: 'Skyr natural', calorias_100g: 63, proteinas_100g: 11.0, carbohidratos_100g: 3.8, grasas_100g: 0.2 },
    { nombre: 'Kefir natural', calorias_100g: 64, proteinas_100g: 3.5, carbohidratos_100g: 4.7, grasas_100g: 3.5 },
    { nombre: 'Mozzarella fresca', calorias_100g: 253, proteinas_100g: 18.0, carbohidratos_100g: 2.2, grasas_100g: 19.0 },
    { nombre: 'Queso cottage', calorias_100g: 98, proteinas_100g: 11.0, carbohidratos_100g: 3.4, grasas_100g: 4.3 },
    { nombre: 'Leche semidesnatada', calorias_100g: 46, proteinas_100g: 3.2, carbohidratos_100g: 4.8, grasas_100g: 1.6 },
    { nombre: 'Bebida de soja sin azucar', calorias_100g: 33, proteinas_100g: 3.3, carbohidratos_100g: 0.7, grasas_100g: 1.8 },

    // --- CARBOHIDRATOS ---
    { nombre: 'Arroz blanco cocido', calorias_100g: 130, proteinas_100g: 2.7, carbohidratos_100g: 28.0, grasas_100g: 0.3 },
    { nombre: 'Arroz integral cocido', calorias_100g: 111, proteinas_100g: 2.6, carbohidratos_100g: 23.0, grasas_100g: 0.9 },
    { nombre: 'Pasta cocida', calorias_100g: 131, proteinas_100g: 5.0, carbohidratos_100g: 25.0, grasas_100g: 1.1 },
    { nombre: 'Pan integral', calorias_100g: 247, proteinas_100g: 9.0, carbohidratos_100g: 41.0, grasas_100g: 3.5 },
    { nombre: 'Avena', calorias_100g: 389, proteinas_100g: 17.0, carbohidratos_100g: 66.0, grasas_100g: 7.0 },
    { nombre: 'Patata cocida', calorias_100g: 86, proteinas_100g: 2.0, carbohidratos_100g: 20.0, grasas_100g: 0.1 },
    { nombre: 'Boniato cocido', calorias_100g: 86, proteinas_100g: 1.6, carbohidratos_100g: 20.0, grasas_100g: 0.1 },
    { nombre: 'Quinoa cocida', calorias_100g: 120, proteinas_100g: 4.4, carbohidratos_100g: 21.0, grasas_100g: 1.9 },
    { nombre: 'Cuscus cocido', calorias_100g: 112, proteinas_100g: 3.8, carbohidratos_100g: 23.0, grasas_100g: 0.2 },
    { nombre: 'Tortitas de arroz', calorias_100g: 387, proteinas_100g: 8.0, carbohidratos_100g: 81.0, grasas_100g: 3.0 },
    { nombre: 'Pan blanco', calorias_100g: 265, proteinas_100g: 9.0, carbohidratos_100g: 49.0, grasas_100g: 3.2 },
    { nombre: 'Pan de centeno', calorias_100g: 259, proteinas_100g: 8.5, carbohidratos_100g: 48.0, grasas_100g: 3.3 },
    { nombre: 'Tortilla de trigo', calorias_100g: 310, proteinas_100g: 8.0, carbohidratos_100g: 52.0, grasas_100g: 7.0 },
    { nombre: 'Maiz dulce', calorias_100g: 96, proteinas_100g: 3.4, carbohidratos_100g: 21.0, grasas_100g: 1.5 },
    { nombre: 'Copos de maiz', calorias_100g: 357, proteinas_100g: 7.5, carbohidratos_100g: 84.0, grasas_100g: 0.4 },
    { nombre: 'Muesli', calorias_100g: 372, proteinas_100g: 10.0, carbohidratos_100g: 64.0, grasas_100g: 7.0 },

    // --- VERDURAS ---
    { nombre: 'Brocoli', calorias_100g: 34, proteinas_100g: 2.8, carbohidratos_100g: 7.0, grasas_100g: 0.4 },
    { nombre: 'Espinacas', calorias_100g: 23, proteinas_100g: 2.9, carbohidratos_100g: 3.6, grasas_100g: 0.4 },
    { nombre: 'Tomate', calorias_100g: 18, proteinas_100g: 0.9, carbohidratos_100g: 3.9, grasas_100g: 0.2 },
    { nombre: 'Pepino', calorias_100g: 16, proteinas_100g: 0.7, carbohidratos_100g: 3.6, grasas_100g: 0.1 },
    { nombre: 'Zanahoria', calorias_100g: 41, proteinas_100g: 0.9, carbohidratos_100g: 10.0, grasas_100g: 0.2 },
    { nombre: 'Pimiento rojo', calorias_100g: 26, proteinas_100g: 1.0, carbohidratos_100g: 6.0, grasas_100g: 0.3 },
    { nombre: 'Lechuga', calorias_100g: 17, proteinas_100g: 1.4, carbohidratos_100g: 2.0, grasas_100g: 0.3 },
    { nombre: 'Cebolla', calorias_100g: 40, proteinas_100g: 1.1, carbohidratos_100g: 9.3, grasas_100g: 0.1 },
    { nombre: 'Champinon', calorias_100g: 22, proteinas_100g: 3.1, carbohidratos_100g: 3.3, grasas_100g: 0.3 },
    { nombre: 'Calabacin', calorias_100g: 17, proteinas_100g: 1.2, carbohidratos_100g: 3.1, grasas_100g: 0.3 },
    { nombre: 'Berenjena', calorias_100g: 25, proteinas_100g: 1.0, carbohidratos_100g: 5.9, grasas_100g: 0.2 },
    { nombre: 'Coliflor', calorias_100g: 25, proteinas_100g: 1.9, carbohidratos_100g: 5.0, grasas_100g: 0.3 },
    { nombre: 'Esparragos', calorias_100g: 20, proteinas_100g: 2.2, carbohidratos_100g: 3.9, grasas_100g: 0.1 },
    { nombre: 'Judias verdes', calorias_100g: 31, proteinas_100g: 1.8, carbohidratos_100g: 7.0, grasas_100g: 0.1 },
    { nombre: 'Remolacha cocida', calorias_100g: 44, proteinas_100g: 1.7, carbohidratos_100g: 10.0, grasas_100g: 0.2 },
    { nombre: 'Calabaza', calorias_100g: 26, proteinas_100g: 1.0, carbohidratos_100g: 6.5, grasas_100g: 0.1 },
    { nombre: 'Setas', calorias_100g: 22, proteinas_100g: 3.1, carbohidratos_100g: 3.3, grasas_100g: 0.3 },
    { nombre: 'Rucula', calorias_100g: 25, proteinas_100g: 2.6, carbohidratos_100g: 3.7, grasas_100g: 0.7 },

    // --- FRUTAS ---
    { nombre: 'Platano', calorias_100g: 89, proteinas_100g: 1.1, carbohidratos_100g: 23.0, grasas_100g: 0.3 },
    { nombre: 'Manzana', calorias_100g: 52, proteinas_100g: 0.3, carbohidratos_100g: 14.0, grasas_100g: 0.2 },
    { nombre: 'Naranja', calorias_100g: 47, proteinas_100g: 0.9, carbohidratos_100g: 12.0, grasas_100g: 0.1 },
    { nombre: 'Fresa', calorias_100g: 32, proteinas_100g: 0.7, carbohidratos_100g: 8.0, grasas_100g: 0.3 },
    { nombre: 'Arandano', calorias_100g: 57, proteinas_100g: 0.7, carbohidratos_100g: 14.0, grasas_100g: 0.3 },
    { nombre: 'Sandia', calorias_100g: 30, proteinas_100g: 0.6, carbohidratos_100g: 7.6, grasas_100g: 0.2 },
    { nombre: 'Kiwi', calorias_100g: 61, proteinas_100g: 1.1, carbohidratos_100g: 15.0, grasas_100g: 0.5 },
    { nombre: 'Pera', calorias_100g: 57, proteinas_100g: 0.4, carbohidratos_100g: 15.0, grasas_100g: 0.1 },
    { nombre: 'Uvas', calorias_100g: 69, proteinas_100g: 0.7, carbohidratos_100g: 18.0, grasas_100g: 0.2 },
    { nombre: 'Pina', calorias_100g: 50, proteinas_100g: 0.5, carbohidratos_100g: 13.0, grasas_100g: 0.1 },
    { nombre: 'Mango', calorias_100g: 60, proteinas_100g: 0.8, carbohidratos_100g: 15.0, grasas_100g: 0.4 },
    { nombre: 'Melon', calorias_100g: 34, proteinas_100g: 0.8, carbohidratos_100g: 8.0, grasas_100g: 0.2 },
    { nombre: 'Mandarina', calorias_100g: 53, proteinas_100g: 0.8, carbohidratos_100g: 13.0, grasas_100g: 0.3 },
    { nombre: 'Frambuesa', calorias_100g: 52, proteinas_100g: 1.2, carbohidratos_100g: 12.0, grasas_100g: 0.7 },
    { nombre: 'Mora', calorias_100g: 43, proteinas_100g: 1.4, carbohidratos_100g: 10.0, grasas_100g: 0.5 },
    { nombre: 'Papaya', calorias_100g: 43, proteinas_100g: 0.5, carbohidratos_100g: 11.0, grasas_100g: 0.3 },

    // --- GRASAS SALUDABLES ---
    { nombre: 'Aguacate', calorias_100g: 160, proteinas_100g: 2.0, carbohidratos_100g: 9.0, grasas_100g: 15.0 },
    { nombre: 'Aceite de oliva', calorias_100g: 884, proteinas_100g: 0.0, carbohidratos_100g: 0.0, grasas_100g: 100.0 },
    { nombre: 'Almendras', calorias_100g: 579, proteinas_100g: 21.0, carbohidratos_100g: 22.0, grasas_100g: 50.0 },
    { nombre: 'Nueces', calorias_100g: 654, proteinas_100g: 15.0, carbohidratos_100g: 14.0, grasas_100g: 65.0 },
    { nombre: 'Mantequilla de cacahuete', calorias_100g: 588, proteinas_100g: 25.0, carbohidratos_100g: 20.0, grasas_100g: 50.0 },
    { nombre: 'Crema de almendras', calorias_100g: 614, proteinas_100g: 21.0, carbohidratos_100g: 19.0, grasas_100g: 55.0 },
    { nombre: 'Anacardos', calorias_100g: 553, proteinas_100g: 18.0, carbohidratos_100g: 30.0, grasas_100g: 44.0 },
    { nombre: 'Pistachos', calorias_100g: 562, proteinas_100g: 20.0, carbohidratos_100g: 28.0, grasas_100g: 45.0 },
    { nombre: 'Semillas de chia', calorias_100g: 486, proteinas_100g: 17.0, carbohidratos_100g: 42.0, grasas_100g: 31.0 },
    { nombre: 'Semillas de lino', calorias_100g: 534, proteinas_100g: 18.0, carbohidratos_100g: 29.0, grasas_100g: 42.0 },

    // --- LEGUMBRES ---
    { nombre: 'Lentejas cocidas', calorias_100g: 116, proteinas_100g: 9.0, carbohidratos_100g: 20.0, grasas_100g: 0.4 },
    { nombre: 'Garbanzos cocidos', calorias_100g: 164, proteinas_100g: 8.9, carbohidratos_100g: 27.0, grasas_100g: 2.6 },
    { nombre: 'Judias negras cocidas', calorias_100g: 132, proteinas_100g: 8.9, carbohidratos_100g: 24.0, grasas_100g: 0.5 },
    { nombre: 'Edamame', calorias_100g: 122, proteinas_100g: 11.0, carbohidratos_100g: 10.0, grasas_100g: 5.0 },
    { nombre: 'Alubias blancas cocidas', calorias_100g: 114, proteinas_100g: 7.0, carbohidratos_100g: 21.0, grasas_100g: 0.4 },
    { nombre: 'Guisantes cocidos', calorias_100g: 84, proteinas_100g: 5.4, carbohidratos_100g: 15.0, grasas_100g: 0.4 },
    { nombre: 'Hummus', calorias_100g: 166, proteinas_100g: 8.0, carbohidratos_100g: 14.0, grasas_100g: 9.6 },
  ];

  for (const alimento of alimentos) {
    await prisma.alimento.upsert({
      where: { nombre: alimento.nombre },
      update: alimento,
      create: alimento,
    });
  }
  console.log(`Seed alimentos: ${alimentos.length} alimentos insertados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
