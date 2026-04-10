# Guía de Deploy — MacWorld Ecuador

## Estructura del proyecto

```
/backend/    → Servidor Node.js + Express (se despliega en Render)
/frontend/   → Páginas HTML/CSS/JS (servidas por Express como estáticos)
/uploads/    → Imágenes de productos (ver nota sobre Render)
```

---

## 1. CORRER LOCALMENTE

### Prerrequisitos
- Node.js 18+
- Cuenta en MongoDB Atlas (gratis)

### Pasos

```bash
# 1. Entrar al backend
cd backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus datos reales (MongoDB URI, JWT_SECRET, número WA)

# 4. Crear usuario admin
npm run create-admin

# 5. Iniciar servidor
npm run dev
```

Abre: http://localhost:3000
Panel admin: http://localhost:3000/admin

---

## 2. CONFIGURAR MONGODB ATLAS

1. Crea cuenta en https://cloud.mongodb.com
2. Crea un cluster gratuito (M0 Free)
3. En "Database Access": crea usuario con password
4. En "Network Access": agrega IP `0.0.0.0/0` (permite todos)
5. En "Connect > Drivers": copia la connection string
6. Pégala en `.env` como `MONGODB_URI`, reemplazando `<password>`

Ejemplo:
```
MONGODB_URI=mongodb+srv://miusuario:mipassword@cluster0.abc123.mongodb.net/macworld?retryWrites=true&w=majority
```

---

## 3. DEPLOY EN RENDER

### Paso 1: Subir código a GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU-USUARIO/macworld-ec.git
git push -u origin main
```

### Paso 2: Crear servicio en Render
1. Ve a https://render.com y crea cuenta
2. "New" → "Web Service"
3. Conecta tu repositorio de GitHub
4. Configura:

| Campo | Valor |
|-------|-------|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Node Version | `18` |

### Paso 3: Variables de entorno en Render
En "Environment Variables", agrega:

```
MONGODB_URI        = mongodb+srv://...
JWT_SECRET         = (cadena larga y aleatoria, min 32 chars)
JWT_EXPIRES_IN     = 7d
WHATSAPP_NUMBER    = 593991234567
FRONTEND_URL       = https://tu-app.onrender.com
NODE_ENV           = production
```

### Paso 4: Crear admin en producción
Una vez desplegado, en Render ve a "Shell" y corre:
```bash
ADMIN_EMAIL=admin@macworld.ec ADMIN_PASSWORD=TuPasswordSeguro node scripts/createAdmin.js
```

O agrega temporalmente las variables al env y corre: `npm run create-admin`

---

## 4. IMÁGENES EN RENDER (IMPORTANTE)

### Problema
El plan gratuito de Render tiene sistema de archivos **efímero**.
Las imágenes subidas se pierden al reiniciar el servidor.

### Soluciones

**Opción A — Render Disk (recomendada, $1/mes):**
1. En tu servicio, ve a "Disks"
2. Crea un disco: Mount Path = `/uploads`, Size = 1GB
3. Las imágenes se persisten aunque el servidor se reinicie

**Opción B — Subir imágenes manualmente antes de cada deploy:**
1. Sube los productos con imágenes via el panel admin
2. Las imágenes persisten hasta el próximo deploy
3. Después de cada deploy, vuelve a subirlas

**Opción C — Base64 en MongoDB (no recomendada para producción):**
No implementada en este sistema por performance.

---

## 5. URLS DEL SISTEMA

| URL | Descripción |
|-----|-------------|
| `/` | Catálogo público |
| `/login.html` | Iniciar sesión |
| `/register.html` | Registrarse |
| `/cart.html` | Carrito + checkout |
| `/orders.html` | Historial de pedidos |
| `/admin/` | Panel de administración |
| `/api/health` | Health check del servidor |

---

## 6. CAMBIAR NÚMERO DE WHATSAPP

**Hay DOS lugares donde está el número:**

1. **Backend** (para el mensaje de orden):
   - Archivo: `backend/.env`
   - Variable: `WHATSAPP_NUMBER=593991234567`

2. **Frontend** (para el botón flotante y consultas directas):
   - Archivo: `frontend/index.html` → busca `const WA_NUMBER`
   - Archivo: `frontend/cart.html` → busca `const WA_NUMBER`

Formato: código de país + número, sin +, sin espacios.
Ecuador: `593` + número (sin el 0 inicial)
Ejemplo: `0991234567` → `593991234567`

---

## 7. CAMBIAR FORMATO DEL MENSAJE DE WHATSAPP

El mensaje se genera en:
`backend/routes/orders.js` → función `buildWhatsAppMessage()`

El formato actual (sin emojis):
```
Orden de compra:

Producto: iPhone 16 Pro
Cantidad: 1
Precio: 1099

Total: 1099

Cliente:
Nombre: Juan Perez
Direccion: Av. 9 de Octubre 123
Ciudad: Guayaquil
Metodo de pago: Transferencia

Numero de orden: ORD-20250415-4832
```

---

## 8. CREAR PRODUCTO MANUALMENTE (sin panel admin)

Si necesitas agregar productos directamente en MongoDB Atlas:

1. Ve a tu cluster → Browse Collections → `products`
2. "Insert Document" con la siguiente estructura:

```json
{
  "name": "iPhone 16 Pro 128GB",
  "price": 1099,
  "description": "iPhone 16 Pro nuevo en caja. Chip A18 Pro...",
  "image": "iphone16pro.jpg",
  "category": "iphone",
  "condition": "nuevo",
  "status": "disponible",
  "stock": 3,
  "specs": ["128GB", "Chip A18 Pro", "Pantalla 6.3 pulgadas"]
}
```

3. Copia la imagen `iphone16pro.jpg` a la carpeta `/uploads/`

---

## 9. CHECKLIST ANTES DE IR A PRODUCCIÓN

- [ ] Cambié `JWT_SECRET` por una clave larga y segura
- [ ] Cambié la contraseña del admin
- [ ] Configuré `WHATSAPP_NUMBER` con mi número real
- [ ] Conecté MongoDB Atlas con IP `0.0.0.0/0`
- [ ] Cambié `FRONTEND_URL` al dominio de Render
- [ ] Corrí `npm run create-admin`
- [ ] Probé el flujo completo: agregar al carrito → checkout → WhatsApp
- [ ] Verifiqué que las imágenes se ven correctamente
- [ ] Consideré agregar Render Disk para imágenes persistentes
