const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    // Leer el token desde el header de autorización
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
    }

    try {
        // Formato esperado: "Bearer <token>"
        const tokenLimpio = token.replace('Bearer ', '');
        
        // Verificar el token con la firma secreta
        const verified = jwt.verify(tokenLimpio, process.env.JWT_SECRET);
        
        // Adjuntar los datos del usuario a la request para usarlo en otras rutas
        req.usuario = verified;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Token inválido o expirado.' });
    }
};

module.exports = auth;
