const express = require('express');
const auth = require('../middleware/auth');
const { registrarMovimiento, listarMovimientos } = require('../controllers/stock.controller');

const router = express.Router();

// Admin y empleado: quien recibe la mercaderia en el mostrador la registra.
router.get('/movimientos', auth, listarMovimientos);
router.post('/movimientos', auth, registrarMovimiento);

module.exports = router;
