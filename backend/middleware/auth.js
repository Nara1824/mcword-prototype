// ─────────────────────────────────────────────────────────────
// middleware/auth.js — Middleware de autenticación JWT
// ─────────────────────────────────────────────────────────────
// QUÉ HACE: Verifica el token JWT en cada request protegido
// CÓMO SE USA:
//   - router.get('/ruta', verifyToken, handler)       ← requiere login
//   - router.get('/ruta', optionalAuth, handler)      ← login opcional
//   - router.get('/ruta', verifyToken, requireAdmin, handler) ← solo admin
// NO TOCAR: La lógica de verificación de tokens
// ─────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Middleware: Verificar token (login obligatorio) ───────────
const verifyToken = async (req, res, next) => {
  try {
    // El token llega en el header Authorization: Bearer <token>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Inicia sesión primero.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el usuario en la base de datos
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado. Token inválido.',
      });
    }

    // Adjuntar el usuario al request para usarlo en los controladores
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token inválido.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'La sesión expiró. Inicia sesión de nuevo.' });
    }
    next(error);
  }
};

// ── Middleware: Login opcional ────────────────────────────────
// Si hay token válido → adjunta req.user
// Si no hay token → continúa sin error (req.user = null)
// Usado en: crear órdenes (funciona con o sin cuenta)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    req.user = user || null;
    next();
  } catch {
    // Token inválido o expirado → continúa como invitado
    req.user = null;
    next();
  }
};

// ── Middleware: Requiere rol admin ────────────────────────────
// SIEMPRE usar después de verifyToken:
//   router.post('/producto', verifyToken, requireAdmin, handler)
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.',
    });
  }
  next();
};

module.exports = { verifyToken, optionalAuth, requireAdmin };
