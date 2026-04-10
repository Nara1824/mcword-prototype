// ─────────────────────────────────────────────────────────────
// models/User.js — Modelo de Usuario
// ─────────────────────────────────────────────────────────────
// COLECCIÓN MongoDB: users
// CAMPOS: nombre, email, contraseña (hasheada), rol
// MODIFICAR: Agrega campos extra si necesitas (ej: teléfono, ciudad)
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Nombre completo del usuario
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [100, 'El nombre no puede superar 100 caracteres'],
    },

    // Email único — se usa para login
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Formato de email inválido'],
    },

    // Contraseña — siempre se guarda hasheada con bcrypt
    // NUNCA guardes contraseñas en texto plano
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener mínimo 6 caracteres'],
      select: false, // No se devuelve en queries por defecto (seguridad)
    },

    // Rol: 'user' = cliente normal | 'admin' = acceso al panel admin
    // CÓMO HACER ADMIN: Corre `npm run create-admin` o cambia en MongoDB Atlas
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    // Teléfono WhatsApp del cliente (opcional, para el historial)
    phone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    // Agrega automáticamente createdAt y updatedAt
    timestamps: true,
  }
);

// ── MIDDLEWARE: Hashear contraseña antes de guardar ───────────
// Se ejecuta SOLO cuando la contraseña fue modificada
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Rounds: 12 es seguro y razonablemente rápido
  // Más rounds = más lento = más seguro (no bajar de 10)
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── MÉTODO: Comparar contraseña ingresada con la hasheada ─────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── MÉTODO: Devolver usuario sin datos sensibles ──────────────
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
