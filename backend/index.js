const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const {
    listDocuments,
    getDocument,
    setDocument,
    deleteDocument
} = require('./firestore');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rumbofit_secret_key_2024';

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

const SOCIAL_FOLLOWERS_COLLECTION = 'social_followers';
const SOCIAL_POSTS_COLLECTION = 'social_posts';

const limpiarDocFirebase = ({ _docId, ...data }) => data;

function normalizarPublicacionFirebase(post) {
    return {
        id: Number(post.id),
        usuario_id: Number(post.usuario_id),
        entrenamiento_id: post.entrenamiento_id ? Number(post.entrenamiento_id) : null,
        titulo: post.titulo || '',
        descripcion: post.descripcion || '',
        fecha_publicacion: post.fecha_publicacion || new Date().toISOString(),
        imagenes: Array.isArray(post.imagenes) ? post.imagenes : [],
        autor_nombre: post.autor_nombre || '',
        autor_foto: post.autor_foto || '',
        _count: {
            me_gusta: post?._count?.me_gusta || 0
        }
    };
}

function mapPrismaPostToSocial(post) {
    return normalizarPublicacionFirebase({
        ...post,
        autor_nombre: post.usuario?.nombre || post.autor_nombre || '',
        autor_foto: post.usuario?.foto_perfil || post.autor_foto || '',
        imagenes: Array.isArray(post.imagenes)
            ? post.imagenes.map((img, index) => ({
                id: img.id || index + 1,
                url: img.url,
                orden: img.orden || index
            }))
            : []
    });
}

async function syncFollowersFromPrisma(userId) {
    const seguidores = await prisma.seguidor.findMany({
        where: {
            OR: [
                { seguidor_id: userId },
                { seguido_id: userId }
            ]
        }
    });

    for (const seguimiento of seguidores) {
        await setDocument(SOCIAL_FOLLOWERS_COLLECTION, `${seguimiento.seguidor_id}_${seguimiento.seguido_id}`, {
            seguidor_id: seguimiento.seguidor_id,
            seguido_id: seguimiento.seguido_id,
            fecha: seguimiento.fecha?.toISOString?.() || new Date().toISOString()
        });
    }
}

async function syncPostsFromPrisma(userId) {
    const posts = await prisma.publicacion.findMany({
        where: { usuario_id: userId },
        include: {
            imagenes: true,
            _count: { select: { me_gusta: true } },
            usuario: {
                select: {
                    nombre: true,
                    foto_perfil: true
                }
            }
        },
        orderBy: { fecha_publicacion: 'desc' }
    });

    for (const post of posts) {
        await setDocument(SOCIAL_POSTS_COLLECTION, String(post.id), normalizarPublicacionFirebase({
            ...post,
            autor_nombre: post.usuario?.nombre || '',
            autor_foto: post.usuario?.foto_perfil || ''
        }));
    }
}

async function syncAllPostsFromPrisma() {
    const posts = await prisma.publicacion.findMany({
        include: {
            imagenes: true,
            _count: { select: { me_gusta: true } },
            usuario: {
                select: {
                    nombre: true,
                    foto_perfil: true
                }
            }
        },
        orderBy: { fecha_publicacion: 'desc' }
    });

    for (const post of posts) {
        await setDocument(SOCIAL_POSTS_COLLECTION, String(post.id), normalizarPublicacionFirebase({
            ...post,
            autor_nombre: post.usuario?.nombre || '',
            autor_foto: post.usuario?.foto_perfil || ''
        }));
    }
}

async function getFirebaseFollowersForUser(userId) {
    await syncFollowersFromPrisma(userId);
    const allFollowers = await listDocuments(SOCIAL_FOLLOWERS_COLLECTION);
    return allFollowers
        .map(limpiarDocFirebase)
        .filter((item) => Number(item.seguidor_id) === userId || Number(item.seguido_id) === userId);
}

async function getFirebasePostsForUser(userId) {
    await syncPostsFromPrisma(userId);
    const allPosts = await listDocuments(SOCIAL_POSTS_COLLECTION);
    return allPosts
        .map((item) => normalizarPublicacionFirebase(limpiarDocFirebase(item)))
        .filter((post) => Number(post.usuario_id) === userId)
        .sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));
}

