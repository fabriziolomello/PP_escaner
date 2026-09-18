const bcrypt = require('bcrypt');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

async function crear(req, res) {
  const { nombre, email, password } = req.body;
  const comercio_id = req.user.comercio_id;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, comercio_id)
       VALUES (?, ?, ?, 'empleado', ?)`,
      [nombre, email, passwordHash, comercio_id]
    );
    const [rows] = await pool.query(
      `SELECT id, nombre, email, rol, comercio_id, creado_en
       FROM usuarios WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al crear el empleado' });
  }
}

async function listar(req, res) {
  const comercio_id = req.user.comercio_id;

  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, email, rol, comercio_id, creado_en
       FROM usuarios WHERE comercio_id = ? AND rol = 'empleado'
       ORDER BY nombre`,
      [comercio_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar empleados' });
  }
}

module.exports = { crear, listar };
