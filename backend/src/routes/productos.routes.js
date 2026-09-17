const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { crear, listar, obtenerPorId, cargarCsv, subirFoto } = require('../controllers/productos.controller');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const uploadFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imagenes JPG o PNG'));
    }
  },
});

router.get('/', auth, listar);
router.get('/:id', auth, obtenerPorId);
router.post('/', auth, requireAdmin, crear);
router.post('/csv', auth, requireAdmin, upload.single('archivo'), cargarCsv);
router.post('/:id/foto', auth, requireAdmin, uploadFoto.single('foto'), subirFoto);

module.exports = router;
