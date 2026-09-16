// Debe usarse siempre despues del middleware auth, ya que depende de req.user
function requireAdmin(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Accion restringida a administradores' });
  }
  next();
}

module.exports = requireAdmin;