async function getFirebaseFeed() {
    await syncAllPostsFromPrisma();
    const allPosts = await listDocuments(SOCIAL_POSTS_COLLECTION);
    return allPosts
        .map((item) => normalizarPublicacionFirebase(limpiarDocFirebase(item)))
        .sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));
}

async function getPrismaPostsForUser(userId) {
    const posts = await prisma.publicacion.findMany({
        where: { usuario_id: userId },
        include: {
            imagenes: true,
            _count: { select: { me_gusta: true } },
            usuario: {
                select: {
                    nombre: true,
                    foto_perfil: true
                }
            }
        },
        orderBy: { fecha_publicacion: 'desc' }
    });
    return posts.map(mapPrismaPostToSocial);
}

async function getPrismaFeed() {
    const posts = await prisma.publicacion.findMany({
        include: {
            imagenes: true,
            _count: { select: { me_gusta: true } },
            usuario: {
                select: {
                    nombre: true,
                    foto_perfil: true
                }
            }
        },
        orderBy: { fecha_publicacion: 'desc' }
    });
    return posts.map(mapPrismaPostToSocial);
}

async function getSocialPostsForUser(userId) {
    try {
        return await getFirebasePostsForUser(userId);
    } catch (error) {
        console.error('Firestore user posts failed, fallback Prisma:', error.message);
        return getPrismaPostsForUser(userId);
    }
}

async function getSocialFeed() {
    try {
        return await getFirebaseFeed();
    } catch (error) {
        console.error('Firestore feed failed, fallback Prisma:', error.message);
        return getPrismaFeed();
    }
}

async function getSocialCounts(userId) {
    try {
        return await buildSocialCounts(userId);
    } catch (error) {
        console.error('Firestore social counts failed, fallback Prisma:', error.message);
        const usuario = await prisma.usuario.findUnique({
            where: { id: userId },
            include: {
                _count: {
                    select: {
                        seguidores: true,
                        seguidos: true,
                        publicaciones: true,
                        rutinas: true
                    }
                }
            }
        });
        return usuario?._count || { seguidores: 0, seguidos: 0, publicaciones: 0, rutinas: 0 };
    }
}

async function buildSocialCounts(userId) {
    const [followers, posts, rutinas] = await Promise.all([
        getFirebaseFollowersForUser(userId),
        getFirebasePostsForUser(userId),
        prisma.rutina.count({ where: { usuario_id: userId } })
    ]);

    return {
        seguidores: followers.filter((item) => Number(item.seguido_id) === userId).length,
        seguidos: followers.filter((item) => Number(item.seguidor_id) === userId).length,
        publicaciones: posts.length,
        rutinas
    };
}

// --- RUTAS ---

