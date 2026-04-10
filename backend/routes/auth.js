// ─────────────────────────────────────────────────────────────
// routes/auth.js — Rutas de autenticación
// ─────────────────────────────────────────────────────────────
// POST /api/auth/register  → Registro de nuevo usuario
// POST /api/auth/login     → Login, devuelve JWT
// GET  /api/auth/me        → Perfil del usuario logueado
// ─────────────────────────────────────────────────────────────

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ── Función helper: generar JWT ────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// Crea una nueva cuenta de usuario
// Body: { name, email, password, phone? }
// ─────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validaciones básicas
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, email y contraseña son obligatorios.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener mínimo 6 caracteres.',
      });
    }

    // Verificar si el email ya está registrado
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Este email ya está registrado. ¿Quieres iniciar sesión?',
      });
    }

    // Crear usuario (la contraseña se hashea automáticamente en el model)
    const user = await User.create({ name, email, password, phone: phone || '' });

    // Generar token de sesión
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Cuenta creada correctamente.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // Error de validación de Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    console.error('Error en registro:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// Inicia sesión y devuelve un JWT
// Body: { email, password }
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son obligatorios.',
      });
    }

    // Buscar usuario e incluir la contraseña (select:false la excluye por defecto)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos.',
      });
    }

    // Verificar contraseña
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos.',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Sesión iniciada correctamente.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me
// Devuelve el perfil del usuario autenticado
// Headers: Authorization: Bearer <token>
// ─────────────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      phone: req.user.phone,
    },
  });
});

module.exports = router;
