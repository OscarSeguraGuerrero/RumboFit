-- Migración 03: Crear tablas de rutinas y su relación con ejercicios

-- Cabecera de la rutina asignada al usuario
CREATE TABLE rutinas (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_rutina VARCHAR(100) NOT NULL,
    es_generada_sistema BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Detalle de los ejercicios que componen la rutina
CREATE TABLE rutina_ejercicios (
    id SERIAL PRIMARY KEY,
    rutina_id INT REFERENCES rutinas(id) ON DELETE CASCADE,
    ejercicio_id INT REFERENCES ejercicios(id) ON DELETE CASCADE,
    dia_semana INT NOT NULL, -- Ej: 1 para Lunes, 2 para Martes...
    series_objetivo INT,
    repeticiones_objetivo VARCHAR(20)
);