const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN CRÍTICA (SIEMPRE ARRIBA) ---
app.use(cors()); // Permite conexiones desde tu IP y localhost
app.use(express.json()); // Permite leer el cuerpo de los JSON

// --- RUTAS ---

// Registro
app.post('/api/register', async (req, res) => {
    console.log("Petición recibida en /api/register:", req.body); // LOG PARA DEPURAR
    const { nombre, email, password, telefono } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const nuevoUsuario = await prisma.usuario.create({
            data: {
                nombre: nombre,
                email: email,
                password_hash: passwordHash,
                telefono: String(telefono)
            },
        });

        res.status(201).json({ success: true, user: { id: nuevoUsuario.id, nombre: nuevoUsuario.nombre, email: nuevoUsuario.email } });
    } catch (error) {
        console.error("Error en Prisma:", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas' });

        const validPassword = await bcrypt.compare(password, usuario.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Credenciales incorrectas' });

        res.json({
            success: true,
            user: { id: usuario.id, nombre: usuario.nombre, email: usuario.email }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Catálogo de ejercicios (Este te funcionaba porque es un GET)
app.get('/api/ejercicios', async (req, res) => {
    try {
        const ejercicios = await prisma.ejercicio.findMany();
        res.json(ejercicios);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener catálogo' });
    }
});

// --- ARRANCAR SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor RumboFit corriendo en http://0.0.0.0:${PORT}`);
});