const express = require('express');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { crear, listar } = require('../controllers/empleados.controller');

const router = express.Router();

router.get('/', auth, requireAdmin, listar);
router.post('/', auth, requireAdmin, crear);

module.exports = router;
