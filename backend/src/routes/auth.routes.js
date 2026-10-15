const express = require('express');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
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

router.post('/registro', registrarComercio);
router.post('/login', login);
router.post('/reenviar-verificacion', reenviarVerificacion);
router.post('/verificar-email', verificarEmail);
router.post('/recuperar-password', recuperarPassword);
router.post('/restablecer-password', restablecerPassword);
// Solo el admin cambia su propia contraseña.
router.put('/password', auth, requireAdmin, cambiarPassword);

module.exports = router;
