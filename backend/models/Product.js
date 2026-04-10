// ─────────────────────────────────────────────────────────────
// models/Product.js — Modelo de Producto
// ─────────────────────────────────────────────────────────────
// COLECCIÓN MongoDB: products
//
// IMÁGENES — cómo funciona:
//   - El campo `image` guarda SOLO el nombre del archivo
//     Ejemplo: "iphone-15-negro.jpg"
//   - La imagen física está en: /uploads/iphone-15-negro.jpg
//   - La URL completa se construye en el backend:
//     https://tu-app.onrender.com/uploads/iphone-15-negro.jpg
//
// AGREGAR IMÁGENES MANUALMENTE:
//   1. Copia tu imagen a la carpeta /uploads/
//   2. En MongoDB Atlas, edita el producto y cambia el campo
//      "image" por el nombre del archivo que copiaste
//
// IMPORTANTE RENDER:
//   El plan gratuito de Render tiene sistema de archivos efímero
//   (se borra al reiniciar). Para imágenes persistentes usa:
//   Render Disk (plan paid) o sube las imágenes via el panel admin
//   antes de cada deploy. Ver DEPLOY.md para más detalles.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // Nombre del producto — aparece en catálogo y orden de compra
    name: {
      type: String,
      required: [true, 'El nombre del producto es obligatorio'],
      trim: true,
      maxlength: [200, 'El nombre no puede superar 200 caracteres'],
    },

    // Precio en USD (Ecuador usa dólares)
    price: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo'],
    },

    // Descripción detallada (specs, características)
    description: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
      maxlength: [2000, 'La descripción no puede superar 2000 caracteres'],
    },

    // Nombre del archivo de imagen — SOLO el nombre, no la ruta completa
    // Ejemplo: "iphone-15-negro.jpg"
    // Si no tiene imagen, se muestra un placeholder
    image: {
      type: String,
      default: '',
    },

    // Categoría — para filtrar en el catálogo
    // MODIFICAR: Agrega categorías si vendes más tipos de producto
    category: {
      type: String,
      enum: ['iphone', 'macbook', 'ipad', 'airpods', 'accesorio', 'otro'],
      required: [true, 'La categoría es obligatoria'],
      lowercase: true,
    },

    // Condición del producto
    condition: {
      type: String,
      enum: ['nuevo', 'reacondicionado'],
      default: 'nuevo',
    },

    // Estado — controla si aparece en el catálogo público
    // 'disponible' → visible para clientes
    // 'agotado'    → visible pero marcado como agotado
    // Para ocultar completamente un producto, elimínalo
    status: {
      type: String,
      enum: ['disponible', 'agotado'],
      default: 'disponible',
    },

    // Stock — número de unidades disponibles
    // Cuando llega a 0, cambiar status a 'agotado' manualmente
    // (no hay decremento automático en este sistema)
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Especificaciones técnicas (array de strings)
    // Ejemplo: ["128GB", "Chip A15 Bionic", "Pantalla 6.1 pulgadas"]
    specs: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Índice para búsqueda eficiente por categoría y estado
productSchema.index({ category: 1, status: 1 });

// ── MÉTODO VIRTUAL: URL completa de la imagen ─────────────────
// Uso: product.imageUrl → devuelve la URL completa
productSchema.virtual('imageUrl').get(function () {
  if (!this.image) return null;
  // En producción esta URL usa el dominio real
  // La ruta /uploads es servida por Express como estático
  return `/uploads/${this.image}`;
});

// Incluir virtuals al convertir a JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
