const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Valida el JWT y agrega req.user = { user_id, rol, comercio_id }.
// Ademas consulta que el usuario siga activo: si el admin desactiva a un
// empleado, su sesion abierta deja de funcionar en el proximo pedido.
async function auth(req, res, next) {
  // Ya validado: app.js lo aplica antes de las rutas y las rutas lo repiten.
  if (req.user) {
    return next();
  }

  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto' });
  }

  const token = header.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Tu sesión expiró, volvé a ingresar' });
  }

  try {
    const [rows] = await pool.query('SELECT activo FROM usuarios WHERE id = ?', [payload.user_id]);
    if (rows.length === 0 || !rows[0].activo) {
      return res.status(401).json({ error: 'Tu usuario fue desactivado' });
    }
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = auth;
