import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Seleccionamos el elemento 'root' del HTML
const root = ReactDOM.createRoot(document.getElementById('root'));

// Renderizamos la aplicación
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);