// ─────────────────────────────────────────────────────────────
// js/api.js — Capa de comunicación con el backend
// ─────────────────────────────────────────────────────────────
// QUÉ HACE: Centraliza todas las llamadas fetch al backend
// MODIFICAR: Cambia API_BASE si cambias el puerto o dominio
// NO TOCAR: La lógica de manejo de errores y tokens
// ─────────────────────────────────────────────────────────────

// ── URL base del backend ───────────────────────────────────────
// En desarrollo: http://localhost:3000
// En producción (Render): se detecta automáticamente
// Para cambiarla manualmente: reemplaza el valor del if
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : `${window.location.origin}/api`;

// ─────────────────────────────────────────────────────────────
// fetchAPI — Wrapper de fetch con manejo de errores
// Uso interno — no llamar directamente desde las páginas
// ─────────────────────────────────────────────────────────────
async function fetchAPI(endpoint, options = {}) {
  const token = Auth.getToken(); // Obtiene el JWT del localStorage

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
  };

  // Si el body es FormData (subida de imagen), no forzar Content-Type
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new APIError(data.message || 'Error en la solicitud', response.status);
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) throw error;
    if (error.name === 'TypeError') {
      throw new APIError('No se pudo conectar con el servidor. Verifica tu conexión.', 0);
    }
    throw error;
  }
}

// Error personalizado con código HTTP
class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

// ─────────────────────────────────────────────────────────────
// API.products — Operaciones de productos
// ─────────────────────────────────────────────────────────────
const API = {
  products: {
    // Obtener catálogo (público)
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetchAPI(`/products${qs ? '?' + qs : ''}`);
    },

    // Obtener catálogo para admin (incluye agotados)
    getAllAdmin: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetchAPI(`/products${qs ? '?' + qs : ''}`, {
        headers: { 'x-admin': 'true' },
      });
    },

    // Obtener un producto por ID
    getById: (id) => fetchAPI(`/products/${id}`),

    // Crear producto (admin) — usa FormData para imagen
    create: (formData) =>
      fetchAPI('/products', { method: 'POST', body: formData }),

    // Editar producto (admin)
    update: (id, formData) =>
      fetchAPI(`/products/${id}`, { method: 'PUT', body: formData }),

    // Eliminar producto (admin)
    delete: (id) =>
      fetchAPI(`/products/${id}`, { method: 'DELETE' }),
  },

  // ─────────────────────────────────────────────────────────
  // API.auth — Autenticación
  // ─────────────────────────────────────────────────────────
  auth: {
    register: (data) =>
      fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (email, password) =>
      fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    me: () => fetchAPI('/auth/me'),
  },

  // ─────────────────────────────────────────────────────────
  // API.orders — Pedidos
  // ─────────────────────────────────────────────────────────
  orders: {
    // Crear orden de compra
    create: (orderData) =>
      fetchAPI('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      }),

    // Historial del usuario logueado
    mine: () => fetchAPI('/orders/mine'),

    // Todos los pedidos (admin)
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetchAPI(`/orders${qs ? '?' + qs : ''}`);
    },

    // Cambiar estado (admin)
    updateStatus: (id, status) =>
      fetchAPI(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
  },
};