// Registro
// Localiza tu ruta de Registro y cámbiala por esta:
app.post('/api/register', async (req, res) => {
    console.log("Petición recibida en /api/register:", req.body);
    // 1. Agregamos 'sexo' a la extracción de datos
    const { nombre, email, password, telefono, sexo } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const nuevoUsuario = await prisma.usuario.create({
            data: {
                nombre: nombre,
                email: email,
                password_hash: passwordHash,
                telefono: String(telefono),
                sexo: sexo // 2. Guardamos el sexo en la base de datos
            },
        });

        const token = jwt.sign(
            { id: nuevoUsuario.id, email: nuevoUsuario.email },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            token: token,
            user: {
                id: nuevoUsuario.id,
                nombre: nuevoUsuario.nombre,
                email: nuevoUsuario.email,
                sexo: nuevoUsuario.sexo
            }
        });
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

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token: token,
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

// Catálogo de alimentos (HU-11)
app.get('/api/alimentos', async (req, res) => {
    try {
        const alimentos = await prisma.alimento.findMany({
            orderBy: { nombre: 'asc' }
        });
        res.json(alimentos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener catálogo de alimentos' });
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
            data: { peso: weightNum, altura: heightNum, edad: ageNum, nivel: nivel, objetivo: objetivo, frecuencia_semanal: daysNum, sexo: req.body.sexo}
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

// OBTENER PERFIL (Asegúrate de poner /api/)
app.get('/api/usuarios/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: userId }
        });
        if (!usuario) return res.status(404).json({ success: false, error: "No encontrado" });
        const socialCounts = await getSocialCounts(userId);
        res.json({ success: true, usuario: { ...usuario, _count: socialCounts } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ACTUALIZAR PERFIL (Asegúrate de poner /api/)
app.put('/api/usuarios/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    const { nombre, email, telefono, peso, altura, edad, sexo, objetivo, nivel, frecuencia_semanal, foto_perfil } = req.body;

    try {
        const usuarioActualizado = await prisma.usuario.update({
            where: { id: userId },
            data: {
                nombre: nombre || undefined,
                email: email || undefined,
                telefono: telefono || undefined,
                peso: peso ? Number(peso) : undefined,
                altura: altura ? Number(altura) : undefined,
                edad: edad ? Number(edad) : undefined,
                sexo: sexo || undefined,
                objetivo: objetivo || undefined,
                nivel: nivel || undefined,
                frecuencia_semanal: frecuencia_semanal ? Number(frecuencia_semanal) : undefined,
                foto_perfil: foto_perfil || undefined,
            },
        });

        res.json({ success: true, message: "Perfil actualizado", usuario: usuarioActualizado });
    } catch (error) {
        console.error("Error en PUT:", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, error: "El email ya está registrado por otro usuario" });
        }
        res.status(500).json({ success: false, error: "Error al actualizar en DB" });
    }
});

// --- SISTEMA SOCIAL (HU-14) ---

// Seguir a un usuario
app.post('/api/usuarios/follow', async (req, res) => {
    const { seguidorId, seguidoId } = req.body;
    try {
        const followerId = parseInt(seguidorId);
        const followedId = parseInt(seguidoId);

        if (!followerId || !followedId || followerId === followedId) {
            return res.status(400).json({ error: "Seguimiento no válido" });
        }

        await setDocument(SOCIAL_FOLLOWERS_COLLECTION, `${followerId}_${followedId}`, {
            seguidor_id: followerId,
            seguido_id: followedId,
            fecha: new Date().toISOString()
        });
        res.json({ success: true, message: "Ahora sigues a este usuario" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al seguir usuario" });
    }
});

// Dejar de seguir a un usuario
app.post('/api/usuarios/unfollow', async (req, res) => {
    const { seguidorId, seguidoId } = req.body;
    try {
        await syncFollowersFromPrisma(parseInt(seguidorId));
        await syncFollowersFromPrisma(parseInt(seguidoId));
        await deleteDocument(
            SOCIAL_FOLLOWERS_COLLECTION,
            `${parseInt(seguidorId)}_${parseInt(seguidoId)}`
        );
        res.json({ success: true, message: "Has dejado de seguir a este usuario" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al dejar de seguir" });
    }
});

// Verificar si un usuario sigue a otro
app.get('/api/usuarios/:seguidorId/sigue/:seguidoId', async (req, res) => {
    try {
        const followerId = parseInt(req.params.seguidorId);
        const followedId = parseInt(req.params.seguidoId);

        await syncFollowersFromPrisma(followerId);
        await syncFollowersFromPrisma(followedId);

        const seguimiento = await getDocument(
            SOCIAL_FOLLOWERS_COLLECTION,
            `${followerId}_${followedId}`
        );
        res.json({ siguiendo: !!seguimiento });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al verificar seguimiento" });
    }
});

// --- SISTEMA DE PUBLICACIONES (HU-16) ---

// Obtener publicaciones de un usuario
app.get('/api/usuarios/:id/publicaciones', async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
        const posts = await getSocialPostsForUser(userId);
        res.json({ success: true, publicaciones: posts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener publicaciones" });
    }
});

// Eliminar una publicación
app.get('/api/publicaciones', async (req, res) => {
    try {
        const publicaciones = await getSocialFeed();
        res.json({ success: true, publicaciones });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el feed" });
    }
});

app.post('/api/publicaciones', async (req, res) => {
    try {
        const { userId, titulo, nombre, descripcion, imagen } = req.body;
        const usuarioId = parseInt(userId);
        const tituloFinal = (titulo || nombre || '').trim();
        const descripcionFinal = (descripcion || '').trim();

        if (!usuarioId) {
            return res.status(400).json({ error: "Falta el usuario" });
        }

        if (!tituloFinal) {
            return res.status(400).json({ error: "El nombre de la publicación es obligatorio" });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { id: usuarioId },
            select: { nombre: true, foto_perfil: true }
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        const postId = Date.now();
        const publicacion = normalizarPublicacionFirebase({
            id: postId,
            usuario_id: usuarioId,
            titulo: tituloFinal,
            descripcion: descripcionFinal,
            fecha_publicacion: new Date().toISOString(),
            imagenes: imagen ? [{ id: 1, url: imagen, orden: 0 }] : [],
            autor_nombre: usuario.nombre,
            autor_foto: usuario.foto_perfil || '',
            _count: { me_gusta: 0 }
        });

        try {
            await setDocument(SOCIAL_POSTS_COLLECTION, String(postId), publicacion);
            res.status(201).json({ success: true, publicacion });
        } catch (firebaseError) {
            console.error('Firestore create post failed, fallback Prisma:', firebaseError.message);
            const created = await prisma.publicacion.create({
                data: {
                    usuario_id: usuarioId,
                    titulo: tituloFinal,
                    descripcion: descripcionFinal,
                    imagenes: imagen ? { create: [{ url: imagen, orden: 0 }] } : undefined
                },
                include: {
                    imagenes: true,
                    _count: { select: { me_gusta: true } },
                    usuario: {
                        select: {
                            nombre: true,
                            foto_perfil: true
                        }
                    }
                }
            });
            res.status(201).json({ success: true, publicacion: mapPrismaPostToSocial(created) });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear la publicación" });
    }
});

app.delete('/api/publicaciones/:id', async (req, res) => {
    const postId = parseInt(req.params.id);
    const { userId } = req.body; // Para verificar propiedad

    try {
        await syncPostsFromPrisma(parseInt(userId));
        const post = await getDocument(SOCIAL_POSTS_COLLECTION, String(postId));
        if (!post) return res.status(404).json({ error: "No encontrado" });
        if (Number(post.usuario_id) !== parseInt(userId)) return res.status(403).json({ error: "No autorizado" });

        await deleteDocument(SOCIAL_POSTS_COLLECTION, String(postId));
        res.json({ success: true, message: "Publicación eliminada" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar publicación" });
    }
});
// NUEVO: Obtener la rutina de un usuario existente
app.get('/api/usuarios/:id/rutina', async (req, res) => {
    const userId = parseInt(req.params.id);

    try {
        const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

        // Si ya tiene una rutina sugerida guardada (y modificada), la devolvemos
        if (usuario.rutina_sugerida) {
            return res.json({ success: true, ...JSON.parse(usuario.rutina_sugerida) });
        }

        // Si no, generamos una nueva
        const daysNum = usuario.frecuencia_semanal || 3;
        const resultado = await generarJSONRutina(usuario.nivel || 'Principiante', daysNum, usuario.edad || 25, usuario.objetivo);

        // La guardamos por primera vez para que sea persistente
        await prisma.usuario.update({
            where: { id: userId },
            data: { rutina_sugerida: JSON.stringify(resultado) }
        });

        res.json({ success: true, ...resultado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al recuperar la rutina" });
    }
});

// Guardar/Actualizar rutina sugerida modificada
app.put('/api/usuarios/:id/rutina-sugerida', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { esquema } = req.body;
        
        await prisma.usuario.update({
            where: { id: userId },
            data: { rutina_sugerida: JSON.stringify(esquema) }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error al guardar rutina sugerida" });
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
// Guardar rutina personalizada
app.post('/api/rutinas/guardar-personalizada', async (req, res) => {
    const { userId, nombreRutina, esquema } = req.body;
    try {
        const usuario = await prisma.usuario.findUnique({ where: { id: parseInt(userId) } });
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

        if (!usuario.es_premium) {
            const numRutinas = await prisma.rutina.count({
                where: { usuario_id: parseInt(userId), es_generada: false }
            });
            if (numRutinas >= 3) {
                return res.status(403).json({ error: "Límite alcanzado. Las cuentas gratuitas solo pueden tener hasta 3 rutinas." });
            }
        }

        let totalEjercicios = 0;
        if (esquema && esquema.ejercicios) {
            Object.values(esquema.ejercicios).forEach(dia => {
                if (Array.isArray(dia)) totalEjercicios += dia.length;
            });
        }
        if (totalEjercicios > 20) {
            return res.status(400).json({ error: "Límite superado. Una rutina no puede tener más de 20 ejercicios en total." });
        }

        const nuevaRutina = await prisma.rutina.create({
            data: {
                usuario_id: parseInt(userId),
                nombre: nombreRutina,
                es_generada: false,
                descripcion: JSON.stringify(esquema) // Guardamos el JSON de los días aquí
            }
        });
        res.json({ success: true, rutina: nuevaRutina });
    } catch (error) {
        res.status(500).json({ error: "Error al guardar rutina" });
    }
});

// Actualizar rutina existente
app.put('/api/rutinas/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, esquema } = req.body;
    try {
        const rutinaActualizada = await prisma.rutina.update({
            where: { id: parseInt(id) },
            data: {
                nombre: nombre || undefined,
                descripcion: JSON.stringify(esquema)
            }
        });
        res.json({ success: true, rutina: rutinaActualizada });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar rutina" });
    }
});

app.delete('/api/rutinas/:id', async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(req.query.userId || req.body?.userId);

    if (!userId) {
        return res.status(400).json({ success: false, error: "Falta el usuario." });
    }

    try {
        const rutina = await prisma.rutina.findFirst({
            where: {
                id: parseInt(id),
                usuario_id: userId,
                es_generada: false
            }
        });

        if (!rutina) {
            return res.status(404).json({ success: false, error: "Rutina no encontrada." });
        }

        await prisma.rutina.delete({
            where: { id: rutina.id }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: "Error al eliminar rutina" });
    }
});

// Listar rutinas de un usuario
app.get('/api/usuarios/:id/rutinas-guardadas', async (req, res) => {
    try {
        const rutinas = await prisma.rutina.findMany({
            where: { usuario_id: parseInt(req.params.id), es_generada: false }
        });
        res.json(rutinas);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener rutinas" });
    }
});


// --- SISTEMA DE HISTORIAL (HU-09, HU-10, HU-11, HU-12) ---

const normalizarTexto = (texto = '') =>
    texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

// Registrar Entrenamiento (HU-09)
app.post('/api/historial/entrenamiento', async (req, res) => {
    const { userId, rutinaId, ejercicios, fecha, hora, nombreEntrenamiento } = req.body; 
    try {
        const now = new Date();
        const fechaStr = fecha ? new Date(fecha).toISOString().split('T')[0] : now.toISOString().split('T')[0];
        const horaStr = hora || now.toTimeString().substring(0, 5);
        const ejerciciosPayload = Array.isArray(ejercicios) ? ejercicios : [];

        const catalogo = await prisma.ejercicio.findMany({
            select: { id: true, nombre: true }
        });

        const seriesParaCrear = [];
        ejerciciosPayload.forEach((ej) => {
            const ejercicioId = ej.ejercicioId
                || catalogo.find((item) => normalizarTexto(item.nombre) === normalizarTexto(ej.nombre))?.id;

            if (!ejercicioId || !Array.isArray(ej.series)) return;

            ej.series.forEach((s, idx) => {
                seriesParaCrear.push({
                    ejercicio_id: ejercicioId,
                    numero_serie: idx + 1,
                    peso_kg: Number(s.peso || 0),
                    ritmo: s.ritmo ? Number(s.ritmo) : null,
                    repeticiones_reales: parseInt(s.reps, 10) || 0
                });
            });
        });

        if (seriesParaCrear.length === 0) {
            return res.status(400).json({ error: "No hay ejercicios válidos para registrar" });
        }

        const entrenamiento = await prisma.entrenamiento.create({
            data: {
                usuario_id: parseInt(userId),
                rutina_id: rutinaId ? parseInt(rutinaId) : null,
                nombre: nombreEntrenamiento?.trim() || null,
                fecha_inicio: now,
                fecha_fin: now,
                fecha: new Date(fechaStr),
                hora: horaStr,
                series: {
                    create: seriesParaCrear
                }
            },
            include: { series: { include: { ejercicio: true } } }
        });
        const volumen = entrenamiento.series.reduce((acc, s) => acc + (Number(s.peso_kg) * s.repeticiones_reales), 0);
        await prisma.entrenamiento.update({
            where: { id: entrenamiento.id },
            data: { volumen_total_kg: volumen }
        });
        res.json({ success: true, id: entrenamiento.id, volumen, entrenamiento });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al registrar entrenamiento" });
    }
});

// Crear Alimento Personalizado (HU-11)
app.post('/api/alimentos', async (req, res) => {
    const { nombre, calorias_100g, proteinas_100g, carbohidratos_100g, grasas_100g } = req.body;
    try {
        const nuevoAlimento = await prisma.alimento.create({
            data: {
                nombre: nombre.trim(),
                calorias_100g: Number(calorias_100g) || 0,
                proteinas_100g: Number(proteinas_100g) || 0,
                carbohidratos_100g: Number(carbohidratos_100g) || 0,
                grasas_100g: Number(grasas_100g) || 0
            }
        });
        res.json({ success: true, alimento: nuevoAlimento });
    } catch (error) {
        console.error("Error al crear alimento:", error);
        if (error.code === 'P2002') {
            const existente = await prisma.alimento.findFirst({ where: { nombre: nombre.trim() } });
            return res.status(400).json({ success: false, error: "duplicado", alimento: existente });
        }
        res.status(500).json({ success: false, error: "Error al crear el alimento. Revisa los datos e inténtalo de nuevo." });
    }
});

// Registrar Comida COMPLETA (HU-11)
app.post('/api/dieta/comida', async (req, res) => {
    const { userId, titulo, items, franja, fecha, hora } = req.body;
    try {
        const now = new Date();
        const fechaStr = fecha ? new Date(fecha).toISOString().split('T')[0] : now.toISOString().split('T')[0];
        const horaStr = hora || now.toTimeString().substring(0, 5);

        const result = await prisma.comida.create({
            data: {
                usuario_id: parseInt(userId),
                titulo: titulo || "Sin título",
                fecha: new Date(fechaStr),
                hora: horaStr,
                franja_horaria: franja || 'Comida',
                items: {
                    create: items.map(it => ({
                        alimento_id: parseInt(it.alimentoId),
                        cantidad_gramos: Number(it.cantidad),
                        usuario_id: parseInt(userId) 
                    }))
                }
            },
            include: { items: { include: { alimento: true } } }
        });
        res.json({ success: true, comida: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al registrar la comida completa" });
    }
});

// Eliminar Comida (HU-11 - Papelera)
app.delete('/api/dieta/comida/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`[DEBUG] Petición DELETE para comida ID: ${id}`);
    try {
        const comidaId = parseInt(id);
        
        // 1. Borramos primero todos los ingredientes/alimentos de esa comida
        const resItems = await prisma.registro_Comidas.deleteMany({
            where: { comida_id: comidaId }
        });
        console.log(`[DEBUG] Alimentos borrados: ${resItems.count}`);

        // 2. Ahora que está vacía, borramos la comida (usamos deleteMany por seguridad)
        const resComida = await prisma.comida.deleteMany({
            where: { id: comidaId }
        });
        console.log(`[DEBUG] Registro de Comida borrado: ${resComida.count}`);

        res.json({ success: true, message: "Comida eliminada correctamente" });
    } catch (error) {
        console.error("[DEBUG] Error al eliminar comida completa:", error);
        res.status(500).json({ success: false, error: "Error al eliminar la comida" });
    }
});

// Eliminar un alimento individual de una comida (HU-11)
app.delete('/api/dieta/comida/:comidaId/item/:itemId', async (req, res) => {
    const comidaId = parseInt(req.params.comidaId);
    const itemId = parseInt(req.params.itemId);
    try {
        // Eliminar el item
        await prisma.registro_Comidas.delete({
            where: { id: itemId }
        });

        // Si la comida quedó sin items, eliminarla también
        const itemsRestantes = await prisma.registro_Comidas.count({
            where: { comida_id: comidaId }
        });
        if (itemsRestantes === 0) {
            await prisma.comida.delete({ where: { id: comidaId } });
            return res.json({ success: true, comidaEliminada: true });
        }

        res.json({ success: true, comidaEliminada: false });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar el alimento" });
    }
});

// Editar Comida (HU-11 - Lápiz)
app.put('/api/dieta/comida/:id', async (req, res) => {
    const { id } = req.params;
    const { titulo, items, franja, fecha, hora, userId } = req.body;
    try {
        // 1. Actualizar datos básicos de la comida
        await prisma.comida.update({
            where: { id: parseInt(id) },
            data: {
                titulo: titulo,
                franja_horaria: franja,
                fecha: fecha ? new Date(fecha) : undefined,
                hora: hora
            }
        });

        // 2. Actualizar ingredientes (borrar anteriores y crear nuevos)
        // Usamos una transacción para que si algo falla, no se borre nada
        await prisma.$transaction([
            prisma.registro_Comidas.deleteMany({ where: { comida_id: parseInt(id) } }),
            prisma.registro_Comidas.createMany({
                data: items.map(it => ({
                    comida_id: parseInt(id),
                    alimento_id: parseInt(it.alimentoId),
                    cantidad_gramos: Number(it.cantidad),
                    usuario_id: parseInt(userId)
                }))
            })
        ]);

        res.json({ success: true, message: "Comida actualizada correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar la comida" });
    }
});




// Obtener Historial Unificado (HU-10, HU-12)
app.get('/api/usuarios/:id/historial', async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
        const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

        let fechaLimite = null;
        if (!usuario.es_premium) {
            fechaLimite = new Date();
            fechaLimite.setMonth(fechaLimite.getMonth() - 3);
            fechaLimite.setHours(0, 0, 0, 0);
        }

        const entrenamientos = await prisma.entrenamiento.findMany({
            where: { usuario_id: userId, ...(fechaLimite && { fecha_inicio: { gte: fechaLimite } }) },
            include: { rutina: true, series: { include: { ejercicio: true } } },
            orderBy: { fecha_inicio: 'desc' }
        });

        const comidas = await prisma.comida.findMany({
            where: {
                usuario_id: userId,
                ...(fechaLimite && { fecha: { gte: fechaLimite } })
            },
            include: {
                items: {
                    include: {
                        alimento: true
                    }
                }
            },
            orderBy: [
                { fecha: 'desc' },
                { hora: 'desc' }
            ]
        });

        const historial = {};
        entrenamientos.forEach(e => {
            const fechaStr = e.fecha ? e.fecha.toISOString().split('T')[0] : e.fecha_inicio.toISOString().split('T')[0];
            if (!historial[fechaStr]) historial[fechaStr] = { entrenamientos: [], comidas: [] };
            historial[fechaStr].entrenamientos.push(e);
        });

        comidas.forEach(c => {
            const fechaStr = c.fecha.toISOString().split('T')[0];
            if (!historial[fechaStr]) historial[fechaStr] = { entrenamientos: [], comidas: [] };
            
            // Calculamos macros totales de la comida para que el frontend lo tenga fácil
            let kcal = 0, prot = 0, carb = 0, gras = 0;
            c.items.forEach(it => {
                const factor = Number(it.cantidad_gramos) / 100;
                kcal += Number(it.alimento.calorias_100g) * factor;
                prot += Number(it.alimento.proteinas_100g) * factor;
                carb += Number(it.alimento.carbohidratos_100g) * factor;
                gras += Number(it.alimento.grasas_100g) * factor;
            });

            historial[fechaStr].comidas.push({
                ...c,
                macros: { kcal, prot, carb, gras }
            });
        });


        res.json({ success: true, es_premium: usuario.es_premium, historial });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al recuperar historial" });
    }
});

// Eliminar un alimento individual de una comida
app.delete('/api/dieta/alimento/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`[DEBUG] Petición DELETE para alimento ID: ${id}`);
    try {
        const registroId = parseInt(id);
        const registro = await prisma.registro_Comidas.findUnique({
            where: { id: registroId },
            include: { comida: { include: { items: true } } }
        });

        if (!registro) {
            console.log(`[DEBUG] Registro ${registroId} no encontrado en findUnique`);
            return res.status(404).json({ success: false, error: "Registro no encontrado" });
        }

        const comidaId = registro.comida_id;
        const totalItems = registro.comida.items.length;

        // 1. Borramos el alimento
        const resItem = await prisma.registro_Comidas.deleteMany({ where: { id: registroId } });
        console.log(`[DEBUG] Alimento borrado: ${resItem.count}`);

        let comidaEliminada = false;
        // 2. Si era el último alimento, borramos la comida entera (con deleteMany por seguridad)
        if (totalItems <= 1) {
            const delResult = await prisma.comida.deleteMany({ where: { id: comidaId } });
            if (delResult.count > 0) {
                console.log(`[DEBUG] Comida ${comidaId} eliminada por ser el último alimento`);
                comidaEliminada = true;
            }
        }

        res.json({ success: true, comidaEliminada });
    } catch (error) {
        console.error("[DEBUG] Error al eliminar alimento:", error);
        res.status(500).json({ success: false, error: "Error al eliminar alimento" });
    }
});

// Actualizar gramos de un alimento en una comida
app.put('/api/dieta/alimento/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { cantidad_gramos } = req.body;
        if (!cantidad_gramos || isNaN(cantidad_gramos) || Number(cantidad_gramos) <= 0) {
            return res.status(400).json({ error: "Cantidad inválida" });
        }
        const updated = await prisma.registro_Comidas.update({
            where: { id },
            data: { cantidad_gramos: Number(cantidad_gramos) },
            include: { alimento: true }
        });
        res.json({ success: true, item: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar alimento" });
    }
});

// Añadir alimento individual a una comida existente
app.post('/api/dieta/comida/:id/alimento', async (req, res) => {
    try {
        const comidaId = parseInt(req.params.id);
        const { alimentoId, cantidad, userId } = req.body;
        if (!alimentoId || !userId) return res.status(400).json({ error: "Faltan parámetros" });
        const nuevo = await prisma.registro_Comidas.create({
            data: {
                comida_id: comidaId,
                alimento_id: parseInt(alimentoId),
                cantidad_gramos: Number(cantidad) || 100,
                usuario_id: parseInt(userId)
            },
            include: { alimento: true }
        });
        res.json({ success: true, item: nuevo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al añadir alimento a la comida" });
    }
});

// Obtener publicaciones propias del usuario
app.get('/api/publicaciones/usuario/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const publicaciones = await getFirebasePostsForUser(userId);
        res.json({ success: true, publicaciones });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al recuperar publicaciones" });
    }
});

// Eliminar una publicación
app.delete('/api/publicaciones/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.body?.userId ? parseInt(req.body.userId) : null;
        if (userId) {
            await syncPostsFromPrisma(userId);
        }
        const post = await getDocument(SOCIAL_POSTS_COLLECTION, String(id));
        if (!post) {
            return res.status(404).json({ error: "No encontrado" });
        }
        await deleteDocument(SOCIAL_POSTS_COLLECTION, String(id));
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar publicación" });
    }
});

// --- ARRANCAR SERVIDOR ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor RumboFit corriendo en http://10.195.60.198:${PORT}`);
});
