const express = require('express');
const auth = require('../middleware/auth');
const { obtenerActual, abrir, registrarMovimiento, cerrar, listarCerradas, obtenerPorId } = require('../controllers/caja.controller');

const router = express.Router();

// Admin y empleado: quien atiende el mostrador abre y cierra la caja.
router.get('/actual', auth, obtenerActual);
router.get('/cerradas', auth, listarCerradas);
router.get('/:id', auth, obtenerPorId);
router.post('/abrir', auth, abrir);
router.post('/movimientos', auth, registrarMovimiento);
router.post('/cerrar', auth, cerrar);

module.exports = router;
