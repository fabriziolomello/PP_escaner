const express = require('express');
const { registrarComercio, login } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/registro', registrarComercio);
router.post('/login', login);

module.exports = router;
