const jwt = require('jsonwebtoken');

// Clave secreta desde .env o valor por defecto
const JWT_SECRET = process.env.JWT_SECRET || 'mapamapa8siayagames';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Validar existencia del header Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado o inválido' });
  }

  // Obtener el token (después de "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Validar que tenga los datos esperados
    if (!decoded?.id || !decoded?.email) {
      return res.status(401).json({ message: 'Token malformado' });
    }

    // Guardar datos del usuario en req.user para usar en la ruta protegida
    req.user = decoded;

    // Continuar al siguiente middleware o controlador
    next();
  } catch (error) {
    console.error('Error al verificar token:', error.message);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

module.exports = authMiddleware;
