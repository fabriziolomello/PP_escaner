const { obtenerEstado } = require('../controllers/suscripcion.controller');

// Debe usarse siempre despues del middleware auth, ya que depende de req.user.
// Con la suscripcion vencida (pasado el dia de gracia) corta todas las rutas
// salvo las de /api/suscripcion, para que solo se pueda pagar.
async function suscripcionActiva(req, res, next) {
  try {
    const suscripcion = await obtenerEstado(req.user.comercio_id);
    if (!suscripcion || suscripcion.estado === 'vencida') {
      return res.status(402).json({
        error: 'La suscripción del comercio está vencida',
        codigo: 'SUSCRIPCION_VENCIDA',
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = suscripcionActiva;
