const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

//CONFIGURACIÓN BD
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'rumbofit',
    password: 'TU_PASSWORD_REAL',
    port: 5432,
});

//MOTOR DE RUTINAS (HU-05)
function generarPlan(frecuencia, objetivo) {
    let rutina = (frecuencia <= 3)
        ? "Full Body"
        : "Torso-Pierna (Upper-Lower)";

    let descripcion = "";

    if (objetivo === "definir") {
        descripcion = "Enfoque en quema de grasa";
    } else if (objetivo === "volumen") {
        descripcion = "Enfoque en hipertrofia";
    } else {
        descripcion = "Mantenimiento equilibrado";
    }

    return { rutina, descripcion };
}

//REGISTRO
app.post('/register', async (req, res) => {
    const { nombre, email, telefono, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (nombre, email, telefono, password) VALUES ($1, $2, $3, $4) RETURNING id',
            [nombre, email, telefono, hashedPassword]
        );

        res.json({ success: true, userId: result.rows[0].id });

    } catch (err) {
        res.status(400).json({ error: "Email ya existe o error en registro" });
    }
});

//LOGIN
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }

        res.json({ success: true, user });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//RECUPERAR CONTRASEÑA
app.post('/recuperar-password', async (req, res) => {
    const { email, nuevaPassword } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

        await pool.query(
            'UPDATE users SET password = $1 WHERE email = $2',
            [hashedPassword, email]
        );

        res.json({ success: true, message: "Contraseña actualizada" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//DIAGNÓSTICO + HU-05
app.post('/diagnostico', async (req, res) => {
    const { user_id, peso, altura, edad, sexo, frecuencia, objetivo } = req.body;

    const { rutina, descripcion } = generarPlan(frecuencia, objetivo);

    try {
        await pool.query(
            `INSERT INTO diagnostico
            (user_id, peso, altura, edad, sexo, frecuencia, objetivo, rutina)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [user_id, peso, altura, edad, sexo, frecuencia, objetivo, rutina]
        );

        res.json({ rutina, descripcion });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//SERVIDOR
app.listen(3000, () => {
    console.log('Server en http://localhost:3000');
});