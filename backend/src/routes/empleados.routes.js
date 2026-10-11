const express = require('express');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { crear, listar, obtenerPorId, cambiarActivo, cambiarPassword } = require('../controllers/empleados.controller');

const router = express.Router();

router.get('/', auth, requireAdmin, listar);
router.post('/', auth, requireAdmin, crear);
router.get('/:id', auth, requireAdmin, obtenerPorId);
router.patch('/:id/activo', auth, requireAdmin, cambiarActivo);
router.put('/:id/password', auth, requireAdmin, cambiarPassword);

module.exports = router;
