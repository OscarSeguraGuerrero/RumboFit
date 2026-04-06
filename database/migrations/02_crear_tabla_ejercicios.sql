-- Migración 02: Crear tabla de ejercicios (Catálogo Base)

CREATE TABLE ejercicios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    grupo_muscular VARCHAR(50) NOT NULL,
    descripcion TEXT
);