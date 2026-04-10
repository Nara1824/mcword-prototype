// ─────────────────────────────────────────────────────────────
// config/db.js — Conexión a MongoDB
// ─────────────────────────────────────────────────────────────
// QUÉ HACE: Establece y gestiona la conexión con MongoDB Atlas
// MODIFICAR: Solo si necesitas opciones avanzadas de conexión
// NO TOCAR: La lógica de reintentos y el manejo de errores
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Opciones de conexión recomendadas para producción
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Estas opciones mejoran la estabilidad en Render/Atlas
      serverSelectionTimeoutMS: 5000,  // Timeout si no conecta en 5s
      socketTimeoutMS: 45000,          // Timeout de operaciones
    });

    console.log(`MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error al conectar MongoDB: ${error.message}`);
    // Termina el proceso si no puede conectar
    // Render reiniciará el servidor automáticamente
    process.exit(1);
  }
};

// Eventos de conexión (útil para debugging en producción)
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB desconectado. Intentando reconectar...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconectado.');
});

module.exports = connectDB;
