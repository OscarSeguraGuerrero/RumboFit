import React, { useState, useEffect } from 'react';
import './styles/rutina.css';

const Rutina = () => {
    const [data, setData] = useState(null);
    const [diaActual, setDiaActual] = useState(null);

    useEffect(() => {
        const rutinaGuardada = JSON.parse(localStorage.getItem("rutina"));
        if (rutinaGuardada) {
            setData(rutinaGuardada);
            setDiaActual(Object.keys(rutinaGuardada.rutina)[0]);
        }
    }, []);

    if (!data) return <p>Cargando...</p>;

    return (
        <div className="card" style={{width: '450px'}}>
            <h2>{data.metodo}</h2>
            <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '15px 0'}}>
                {Object.keys(data.rutina).map(dia => (
                    <button key={dia} className={diaActual === dia ? 'active' : ''} onClick={() => setDiaActual(dia)}>
                        {dia}
                    </button>
                ))}
            </div>
            <div style={{background: '#fff', padding: '15px', borderRadius: '10px'}}>
                {data.rutina[diaActual].map((ej, i) => (
                    <p key={i}>• {ej}</p>
                ))}
            </div>
        </div>
    );
};

export default Rutina;