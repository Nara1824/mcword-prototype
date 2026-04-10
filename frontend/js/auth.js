// ─────────────────────────────────────────────────────────────
// js/auth.js — Manejo de sesión y autenticación en el frontend
// ─────────────────────────────────────────────────────────────
// QUÉ HACE: Guarda/lee el token JWT en localStorage
//           Actualiza el navbar según el estado de sesión
// MODIFICAR: Puedes cambiar STORAGE_KEY si necesitas otro nombre
// ─────────────────────────────────────────────────────────────

const Auth = (() => {
  // Claves en localStorage
  const TOKEN_KEY = 'mw_token';
  const USER_KEY  = 'mw_user';

  // ── Guardar sesión ─────────────────────────────────────────
  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // ── Obtener token ──────────────────────────────────────────
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  // ── Obtener usuario actual ─────────────────────────────────
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  // ── ¿Está logueado? ────────────────────────────────────────
  function isLoggedIn() {
    return !!getToken();
  }

  // ── ¿Es admin? ────────────────────────────────────────────
  function isAdmin() {
    const user = getUser();
    return user && user.role === 'admin';
  }

  // ── Cerrar sesión ──────────────────────────────────────────
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/';
  }

  // ── Redirigir si no está autenticado ──────────────────────
  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    }
  }

  // ── Redirigir si no es admin ──────────────────────────────
  function requireAdmin() {
    if (!isAdmin()) {
      window.location.href = '/';
    }
  }

  // ── Actualizar navbar según estado de sesión ──────────────
  // Llama a esta función en cada página al cargar
  function updateNav() {
    const user = getUser();
    const navAuth    = document.getElementById('nav-auth');
    const navUser    = document.getElementById('nav-user');
    const navUserName = document.getElementById('nav-user-name');
    const navAdmin   = document.getElementById('nav-admin');

    if (!navAuth) return; // La página no tiene navbar

    if (user) {
      navAuth.style.display   = 'none';
      navUser.style.display   = 'flex';
      if (navUserName) navUserName.textContent = user.name.split(' ')[0];
      if (navAdmin && user.role === 'admin') navAdmin.style.display = 'inline-flex';
    } else {
      navAuth.style.display   = 'flex';
      navUser.style.display   = 'none';
    }
  }

  return { setSession, getToken, getUser, isLoggedIn, isAdmin, logout, requireAuth, requireAdmin, updateNav };
})();

// Actualizar navbar automáticamente al cargar cada página
document.addEventListener('DOMContentLoaded', () => Auth.updateNav());
