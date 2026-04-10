// ─────────────────────────────────────────────────────────────
// routes/orders.js — Rutas de órdenes de compra
// ─────────────────────────────────────────────────────────────
// POST /api/orders           → Crear orden (público + usuario opcional)
// GET  /api/orders/mine      → Historial del usuario logueado
// GET  /api/orders           → Todos los pedidos (admin)
// PUT  /api/orders/:id/status → Cambiar estado (admin)
// ─────────────────────────────────────────────────────────────

const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { verifyToken, optionalAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /api/orders
// Crea una nueva orden de compra y devuelve el mensaje para WA
//
// Body:
// {
//   items: [{ productId, quantity }],
//   customerName: "Juan Pérez",
//   customerAddress: "Av. 9 de Octubre 123",
//   customerCity: "Guayaquil",
//   customerPhone: "0991234567",  (opcional)
//   notes: ""                     (opcional)
// }
//
// RESPONDE con:
//   - La orden guardada en DB
//   - El mensaje formateado para WhatsApp (sin emojis)
// ─────────────────────────────────────────────────────────────
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { items, customerName, customerAddress, customerCity, customerPhone, notes } = req.body;

    // Validaciones
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío.',
      });
    }

    if (!customerName || !customerAddress || !customerCity) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, dirección y ciudad son obligatorios.',
      });
    }

    // Construir ítems de la orden verificando productos en DB
    const orderItems = [];
    let total = 0;

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Cada ítem debe tener productId y quantity válidos.',
        });
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Producto no encontrado: ${item.productId}`,
        });
      }

      if (product.status === 'agotado') {
        return res.status(400).json({
          success: false,
          message: `El producto "${product.name}" está agotado.`,
        });
      }

      const quantity = parseInt(item.quantity);
      orderItems.push({
        product: product._id,
        name: product.name,       // Snapshot del nombre
        price: product.price,     // Snapshot del precio
        quantity,
      });

      total += product.price * quantity;
    }

    // Crear la orden en la base de datos
    const order = await Order.create({
      user: req.user ? req.user._id : null, // null si es invitado
      items: orderItems,
      total,
      customerName,
      customerAddress,
      customerCity,
      customerPhone: customerPhone || '',
      notes: notes || '',
      paymentMethod: 'Transferencia',
    });

    // ── Generar mensaje para WhatsApp ─────────────────────────
    // FORMATO EXACTO SIN EMOJIS NI SÍMBOLOS ESPECIALES
    // MODIFICAR: Si quieres cambiar el formato del mensaje,
    //            edita la función buildWhatsAppMessage() abajo
    const waMessage = buildWhatsAppMessage(order);

    res.status(201).json({
      success: true,
      message: 'Orden creada correctamente.',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
      },
      // El frontend usará esta URL para abrir WhatsApp
      whatsappUrl: buildWhatsAppUrl(waMessage),
      whatsappMessage: waMessage, // También se devuelve el texto plano
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    console.error('Error al crear orden:', error);
    res.status(500).json({ success: false, message: 'Error al procesar el pedido.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/orders/mine
// Historial de pedidos del usuario logueado
// ─────────────────────────────────────────────────────────────
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ success: false, message: 'Error al cargar el historial.' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/orders
// Todos los pedidos — SOLO ADMIN
// ─────────────────────────────────────────────────────────────
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = status ? { status } : {};

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('user', 'name email')
      .select('-__v');

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      orders,
    });
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ success: false, message: 'Error al cargar los pedidos.' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/orders/:id/status
// Cambiar estado de un pedido — SOLO ADMIN
// Body: { status: "confirmado" | "pagado" | "enviado" | ... }
// ─────────────────────────────────────────────────────────────
router.put('/:id/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pendiente', 'confirmado', 'pagado', 'enviado', 'entregado', 'cancelado'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Valores permitidos: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada.' });
    }

    res.json({ success: true, message: 'Estado actualizado.', order });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el estado.' });
  }
});

// ─────────────────────────────────────────────────────────────
// buildWhatsAppMessage — Genera el texto del mensaje
//
// MODIFICAR ESTE BLOQUE SI QUIERES CAMBIAR EL FORMATO
// Reglas:
//   - SIN emojis (el usuario lo pidió explícitamente)
//   - SIN caracteres especiales que rompan la URL de WhatsApp
//   - Formato limpio y profesional
// ─────────────────────────────────────────────────────────────
function buildWhatsAppMessage(order) {
  let msg = '';

  msg += `Orden de compra:\n\n`;

  // Un bloque por cada producto
  order.items.forEach((item) => {
    msg += `Producto: ${item.name}\n`;
    msg += `Cantidad: ${item.quantity}\n`;
    msg += `Precio: ${item.price}\n\n`;
  });

  msg += `Total: ${order.total}\n\n`;

  msg += `Cliente:\n`;
  msg += `Nombre: ${order.customerName}\n`;
  msg += `Direccion: ${order.customerAddress}\n`;      // Sin tilde (evita problemas de encoding)
  msg += `Ciudad: ${order.customerCity}\n`;
  msg += `Metodo de pago: ${order.paymentMethod}\n\n`; // Sin tilde

  msg += `Numero de orden: ${order.orderNumber}`;

  return msg;
}

// ─────────────────────────────────────────────────────────────
// buildWhatsAppUrl — Construye la URL para abrir WhatsApp
//
// CAMBIAR EL NÚMERO:
//   Cambia WHATSAPP_NUMBER en el archivo .env
//   Formato: código país + número (sin +, sin espacios)
//   Ecuador: 593991234567
// ─────────────────────────────────────────────────────────────
function buildWhatsAppUrl(message) {
  // ↓ El número viene de la variable de entorno
  const number = process.env.WHATSAPP_NUMBER || '593991234567';
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

module.exports = router;
