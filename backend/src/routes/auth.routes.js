const express = require('express');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const limitePedidos = require('../middleware/limitePedidos');
const {
  registrarComercio,
  login,
  reenviarVerificacion,
  verificarEmail,
  recuperarPassword,
  restablecerPassword,
  cambiarPassword,
} = require('../controllers/auth.controller');

const router = express.Router();

// Limites por IP en las rutas publicas que mandan emails o reciben links
// (el login tiene su propio bloqueo por email, ver auth.controller.js).
const limiteRegistro = limitePedidos({
  max: 5,
  minutos: 60,
  mensaje: 'Demasiados registros desde tu conexión. Probá de nuevo en una hora.',
});
const limiteEmails = limitePedidos({ max: 10, minutos: 60 });
const limiteLinks = limitePedidos({ max: 20, minutos: 15 });

router.post('/registro', limiteRegistro, registrarComercio);
router.post('/login', login);
router.post('/reenviar-verificacion', limiteEmails, reenviarVerificacion);
router.post('/verificar-email', limiteLinks, verificarEmail);
router.post('/recuperar-password', limiteEmails, recuperarPassword);
router.post('/restablecer-password', limiteLinks, restablecerPassword);
// Solo el admin cambia su propia contraseña.
router.put('/password', auth, requireAdmin, cambiarPassword);

module.exports = router;
