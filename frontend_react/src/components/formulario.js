import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/formulario.css';

const Formulario = () => {
    const [datos, setDatos] = useState({ peso: '', altura: '', edad: '', dias: '' });
    const [sexo, setSexo] = useState(null);
    const [objetivo, setObjetivo] = useState(null);
    const navigate = useNavigate();

    const handleInput = (e) => setDatos({ ...datos, [e.target.id]: e.target.value });

    const enviar = async () => {
        const res = await fetch("http://localhost:8000/generar_rutina", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ ...datos, sexo, objetivo })
        });
        const data = await res.json();
        localStorage.setItem("rutina", JSON.stringify(data));
        navigate('/rutina');
    };

    return (
        <div className="card">
            <h1>¡Bienvenido!</h1>
            <label>Peso (kg)</label>
            <input id="peso" placeholder="Ej: 70" onChange={handleInput} />
            <label>Sexo</label>
            <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                <button className={sexo === 'masculino' ? 'active' : ''} onClick={() => setSexo('masculino')}>Masculino</button>
                <button className={sexo === 'femenino' ? 'active' : ''} onClick={() => setSexo('femenino')}>Femenino</button>
            </div>
            <label>Objetivo</label>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px'}}>
                <button className={objetivo === 'masa' ? 'active' : ''} onClick={() => setObjetivo('masa')}>💪 Subir masa</button>
                <button className={objetivo === 'definicion' ? 'active' : ''} onClick={() => setObjetivo('definicion')}>🔥 Bajar peso</button>
            </div>
            <button className="active" style={{width: '100%', background: 'linear-gradient(135deg, #ff7a00, #ffb300)'}} onClick={enviar}>
                Generar mi plan personalizado
            </button>
        </div>
    );
};

export default Formulario;