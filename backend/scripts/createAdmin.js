// ─────────────────────────────────────────────────────────────
// scripts/createAdmin.js — Crea el usuario administrador
// ─────────────────────────────────────────────────────────────
// CÓMO USAR:
//   1. Asegúrate de tener el archivo .env configurado
//   2. Desde la carpeta /backend, corre:
//      npm run create-admin
//
// QUÉ HACE:
//   - Si no existe ningún admin → crea uno con los datos del .env
//   - Si ya existe → muestra sus datos (no lo duplica)
//
// CAMBIAR CREDENCIALES ADMIN:
//   Opción A: Edita las variables en el .env y vuelve a correr este script
//   Opción B: Cambia directamente en MongoDB Atlas:
//     1. Ve a tu cluster → Browse Collections → users
//     2. Encuentra el usuario admin
//     3. Edita el campo 'password' (requiere hashearlo manualmente con bcrypt)
//     La forma más fácil es correr este script con nuevas credenciales
// ─────────────────────────────────────────────────────────────

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createAdmin() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado.');

    // Credenciales del admin — vienen del .env
    const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@macworld.ec';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const adminName     = process.env.ADMIN_NAME     || 'Administrador';

    // Verificar si ya existe un admin
    const existing = await User.findOne({ email: adminEmail });

    if (existing) {
      console.log('\n─────────────────────────────────────────');
      console.log(' ADMIN YA EXISTE');
      console.log(`  Email: ${existing.email}`);
      console.log(`  Nombre: ${existing.name}`);
      console.log(`  Rol: ${existing.role}`);
      console.log(`  ID: ${existing._id}`);
      console.log('─────────────────────────────────────────\n');
      console.log('Para cambiar la contraseña, modifica ADMIN_PASSWORD en .env');
      console.log('y vuelve a correr este script.');
    } else {
      // Crear el admin (la contraseña se hashea automáticamente)
      const admin = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      });

      console.log('\n─────────────────────────────────────────');
      console.log(' ADMIN CREADO EXITOSAMENTE');
      console.log(`  Email: ${admin.email}`);
      console.log(`  Nombre: ${admin.name}`);
      console.log(`  Contraseña: ${adminPassword}`);
      console.log(`  Rol: ${admin.role}`);
      console.log('─────────────────────────────────────────');
      console.log('\n IMPORTANTE: Cambia la contraseña por defecto antes de produccion!');
      console.log(` Accede al panel: http://localhost:3000/admin\n`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
