const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Configuración de Email (Nodemailer)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: (process.env.EMAIL_PORT == 465), // true para 465, false para otros
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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

async function buscarEjercicioInteligente(grupo, nivelUsuario, edad, objetivo, excluidos = []) {
    const age = parseInt(edad) || 25;

    let filtros = {
        grupo_muscular: { contains: grupo, mode: 'insensitive' },
        id: { notIn: excluidos }
    };

    // --- REGLAS DE MATERIAL Y NIVEL ---
    if (age >= 65) {
        filtros.es_senior_safe = true;
        filtros.material = { in: ['Maquina', 'Polea', 'Peso Corporal'] };
    } 
    else {
        if (nivelUsuario === 'Principiante') {
            // Priorizamos máquinas y poleas para principiantes
            filtros.material = { in: ['Maquina', 'Polea', 'Peso Corporal'] };
        } else if (nivelUsuario === 'Atleta') {
            // Los atletas usan más peso libre
            filtros.material = { in: ['Barra', 'Mancuerna', 'Peso Corporal'] };
        }
        
        if (age < 18) {
            filtros.material = { not: 'Barra' }; // Crecimiento seguro
        }

        if (nivelesCompatibles[nivelUsuario]) {
            filtros.nivel_minimo = { in: nivelesCompatibles[nivelUsuario] };
        }
    }

    const candidatos = await prisma.ejercicio.findMany({ where: filtros });
    if (candidatos.length === 0) {
        // Fallback: si no hay con filtros estrictos, buscamos cualquier ejercicio del grupo
        const fallback = await prisma.ejercicio.findMany({ 
            where: { grupo_muscular: { contains: grupo, mode: 'insensitive' }, id: { notIn: excluidos } } 
        });
        if (fallback.length === 0) return null;
        return formatEjercicio(fallback[Math.floor(Math.random() * fallback.length)], objetivo);
    }

    const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
    return formatEjercicio(elegido, objetivo);
}

function formatEjercicio(ejercicio, objetivo) {
    let series = 3;
    let reps = "12";

    const obj = (objetivo || "").toLowerCase();
    if (obj.includes("masa") || obj.includes("hipertrofia")) {
        series = 4;
        reps = "8-12";
    } else if (obj.includes("peso") || obj.includes("bajar de peso")) {
        series = 3;
        reps = "15-20";
    } else if (obj.includes("fuerza")) {
        series = 5;
        reps = "3-5";
    } else if (obj.includes("salud") || obj.includes("mantenimiento")) {
        series = 3;
        reps = "12-15";
    }

    return {
        id: ejercicio.id,
        texto: `${ejercicio.nombre} ${series}x${reps}`
    };
}



async function generarJSONRutina(nivel, daysNum, ageNum, objetivo) {
    let metodologia = 'Full Body';
    let explicacion = '';
    let esquema = {}; // Día -> [{grupo, cantidad}]

    // 1. DETERMINAR METODOLOGÍA SEGÚN DÍAS (Requisito estricto)
    if (daysNum <= 2) {
        metodologia = 'Full Body';
        explicacion = `Al entrenar ${daysNum} ${daysNum === 1 ? 'día' : 'días'} por semana, la metodología Full Body es ideal para trabajar todo el cuerpo en cada sesión y maximizar la recuperación de tu nivel ${nivel}.`;
        esquema = {
            "Total Body": [
                { grupo: "Piernas", cant: 2 },
                { grupo: "Pecho", cant: 1 },
                { grupo: "Espalda", cant: 1 },
                { grupo: "Hombros", cant: 1 },
                { grupo: "Brazos", cant: 1 },
                { grupo: "Core", cant: 1 }
            ]
        };
    } else if (daysNum <= 4) {
        metodologia = 'Torso / Pierna';
        explicacion = `Con una frecuencia de ${daysNum} días, la división Torso/Pierna permite una mayor intensidad por grupo muscular, ideal para tu objetivo de ${objetivo || 'bienestar'}.`;
        esquema = {
            "Torso": [
                { grupo: "Pecho", cant: 2 },
                { grupo: "Espalda", cant: 2 },
                { grupo: "Hombros", cant: 1 },
                { grupo: "Brazos", cant: 1 }
            ],
            "Pierna": [
                { grupo: "Piernas", cant: 3 },
                { grupo: "Core", cant: 2 },
                { grupo: "Movilidad", cant: 1 }
            ]
        };
    } else {
        metodologia = 'Push / Pull / Legs';
        explicacion = `Para un perfil ${nivel} con disponibilidad de ${daysNum} días, la metodología PPL ofrece la máxima especialización y volumen para alcanzar tu meta de ${objetivo || 'forma física'}.`;
        esquema = {
            "Push": [
                { grupo: "Pecho", cant: 2 },
                { grupo: "Hombros", cant: 2 },
                { grupo: "Tríceps", cant: 1 }
            ],
            "Pull": [
                { grupo: "Espalda", cant: 3 },
                { grupo: "Bíceps", cant: 1 },
                { grupo: "Core", cant: 1 }
            ],
            "Legs": [
                { grupo: "Piernas", cant: 3 },
                { grupo: "Core", cant: 1 }
            ]
        };
    }

    // Ajuste de cantidad por nivel (Atletas hacen +1 ejercicio en grupos principales)
    if (nivel === 'Atleta') {
        Object.keys(esquema).forEach(dia => {
            esquema[dia][0].cant += 1; // Más volumen en el primer grupo
        });
    }

    let rutinaFinal = {};
    const nombresDiasEsquema = Object.keys(esquema);

    for (let i = 0; i < daysNum; i++) {
        const diaIndex = i % nombresDiasEsquema.length;
        const nombreBaseDia = nombresDiasEsquema[diaIndex];
        const gruposConfig = esquema[nombreBaseDia];
        
        let ejerciciosDia = [];
        let idsUsadosEnDia = [];

        for (const config of gruposConfig) {
            for (let c = 0; c < config.cant; c++) {
                const res = await buscarEjercicioInteligente(config.grupo, nivel, ageNum, objetivo, idsUsadosEnDia);
                if (res) {
                    ejerciciosDia.push(res.texto);
                    idsUsadosEnDia.push(res.id);
                }
            }
        }
        rutinaFinal[`Día ${i + 1} (${nombreBaseDia})`] = ejerciciosDia;
    }

    return { metodo: metodologia, subtitulo: explicacion, rutina: rutinaFinal };
}



