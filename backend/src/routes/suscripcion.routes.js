const express = require('express');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { plan, obtener, pagar, confirmar, webhook } = require('../controllers/suscripcion.controller');

const router = express.Router();

// Sin suscripcionActiva: son justamente las rutas para ver el estado y pagar.
// Publica: la usa la landing.
router.get('/plan', plan);
router.get('/', auth, obtener);
router.post('/pagar', auth, requireAdmin, pagar);
router.post('/confirmar', auth, requireAdmin, confirmar);
// La llama MercadoPago, no el frontend (ver controller).
router.post('/webhook', webhook);

module.exports = router;
