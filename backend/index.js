const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de la base de datos [basado en cite: 1]
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'rumbofit',
    password: 'tu_password',
    port: 5432,
});

// Lógica del Motor de Rutinas [migrado de cite: 4]
function generarPlan(frecuencia, objetivo) {
    let rutina = (frecuencia <= 3) ? "Full Body" : "Torso-Pierna (Upper-Lower)";
    let descripcion = "";

    if (objetivo === "definir") descripcion = "Enfoque en quema de grasa";
    else if (objetivo === "volumen") descripcion = "Enfoque en hipertrofia";
    else descripcion = "Mantenimiento equilibrado";

    return { rutina, descripcion };
}

// ENDPOINT: Registro [migrado de cite: 5]
app.post('/register', async (req, res) => {
    const { nombre, email, telefono, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const result = await pool.query(
            'INSERT INTO users (nombre, email, telefono, password) VALUES ($1, $2, $3, $4) RETURNING id',
            [nombre, email, telefono, hashedPassword]
        );
        res.json({ success: true, userId: result.rows[0].id });
    } catch (err) {
        res.status(400).json({ error: "Email ya existe" });
    }
});

// ENDPOINT: Login [migrado de cite: 3]
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
        const valid = await bcrypt.compare(password, result.rows[0].password);
        if (valid) return res.json({ success: true, user: result.rows[0] });
    }
    res.status(401).json({ error: "Credenciales incorrectas" });
});

// ENDPOINT: Guardar Formulario y Generar Rutina [migrado de cite: 2]
app.post('/diagnostico', async (req, res) => {
    const { user_id, peso, altura, edad, sexo, frecuencia, objetivo } = req.body;
    const { rutina, descripcion } = generarPlan(frecuencia, objetivo);

    try {
        await pool.query(
            'INSERT INTO diagnostico (user_id, peso, altura, edad, sexo, frecuencia, objetivo, rutina) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [user_id, peso, altura, edad, sexo, frecuencia, objetivo, rutina]
        );
        res.json({ rutina, descripcion });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('🚀 Server en http://localhost:3000'));