const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const authRoutes = require('./routes/auth.routes');
const productosRoutes = require('./routes/productos.routes');
const empleadosRoutes = require('./routes/empleados.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/empleados', empleadosRoutes);

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