app.post('/api/rutinas/generar', async (req, res) => {
    const { userId, peso, altura, edad, objetivo, dias, experiencia } = req.body;

    try {
        const ageNum = parseInt(edad);
        const weightNum = parseFloat(peso);
        const heightNum = parseInt(altura);
        const daysNum = parseInt(dias);

        if (ageNum < 10 || ageNum > 117 || weightNum < 20 || weightNum > 400 || heightNum < 50 || heightNum > 300 || daysNum < 1 || daysNum > 7) {
            return res.status(400).json({ error: 'Datos físicos fuera de los rangos permitidos (HU-04)' });
        }

        const usuario = await prisma.usuario.findUnique({ where: { id: parseInt(userId) } });
        const nivel = experiencia || usuario?.nivel || 'Principiante';

        const resultado = await generarJSONRutina(nivel, daysNum, ageNum, objetivo || usuario?.objetivo);

        // --- PERSISTENCIA ---
        await prisma.usuario.update({
            where: { id: parseInt(userId) },
            data: { peso: weightNum, altura: heightNum, edad: ageNum, nivel: nivel, objetivo: objetivo, frecuencia_semanal: daysNum }
        });

        const rutinaExistente = await prisma.rutina.findFirst({ where: { usuario_id: parseInt(userId) } });
        if (!rutinaExistente) {
            await prisma.rutina.create({
                data: { usuario_id: parseInt(userId), nombre: resultado.metodo, tipo_rutina: nivel, es_generada: true }
            });
        }

        res.json({ success: true, ...resultado });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: true, 
            metodo: 'Full Body (Modo Emergencia)',
            subtitulo: 'Asignada por defecto tras un error técnico para asegurar tu entrenamiento.',
            rutina: { "Rutina Básica": ["Pecho 3x12", "Espalda 3x12", "Piernas 3x12"] }
        });
    }
});

// NUEVO: Obtener perfil de usuario completo
app.get('/api/usuarios/:id', async (req, res) => {
    const userId = parseInt(req.params.id);

    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: userId },
            select: {
                id: true,
                nombre: true,
                email: true,
                telefono: true,
                peso: true,
                altura: true,
                edad: true,
                sexo: true,
                frecuencia_semanal: true,
                objetivo: true,
                nivel: true,
                fecha_registro: true
            }
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json({ success: true, usuario });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al recuperar datos del perfil" });
    }
});

// NUEVO: Obtener la rutina de un usuario existente
app.get('/api/usuarios/:id/rutina', async (req, res) => {
    const userId = parseInt(req.params.id);

    try {
        const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

        // Verificamos si tiene el registro de rutina
        const rutinaReg = await prisma.rutina.findFirst({ where: { usuario_id: userId } });
        if (!rutinaReg) return res.status(404).json({ error: "El usuario no tiene una rutina asignada" });

        // Regeneramos el JSON basado en sus datos actuales
        const daysNum = usuario.frecuencia_semanal || 3;
        const resultado = await generarJSONRutina(usuario.nivel || 'Principiante', daysNum, usuario.edad || 25, usuario.objetivo);

        res.json({ success: true, ...resultado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al recuperar la rutina" });
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

        // --- ENVÍO DE EMAIL REAL CON NODEMAILER ---
        const mailOptions = {
            from: `"RumboFit Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Recuperación de Contraseña - RumboFit',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ff7a00; border-radius: 10px; overflow: hidden;">
                    <div style="background-color: #ff7a00; color: white; padding: 20px; text-align: center;">
                        <h1>RumboFit</h1>
                    </div>
                    <div style="padding: 20px; color: #333;">
                        <p>Hola,</p>
                        <p>Has solicitado restablecer tu contraseña en <strong>RumboFit</strong>. Utiliza el siguiente código para completar el proceso:</p>
                        <div style="background-color: #f3f3f3; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ff7a00; border-radius: 5px; margin: 20px 0;">
                            ${codigo}
                        </div>
                        <p>Este código expirará en 15 minutos.</p>
                        <p>Si no has solicitado este cambio, puedes ignorar este correo de forma segura.</p>
                        <br>
                        <p>¡A por tus objetivos!</p>
                        <p>El equipo de RumboFit</p>
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`[RECOVERY] Email enviado con éxito a ${email}`);
            res.json({ success: true });
        } catch (emailError) {
            console.error("Error al enviar email:", emailError);
            // Si falla el envío de email, mostramos el código en consola como backup para el desarrollador
            console.log(`[RECOVERY] BACKUP - Código para ${email}: ${codigo}`);
            res.status(500).json({ error: 'No se pudo enviar el correo de recuperación' });
        }
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


// --- ARRANCAR SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor RumboFit corriendo en http://0.0.0.0:${PORT}`);
});