// ─────────────────────────────────────────────────────────────
// js/cart.js — Sistema de carrito con localStorage
// ─────────────────────────────────────────────────────────────
// QUÉ HACE: CRUD del carrito, persistencia, badge del navbar
// MODIFICAR: Puedes cambiar CART_KEY si usas varios carritos
// ─────────────────────────────────────────────────────────────

const Cart = (() => {
  const CART_KEY = 'mw_cart';

  // ── CRUD ──────────────────────────────────────────────────

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateBadge();
    document.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart } }));
  }

  // Agrega un producto al carrito
  // product debe tener: { _id, name, price, image, category, condition }
  function addItem(product, quantity = 1) {
    const cart = getCart();
    const idx  = cart.findIndex((i) => i._id === product._id);

    if (idx >= 0) {
      cart[idx].quantity += quantity;
    } else {
      cart.push({
        _id:       product._id,
        name:      product.name,
        price:     product.price,
        image:     product.imageUrl || product.image || null,
        category:  product.category,
        condition: product.condition,
        quantity,
      });
    }

    saveCart(cart);

    // Feedback visual en el botón
    showAddedToast(product.name);
  }

  function removeItem(productId) {
    const cart = getCart().filter((i) => i._id !== productId);
    saveCart(cart);
  }

  function updateQuantity(productId, quantity) {
    if (quantity < 1) { removeItem(productId); return; }
    const cart = getCart().map((i) =>
      i._id === productId ? { ...i, quantity } : i
    );
    saveCart(cart);
  }

  function clearCart() {
    saveCart([]);
  }

  // ── Cálculos ────────────────────────────────────────────

  function getTotal() {
    return getCart().reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  function getItemCount() {
    return getCart().reduce((sum, i) => sum + i.quantity, 0);
  }

  function formatPrice(n) {
    return `$${parseFloat(n).toFixed(2)}`;
  }

  // ── Badge en el navbar ──────────────────────────────────

  function updateBadge() {
    const count = getItemCount();
    document.querySelectorAll('.cart-badge').forEach((el) => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  // ── Toast de "agregado al carrito" ─────────────────────

  function showAddedToast(productName) {
    // Remover toast anterior si existe
    document.querySelectorAll('.cart-toast').forEach((t) => t.remove());

    const toast = document.createElement('div');
    toast.className = 'cart-toast';
    toast.innerHTML = `
      <span>Agregado al carrito</span>
      <a href="/cart.html" class="cart-toast-btn">Ver carrito</a>
    `;
    document.body.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => toast.classList.add('visible'));

    // Auto-remover después de 3s
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ── Renderizar página del carrito ───────────────────────

  function renderCartPage() {
    const container  = document.getElementById('cart-items');
    const totalEl    = document.getElementById('cart-total');
    const emptyEl    = document.getElementById('cart-empty');
    const checkoutEl = document.getElementById('checkout-section');

    if (!container) return;

    const cart = getCart();

    if (cart.length === 0) {
      container.innerHTML   = '';
      if (emptyEl)    emptyEl.style.display    = 'block';
      if (checkoutEl) checkoutEl.style.display = 'none';
      return;
    }

    if (emptyEl)    emptyEl.style.display    = 'none';
    if (checkoutEl) checkoutEl.style.display = 'block';

    container.innerHTML = cart.map((item) => `
      <div class="cart-item" data-id="${item._id}">
        <div class="cart-item-img">
          ${item.image
            ? `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">`
            : `<div class="cart-img-ph">${categoryIcon(item.category)}</div>`
          }
        </div>
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-meta">${item.condition === 'reacondicionado' ? 'Reacondicionado' : 'Nuevo'}</p>
          <p class="cart-item-price">${formatPrice(item.price)} c/u</p>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="Cart.updateQuantity('${item._id}', ${item.quantity - 1})">-</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" onclick="Cart.updateQuantity('${item._id}', ${item.quantity + 1})">+</button>
        </div>
        <div class="cart-item-subtotal">${formatPrice(item.price * item.quantity)}</div>
        <button class="cart-item-remove" onclick="Cart.removeItem('${item._id}')" title="Eliminar">x</button>
      </div>
    `).join('');

    if (totalEl) totalEl.textContent = formatPrice(getTotal());
  }

  // ── Preparar datos para enviar al backend ──────────────

  function toOrderItems() {
    return getCart().map((i) => ({
      productId: i._id,
      quantity:  i.quantity,
    }));
  }

  // ── Helper: ícono por categoría ─────────────────────────

  function categoryIcon(cat) {
    const icons = { iphone: 'Tel', macbook: 'Mac', ipad: 'iPad', airpods: 'Audio', default: 'Prod' };
    return icons[cat] || icons.default;
  }

  // Inicializar badge al cargar la página
  document.addEventListener('DOMContentLoaded', updateBadge);

  return {
    getCart, addItem, removeItem, updateQuantity, clearCart,
    getTotal, getItemCount, formatPrice,
    updateBadge, renderCartPage, toOrderItems,
  };
})();
