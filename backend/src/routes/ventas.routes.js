const express = require('express');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { crear, listar, anular } = require('../controllers/ventas.controller');

const router = express.Router();

router.get('/', auth, listar);
router.post('/', auth, crear);
router.post('/:id/anular', auth, requireAdmin, anular);

module.exports = router;
