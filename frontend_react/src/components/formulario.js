import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/formulario.css'; // Importa el CSS que tienes en la carpeta styles

const Formulario = () => {
    const navigate = useNavigate();

    // ESTADOS: Sustituyen a las variables sueltas y clases manuales
    const [sexo, setSexo] = useState(null);
    const [objetivo, setObjetivo] = useState(null);
    const [datos, setDatos] = useState({
        peso: '',
        altura: '',
        edad: '',
        dias: ''
    });

    // Manejar cambios en los inputs
    const handleChange = (e) => {
        setDatos({
            ...datos,
            [e.target.id]: e.target.value
        });
    };

    // FUNCIÓN ENVIAR (Con datos de prueba para que puedas testear ahora mismo)
    const enviar = async () => {
        // Validación básica
        if (!datos.peso || !objetivo || !sexo) {
            alert("Por favor, completa los campos principales");
            return;
        }

        // SIMULACIÓN DE BACKEND (Para que funcione sin Python por ahora para probar el frontend)
        const dataSimulada = {
            metodo: `Plan para ${objetivo}`,
            rutina: {
                "Lunes": ["Press Banca 3x10", "Aperturas 3x12","Remo con barra 3x10", "Dominadas 3xMAX"],
                "Martes": ["Sentadillas 4x8", "Prensa 3x12","Remo con barra 3x10",  "Aperturas 3x12"],
                "Jueves": ["Remo con barra 3x10", "Dominadas 3xMAX", "Press Banca 3x10", "Aperturas 3x12"]
            }
        };

        // Guardar en localStorage
        localStorage.setItem("rutina", JSON.stringify(dataSimulada));

        // Ir a página resultados
        navigate("/rutina");
    };

    return (
        <div className="card">
            <div className="logo">
                <img src="/images/logo1.png" alt="logo" />
            </div>

            <h1>¡Bienvenido!</h1>
            <p className="subtitle">Cuéntanos sobre ti para crear tu plan personalizado</p>

            <label>Peso (kg)</label>
            <input id="peso" placeholder="Ej: 70" onChange={handleChange} />

            <label>Altura (cm)</label>
            <input id="altura" placeholder="Ej: 175" onChange={handleChange} />

            <label>Edad (años)</label>
            <input id="edad" placeholder="Ej: 25" onChange={handleChange} />

            <label>Sexo</label>
            <div className="sexo">
                <button
                    className={sexo === "masculino" ? "active" : ""}
                    onClick={() => setSexo("masculino")}
                >Masculino</button>
                <button
                    className={sexo === "femenino" ? "active" : ""}
                    onClick={() => setSexo("femenino")}
                >Femenino</button>
            </div>

            <label>Frecuencia de entrenamiento</label>
            <input id="dias" placeholder="Ej: 4" onChange={handleChange} />

            <label>Objetivo</label>
            <div className="objetivo">
                <button
                    className={objetivo === "masa" ? "active" : ""}
                    onClick={() => setObjetivo("masa")}
                >💪 Subir masa muscular</button>
                <button
                    className={objetivo === "definicion" ? "active" : ""}
                    onClick={() => setObjetivo("definicion")}
                >🔥 Bajar de peso</button>
                <button
                    className={objetivo === "mantenimiento" ? "active" : ""}
                    onClick={() => setObjetivo("mantenimiento")}
                >⚖️ Mantenimiento</button>
            </div>

            <button className="submit" onClick={enviar}>Generar mi plan personalizado</button>
        </div>
    );
};

export default Formulario;