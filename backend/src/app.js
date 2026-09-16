const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const productosRoutes = require('./routes/productos.routes');
const empleadosRoutes = require('./routes/empleados.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/empleados', empleadosRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

module.exports = app;
