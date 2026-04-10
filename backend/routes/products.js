// ─────────────────────────────────────────────────────────────
// routes/products.js — Rutas de productos
// ─────────────────────────────────────────────────────────────
// GET    /api/products          → Catálogo público
// GET    /api/products/:id      → Detalle de un producto
// POST   /api/products          → Crear producto (admin)
// PUT    /api/products/:id      → Editar producto (admin)
// DELETE /api/products/:id      → Eliminar producto (admin)
//
// IMÁGENES:
//   - Se suben como multipart/form-data en POST y PUT
//   - Se guardan en /uploads/ con nombre único (timestamp + original)
//   - En Render: usar Disk persistente o subir antes de deploy
// ─────────────────────────────────────────────────────────────

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── Configuración de Multer (subida de imágenes) ──────────────
// DÓNDE SE GUARDAN: en la carpeta /uploads/ de la raíz del proyecto
// FORMATO DEL NOMBRE: timestamp-nombreoriginal.ext
//   Ejemplo: 1703123456789-iphone15.jpg
// CÓMO ACCEDERLAS: GET /uploads/1703123456789-iphone15.jpg
const uploadsDir = path.join(__dirname, '../../uploads');

// Asegurarse que la carpeta /uploads existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Nombre único: timestamp + nombre original sin espacios
    const cleanName = file.originalname.replace(/\s+/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${cleanName}`);
  },
});

// Filtro: solo imágenes (jpg, jpeg, png, webp)
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Máximo 5MB por imagen
  },
});

// ─────────────────────────────────────────────────────────────
// GET /api/products
// Catálogo público — devuelve todos los productos disponibles
// Query params: ?category=iphone&condition=nuevo&sort=price-asc
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, condition, sort, status } = req.query;

    // Filtros base — el público solo ve productos disponibles
    // El admin puede ver todos pasando ?status=all (verificado abajo)
    const filter = {};

    // Si no es admin, solo mostrar disponibles
    const isAdmin = req.headers['x-admin'] === 'true'; // Header simple para catálogo admin
    if (!isAdmin) {
      filter.status = 'disponible';
    } else if (status && status !== 'all') {
      filter.status = status;
    }

    if (category && category !== 'all') filter.category = category;
    if (condition) filter.condition = condition;

    // Ordenamiento
    let sortOption = { createdAt: -1 }; // Default: más nuevos primero
    if (sort === 'price-asc')  sortOption = { price: 1 };
    if (sort === 'price-desc') sortOption = { price: -1 };
    if (sort === 'name')       sortOption = { name: 1 };

    const products = await Product.find(filter).sort(sortOption);

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ success: false, message: 'Error al cargar el catálogo.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/products/:id
// Detalle de un producto
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }
    res.json({ success: true, product });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID de producto inválido.' });
    }
    res.status(500).json({ success: false, message: 'Error al obtener el producto.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/products
// Crear nuevo producto — SOLO ADMIN
// Body: multipart/form-data con campos del producto + imagen opcional
// ─────────────────────────────────────────────────────────────
router.post('/', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, price, description, category, condition, status, stock, specs } = req.body;

    // Validaciones básicas
    if (!name || !price || !description || !category) {
      // Si se subió imagen pero falla validación, eliminarla
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Nombre, precio, descripción y categoría son obligatorios.',
      });
    }

    // Preparar datos del producto
    const productData = {
      name,
      price: parseFloat(price),
      description,
      category,
      condition: condition || 'nuevo',
      status: status || 'disponible',
      stock: parseInt(stock) || 0,
      specs: specs ? (Array.isArray(specs) ? specs : specs.split('\n').filter(Boolean)) : [],
    };

    // Si se subió imagen, guardar el nombre del archivo
    if (req.file) {
      productData.image = req.file.filename;
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Producto creado correctamente.',
      product,
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path); // Limpiar imagen si falla
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    console.error('Error al crear producto:', error);
    res.status(500).json({ success: false, message: 'Error al crear el producto.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/products/:id
// Editar producto existente — SOLO ADMIN
// Body: multipart/form-data (mismos campos, todos opcionales)
// ─────────────────────────────────────────────────────────────
router.put('/:id', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    // Actualizar solo los campos que llegaron en el body
    const { name, price, description, category, condition, status, stock, specs } = req.body;

    if (name)        product.name = name;
    if (price)       product.price = parseFloat(price);
    if (description) product.description = description;
    if (category)    product.category = category;
    if (condition)   product.condition = condition;
    if (status)      product.status = status;
    if (stock !== undefined) product.stock = parseInt(stock) || 0;
    if (specs) {
      product.specs = Array.isArray(specs) ? specs : specs.split('\n').filter(Boolean);
    }

    // Si se subió nueva imagen, eliminar la anterior y guardar la nueva
    if (req.file) {
      // Eliminar imagen anterior si existe
      if (product.image) {
        const oldPath = path.join(uploadsDir, product.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      product.image = req.file.filename;
    }

    await product.save();

    res.json({
      success: true,
      message: 'Producto actualizado correctamente.',
      product,
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el producto.' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/products/:id
// Eliminar producto — SOLO ADMIN
// También elimina la imagen asociada del servidor
// ─────────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    // Eliminar imagen del servidor al borrar el producto
    if (product.image) {
      const imagePath = path.join(uploadsDir, product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({ success: true, message: 'Producto eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar el producto.' });
  }
});

// ── Manejo de errores de Multer ────────────────────────────────
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'La imagen no puede superar 5MB.' });
    }
  }
  if (error.message.includes('Solo se permiten')) {
    return res.status(400).json({ success: false, message: error.message });
  }
  next(error);
});

module.exports = router;
