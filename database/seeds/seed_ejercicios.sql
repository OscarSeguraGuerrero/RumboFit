-- Seed: Carga inicial de ejercicios físicos para la BD

INSERT INTO ejercicios (nombre, grupo_muscular, descripcion) VALUES
-- PECHO
('Press de Banca Plano', 'Pecho', 'Ejercicio compuesto principal con barra plana.'),
('Press de Banca Inclinado', 'Pecho', 'Variante con banco inclinado para énfasis en haz clavicular.'),
('Aperturas con Mancuernas', 'Pecho', 'Ejercicio de aislamiento para pectoral en banco plano.'),
('Cruce de Poleas', 'Pecho', 'Ejercicio de tensión continua en polea alta.'),
('Flexiones (Push-ups)', 'Pecho', 'Ejercicio con peso corporal para empuje horizontal.'),

-- ESPALDA
('Dominadas', 'Espalda', 'Tracción vertical con peso corporal.'),
('Jalón al Pecho', 'Espalda', 'Tracción vertical en máquina de polea.'),
('Remo con Barra', 'Espalda', 'Tracción horizontal pesada con barra.'),
('Remo Gironda', 'Espalda', 'Tracción horizontal en polea baja.'),
('Peso Muerto', 'Espalda/Piernas', 'Levantamiento compuesto pesado desde el suelo.'),

-- PIERNAS
('Sentadilla Libre', 'Piernas', 'Flexión profunda de rodillas con barra en la espalda.'),
('Prensa de Piernas', 'Piernas', 'Empuje de piernas en máquina a 45 grados.'),
('Zancadas (Lunges)', 'Piernas', 'Flexión de piernas unilateral con mancuernas.'),
('Peso Muerto Rumano', 'Piernas', 'Énfasis en isquiosurales y glúteos con piernas semirrígidas.'),
('Curl Femoral', 'Piernas', 'Aislamiento de isquios en máquina.'),
('Extensión de Cuádriceps', 'Piernas', 'Aislamiento de cuádriceps en máquina.'),
('Elevación de Talones', 'Piernas', 'Ejercicio de aislamiento para gemelos.'),

-- HOMBROS
('Press Militar con Barra', 'Hombros', 'Empuje vertical por encima de la cabeza.'),
('Press Arnold', 'Hombros', 'Variante de empuje con mancuernas y rotación.'),
('Elevaciones Laterales', 'Hombros', 'Aislamiento para la cabeza lateral del deltoides.'),
('Pájaros (Deltoides Posterior)', 'Hombros', 'Aislamiento para la parte posterior del hombro.'),
('Encogimientos', 'Hombros', 'Énfasis en los trapecios superior.'),

-- BRAZOS (BÍCEPS Y TRÍCEPS)
('Curl de Bíceps con Barra', 'Brazos', 'Flexión de codo pesada para bíceps.'),
('Curl Martillo', 'Brazos', 'Flexión con agarre neutro para braquial.'),
('Curl en Banco Scott', 'Brazos', 'Flexión aislada en pupitre.'),
('Press Francés', 'Brazos', 'Extensión de codo tumbado para tríceps.'),
('Extensión en Polea Alta', 'Brazos', 'Aislamiento de tríceps en polea.'),
('Fondos en Paralelas (Dips)', 'Brazos', 'Empuje compuesto para tríceps y pecho bajo.'),

-- CORE / ABDOMEN
('Crunch Abdominal', 'Core', 'Flexión de tronco en el suelo.'),
('Plancha (Plank)', 'Core', 'Ejercicio isométrico para estabilización del core.'),
('Rueda Abdominal (Ab Wheel)', 'Core', 'Extensión y flexión resistida del core.'),
('Elevación de Piernas Colgado', 'Core', 'Flexión de cadera y abdomen en barra.');