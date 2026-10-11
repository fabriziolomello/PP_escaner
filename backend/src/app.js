const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const authRoutes = require('./routes/auth.routes');
const productosRoutes = require('./routes/productos.routes');
const empleadosRoutes = require('./routes/empleados.routes');
const ventasRoutes = require('./routes/ventas.routes');
const stockRoutes = require('./routes/stock.routes');
const cajaRoutes = require('./routes/caja.routes');
const suscripcionRoutes = require('./routes/suscripcion.routes');
const auth = require('./middleware/auth');
const suscripcionActiva = require('./middleware/suscripcionActiva');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/suscripcion', suscripcionRoutes);

// Con la suscripcion vencida se bloquea todo lo demas. Las rutas ya aplican
// auth por su cuenta; aca se repite porque suscripcionActiva necesita req.user.
const conSuscripcion = [auth, suscripcionActiva];
app.use('/api/productos', conSuscripcion, productosRoutes);
app.use('/api/empleados', conSuscripcion, empleadosRoutes);
app.use('/api/ventas', conSuscripcion, ventasRoutes);
app.use('/api/stock', conSuscripcion, stockRoutes);
app.use('/api/caja', conSuscripcion, cajaRoutes);

// Build del frontend (ver "npm run build:frontend"), servido desde el mismo
// backend para no depender de un dominio separado.
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Catch-all para las rutas de React Router (ej: /dashboard, /productos/nuevo):
// cualquier GET que no sea de la API ni un archivo estatico existente devuelve
// index.html y el router del lado del cliente resuelve la pantalla.
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Solo se permiten imagenes JPG o PNG') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
