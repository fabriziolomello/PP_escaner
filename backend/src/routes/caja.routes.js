const express = require('express');
const auth = require('../middleware/auth');
const { obtenerActual, abrir, registrarMovimiento, cerrar, listarCerradas } = require('../controllers/caja.controller');

const router = express.Router();

// Admin y empleado: quien atiende el mostrador abre y cierra la caja.
router.get('/actual', auth, obtenerActual);
router.get('/cerradas', auth, listarCerradas);
router.post('/abrir', auth, abrir);
router.post('/movimientos', auth, registrarMovimiento);
router.post('/cerrar', auth, cerrar);

module.exports = router;
