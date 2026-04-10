// ─────────────────────────────────────────────────────────────
// models/Order.js — Modelo de Orden de Compra
// ─────────────────────────────────────────────────────────────
// COLECCIÓN MongoDB: orders
// Guarda cada pedido generado (con o sin usuario registrado)
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

// Sub-schema para cada ítem del pedido
// Guardamos nombre y precio al momento de compra (snapshot)
// Así si cambia el precio del producto, el historial queda correcto
const orderItemSchema = new mongoose.Schema(
  {
    // Referencia al producto original (puede ser null si fue eliminado)
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    // Snapshot del nombre al momento de la compra
    name: { type: String, required: true },
    // Snapshot del precio al momento de la compra
    price: { type: Number, required: true },
    // Cantidad pedida
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false } // No generar _id para cada ítem
);

const orderSchema = new mongoose.Schema(
  {
    // ── Referencia al usuario (opcional) ──────────────────────
    // Si el cliente está logueado, se guarda su ID
    // Si compra como invitado, este campo queda en null
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ── Número de orden legible ────────────────────────────────
    // Formato: ORD-YYYYMMDD-XXXX (ej: ORD-20250115-4832)
    // Se genera automáticamente al crear la orden
    orderNumber: {
      type: String,
      unique: true,
    },

    // ── Productos del pedido ───────────────────────────────────
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: 'La orden debe tener al menos un producto',
      },
    },

    // ── Total calculado ────────────────────────────────────────
    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // ── Datos del cliente ──────────────────────────────────────
    customerName: {
      type: String,
      required: [true, 'El nombre del cliente es obligatorio'],
      trim: true,
    },
    customerAddress: {
      type: String,
      required: [true, 'La dirección es obligatoria'],
      trim: true,
    },
    customerCity: {
      type: String,
      required: [true, 'La ciudad es obligatoria'],
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Estado del pedido ──────────────────────────────────────
    // pendiente   → recién creado, esperando confirmación
    // confirmado  → confirmaste disponibilidad por WA
    // pagado      → cliente pagó la transferencia
    // enviado     → producto despachado
    // entregado   → entrega completada
    // cancelado   → cancelado por cualquier motivo
    // MODIFICAR: Agrega/quita estados según tu flujo de trabajo
    status: {
      type: String,
      enum: ['pendiente', 'confirmado', 'pagado', 'enviado', 'entregado', 'cancelado'],
      default: 'pendiente',
    },

    // Método de pago (por ahora solo transferencia)
    paymentMethod: {
      type: String,
      default: 'Transferencia',
    },

    // Notas adicionales del cliente
    notes: {
      type: String,
      default: '',
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// ── MIDDLEWARE: Generar número de orden antes de guardar ───────
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const date = new Date();
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const randomPart = Math.floor(Math.random() * 9000 + 1000);         // 4 dígitos
    this.orderNumber = `ORD-${datePart}-${randomPart}`;
  }
  next();
});

// Índices para consultas frecuentes
// Nota: orderNumber ya tiene índice por unique:true en el campo
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
