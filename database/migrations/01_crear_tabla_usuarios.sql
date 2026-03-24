-- Migración 01: Crear tabla de usuarios

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(9),
    
    -- Datos del formulario de diagnóstico
    peso DECIMAL(5,2),
    altura INT,
    edad INT,
    sexo VARCHAR(20),
    frecuencia_semanal INT,
    objetivo VARCHAR(50),
    
    -- Control de premium y auditoría
    es_premium BOOLEAN DEFAULT FALSE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);