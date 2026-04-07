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

        // Verificamos si ya tiene alguna rutina en la DB
        const rutinaExistente = await prisma.rutina.findFirst({ where: { usuario_id: usuario.id } });

        res.json({
            success: true,
            user: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
            hasRoutine: !!rutinaExistente
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

// --- MOTOR DE RUTINAS INTELIGENTE (Punto 1 y 2) ---

const nivelesCompatibles = {
    'Principiante': ['Principiante'],
    'Intermedio': ['Principiante', 'Intermedio'],
    'Atleta': ['Principiante', 'Intermedio', 'Atleta']
};

async function buscarEjercicioInteligente(grupo, nivelUsuario, edad) {
    const age = parseInt(edad) || 25;

    let filtros = {
        grupo_muscular: { contains: grupo, mode: 'insensitive' }
    };

    // --- REGLAS DE INTELIGENCIA POR EDAD ---

    if (age >= 65) {
        // >65: Seguridad Senior (Sin barras, prioridad senior-safe)
        filtros.material = { not: 'Barra' };
        filtros.es_senior_safe = true;
    } 
    else if (age >= 50) {
        // 50-65: Protección Articular (Dificultad técnica limitada)
        filtros.dificultad = { lte: 6 };
    }
    else if (age >= 35) {
        // 35-50: Rendimiento Sostenible (Sin restricciones, pero el generador añade movilidad)
        if (nivelUsuario === 'Principiante') filtros.dificultad = { lte: 8 };
    }
    else if (age >= 18) {
        // 18-35: Prime Performance (Sin restricciones de dificultad técnica)
    }
    else {
        // <18: Crecimiento Seguro (Evitamos barras pesadas, dificultad máx 7)
        filtros.dificultad = { lte: 7 };
        filtros.material = { not: 'Barra' };
    }

    // Filtro de niveles acumulativo (Se aplica si no es Senior)
    if (age < 65 && nivelUsuario && nivelesCompatibles[nivelUsuario]) {
        filtros.nivel_minimo = { in: nivelesCompatibles[nivelUsuario] };
    }

    const candidatos = await prisma.ejercicio.findMany({ where: filtros });

    if (candidatos.length === 0) return null;

    // Selección aleatoria
    const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
    return `${elegido.nombre} 3x12`; 
}


app.post('/api/rutinas/generar', async (req, res) => {
    const { userId, peso, altura, edad, objetivo, dias, experiencia, sexo } = req.body;

    try {
        // --- VALIDACIÓN DE RANGOS (HU-04 Oficial) ---
        const ageNum = parseInt(edad);
        const weightNum = parseFloat(peso);
        const heightNum = parseInt(altura);
        const daysNum = parseInt(dias);

        if (ageNum < 10 || ageNum > 117 || weightNum < 20 || weightNum > 400 || heightNum < 50 || heightNum > 300 || daysNum < 1 || daysNum > 7) {
            return res.status(400).json({ error: 'Datos físicos fuera de los rangos permitidos (HU-04)' });
        }

        const usuario = await prisma.usuario.findUnique({ where: { id: parseInt(userId) } });
        const nivel = experiencia || usuario?.nivel || 'Principiante';

        // --- MOTOR DE REGLAS DE METODOLOGÍA (HU-05 Oficial) ---
        let metodologia = 'Full Body';
        let explicacion = 'Elección conservadora ideal para maximizar la frecuencia sin sobrecargar.';
        let estructura = {};

        if (nivel === 'Principiante') {
            if (daysNum <= 3) {
                metodologia = 'Full Body';
                explicacion = 'Recomendación conservadora para principiantes para dominar los movimientos básicos.';
                estructura = { "Día A": ["Pecho", "Espalda", "Piernas", "Core"], "Día B": ["Hombros", "Piernas", "Brazos", "Core"] };
            } else {
                metodologia = 'Torso / Pierna';
                explicacion = 'Estructura equilibrada para principiantes que permite mayor recuperación entre sesiones.';
                estructura = { "Torso 1": ["Pecho", "Espalda", "Hombros"], "Pierna 1": ["Piernas", "Core"], "Torso 2": ["Brazos", "Pecho", "Espalda"], "Pierna 2": ["Piernas", "Movilidad"] };
            }
        } 
        else if (nivel === 'Intermedio') {
            metodologia = 'PPL (Push/Pull/Legs)';
            explicacion = 'Metodología eficiente para nivel intermedio enfocada en patrones de movimiento.';
            estructura = { "Push": ["Pecho", "Hombros", "Tríceps"], "Pull": ["Espalda", "Bíceps", "Core"], "Legs": ["Piernas", "Core"] };
        }
        else { // Atleta
            if (daysNum >= 5) {
                metodologia = 'Weider (Aislado)';
                explicacion = 'Enfoque de alto volumen por grupo muscular para usuarios avanzados.';
                estructura = { "Pecho": ["Pecho", "Core"], "Espalda": ["Espalda"], "Piernas": ["Piernas"], "Hombros": ["Hombros"], "Brazos": ["Brazos", "Core"] };
            } else {
                metodologia = 'PPL Avanzado';
                explicacion = 'Esquema de alto rendimiento adaptado a tus días disponibles.';
                estructura = { "Push": ["Pecho", "Hombros", "Tríceps"], "Pull": ["Espalda", "Bíceps", "Core"], "Legs": ["Piernas", "Core"] };
            }
        }

        // --- GENERACIÓN DE LA RUTINA ---
        let rutinaFinal = {};
        const diasDisponiblesMetodologia = Object.keys(estructura);

        for (let i = 0; i < daysNum; i++) {
            // Si el usuario pide más días de los que tiene la estructura, repetimos cíclicamente
            const diaIndex = i % diasDisponiblesMetodologia.length;
            const nombreDia = diasDisponiblesMetodologia[diaIndex];
            const grupos = estructura[nombreDia];
            let ejerciciosDia = [];

            for (const grupo of grupos) {
                const ej = await buscarEjercicioInteligente(grupo, nivel, ageNum);
                if (ej) ejerciciosDia.push(ej);
            }
            rutinaFinal[`Día ${i + 1} (${nombreDia})`] = ejerciciosDia;
        }

        // --- PERSISTENCIA ---
        await prisma.usuario.update({
            where: { id: parseInt(userId) },
            data: { peso: weightNum, altura: heightNum, edad: ageNum, nivel: nivel, objetivo: objetivo, frecuencia_semanal: daysNum, sexo: sexo }
        });

        const rutinaExistente = await prisma.rutina.findFirst({ where: { usuario_id: parseInt(userId) } });
        if (!rutinaExistente) {
            await prisma.rutina.create({
                data: { usuario_id: parseInt(userId), nombre: metodologia, tipo_rutina: nivel, es_generada: true }
            });
        }

        res.json({
            success: true,
            metodo: metodologia,
            subtitulo: explicacion,
            rutina: rutinaFinal
        });

    } catch (error) {
        console.error(error);
        // --- ESTADO POR DEFECTO (Criterio HU-05) ---
        res.status(500).json({ 
            success: true, // Devolvemos una rutina por defecto para no bloquear al usuario
            metodo: 'Full Body (Modo Emergencia)',
            subtitulo: 'Asignada por defecto tras un error técnico para asegurar tu entrenamiento.',
            rutina: { "Rutina Básica": ["Pecho 3x12", "Espalda 3x12", "Piernas 3x12"] }
        });
    }
});


// --- SISTEMA DE RECUPERACIÓN DE CONTRASEÑA ---

// 1. Solicitar código (Genera un código de 6 dígitos aleatorio)
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario) {
            // Por seguridad, no decimos si el email existe o no, pero aquí devolvemos success para no dar pistas
            return res.json({ success: true, message: "Si el email existe, se procesará." });
        }

        // Generamos código de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        await prisma.usuario.update({
            where: { email },
            data: {
                codigo_recuperacion: codigo,
                expiracion_codigo: expiracion
            }
        });

        console.log(`[RECOVERY] Código para ${email}: ${codigo}`); // LOG PARA PRUEBAS (En producción se enviaría un email)

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar solicitud' });
    }
});

// 2. Resetear contraseña (Verifica el código y actualiza)
app.post('/api/reset-password', async (req, res) => {
    const { email, codigo, nuevaPassword } = req.body;

    try {
        const usuario = await prisma.usuario.findUnique({ where: { email } });

        if (!usuario || usuario.codigo_recuperacion !== codigo) {
            return res.status(400).json({ error: 'Código inválido' });
        }

        if (new Date() > usuario.expiracion_codigo) {
            return res.status(400).json({ error: 'Código expirado' });
        }

        // Hasheamos la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(nuevaPassword, salt);

        await prisma.usuario.update({
            where: { email },
            data: {
                password_hash: passwordHash,
                codigo_recuperacion: null, // Limpiamos el código usado
                expiracion_codigo: null
            }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al resetear contraseña' });
    }
});
// Obtener perfil completo
app.get('/api/usuario/:id', async (req, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

        // No enviamos el password_hash por seguridad
        const { password_hash, ...datosPublicos } = usuario;
        res.json(datosPublicos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ARRANCAR SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor RumboFit corriendo en http://0.0.0.0:${PORT}`);
});