// ─────────────────────────────────────────────────────────────
// server.js — Punto de entrada principal
// ─────────────────────────────────────────────────────────────
// QUÉ HACE:
//   - Arranca el servidor Express
//   - Conecta a MongoDB
//   - Sirve el frontend estático (carpeta /frontend)
//   - Sirve las imágenes de productos (carpeta /uploads)
//   - Monta todas las rutas de la API
//
// COMANDOS:
//   Desarrollo:  npm run dev      (con auto-reload)
//   Producción:  npm start
//   Crear admin: npm run create-admin
//
// VARIABLES DE ENTORNO necesarias (ver .env.example):
//   PORT, MONGODB_URI, JWT_SECRET, WHATSAPP_NUMBER
// ─────────────────────────────────────────────────────────────

require('dotenv').config(); // Cargar variables del archivo .env

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const connectDB  = require('./config/db');

// Rutas de la API
const authRoutes    = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes   = require('./routes/orders');

const app = express();

// ── 1. Conectar a MongoDB ─────────────────────────────────────
connectDB();

// ── 2. Middlewares de seguridad ───────────────────────────────

// CORS: permite requests desde el frontend
// MODIFICAR: Cambia el origin en producción a tu dominio real
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin'],
}));

// Rate limiting: máximo 100 requests por IP cada 15 minutos
// Protege contra bots y ataques de fuerza bruta
// MODIFICAR: Ajusta max y windowMs según tu tráfico
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: { success: false, message: 'Demasiadas solicitudes. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Rate limit más estricto para auth (evitar brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Solo 10 intentos de login por 15 min
  message: { success: false, message: 'Demasiados intentos. Espera 15 minutos.' },
});
app.use('/api/auth/login', authLimiter);

// ── 3. Parsear JSON y form-data ───────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── 4. Servir archivos estáticos ──────────────────────────────

// IMÁGENES DE PRODUCTOS
// Ruta física: /uploads/nombre-imagen.jpg
// URL de acceso: https://tu-app.com/uploads/nombre-imagen.jpg
//
// IMPORTANTE EN RENDER (plan gratuito):
//   El sistema de archivos es efímero — se borra al reiniciar.
//   Opciones para producción:
//   1. Render Disk (plan paid): agrega un disco persistente en /uploads
//   2. Sube las imágenes via el panel admin DESPUÉS de cada deploy
//   3. Migra a Cloudinary si el negocio crece (cambio mínimo en código)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// FRONTEND
// Sirve todos los archivos de /frontend como páginas web
// Ruta física: /frontend/index.html
// URL de acceso: https://tu-app.com/
app.use(express.static(path.join(__dirname, '../frontend')));

// ── 5. Rutas de la API ────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);

// Ruta de health check — para verificar que el servidor está vivo
// Render la usa para monitorear el servicio
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MacWorld EC API funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── 6. SPA Fallback ───────────────────────────────────────────
// Cualquier ruta no encontrada sirve el index.html del frontend
// Esto permite que el router del frontend funcione correctamente
app.get('*', (req, res) => {
  // Pero no hacer fallback para rutas de API (evitar confusión)
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Endpoint no encontrado.' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── 7. Manejador global de errores ────────────────────────────
// Captura cualquier error no manejado en las rutas
// NO TOCAR — es el último middleware
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor.',
  });
});

// ── 8. Iniciar servidor ───────────────────────────────────────
// En Render, PORT es asignado automáticamente por la plataforma
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ─────────────────────────────────────────
   MacWorld EC — Servidor corriendo
   Puerto: ${PORT}
   Frontend: http://localhost:${PORT}
   API: http://localhost:${PORT}/api
   Admin: http://localhost:${PORT}/admin
  ─────────────────────────────────────────
  `);
});

module.exports = app;
