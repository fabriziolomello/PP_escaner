const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { crear, listar, obtenerPorId, cargarCsv } = require('../controllers/productos.controller');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', auth, listar);
router.get('/:id', auth, obtenerPorId);
router.post('/', auth, requireAdmin, crear);
router.post('/csv', auth, requireAdmin, upload.single('archivo'), cargarCsv);

module.exports = router;
