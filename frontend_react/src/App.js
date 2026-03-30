import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Auth from './components/Auth';
import Formulario from './components/Formulario';
import Rutina from './components/Rutina';
import './styles/global.css';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Auth />} />
                <Route path="/formulario" element={<Formulario />} />
                <Route path="/rutina" element={<Rutina />} />
            </Routes>
        </Router>
    );
}

export default App;