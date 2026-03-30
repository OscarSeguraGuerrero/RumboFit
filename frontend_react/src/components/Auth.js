import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/global.css';

const Auth = () => {
    const [esRegistro, setEsRegistro] = useState(true);
    const [form, setForm] = useState({ nombre: '', email: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleInput = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const registrar = () => {
        if (!form.nombre || !form.email || !form.password) {
            setError("Completa todos los campos");
            return;
        }
        localStorage.setItem("usuario", JSON.stringify(form));
        alert("Usuario registrado correctamente");
        setEsRegistro(false);
    };

    const login = () => {
        const usuario = JSON.parse(localStorage.getItem("usuario"));
        if (!usuario || usuario.email !== form.email || usuario.password !== form.password) {
            setError("Credenciales incorrectas");
            return;
        }
        navigate('/formulario');
    };

    return (
        <div className="card">
            <div className="logo"><img src="public/images/logo1.png" alt="logo" /></div>
            <p className="subtitle">Tu entrenador personal digital</p>
            {esRegistro && <input name="nombre" placeholder="Nombre" onChange={handleInput} />}
            <input name="email" placeholder="Email" onChange={handleInput} />
            <input name="password" type="password" placeholder="Contraseña" onChange={handleInput} />
            {error && <p className="error">{error}</p>}
            <button className="active" style={{width: '100%'}} onClick={esRegistro ? registrar : login}>
                {esRegistro ? "Registrarse" : "Iniciar Sesión"}
            </button>
            <p className="switch" style={{textAlign: 'center', cursor: 'pointer', color: '#ff7a00', marginTop: '15px'}}
               onClick={() => setEsRegistro(!esRegistro)}>
                {esRegistro ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
            </p>
        </div>
    );
};

export default Auth;