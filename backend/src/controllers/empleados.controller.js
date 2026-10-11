const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { normalizarEmail } = require('./auth.controller');

const SALT_ROUNDS = 10;

const SELECT_EMPLEADO = `SELECT id, nombre, email, rol, comercio_id, activo, creado_en FROM usuarios`;

function aEmpleado(fila) {
  return { ...fila, activo: Boolean(fila.activo) };
}

async function crear(req, res) {
  const { nombre, password } = req.body;
  const email = normalizarEmail(req.body.email);
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
    const [rows] = await pool.query(`${SELECT_EMPLEADO} WHERE id = ?`, [result.insertId]);
    res.status(201).json(aEmpleado(rows[0]));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al crear el empleado' });
  }
}

// Activos primero; los desactivados quedan al final para poder reactivarlos.
async function listar(req, res) {
  const comercio_id = req.user.comercio_id;

  try {
    const [rows] = await pool.query(
      `${SELECT_EMPLEADO}
       WHERE comercio_id = ? AND rol = 'empleado'
       ORDER BY activo DESC, nombre`,
      [comercio_id]
    );
    res.json(rows.map(aEmpleado));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar empleados' });
  }
}

async function obtenerPorId(req, res) {
  const comercio_id = req.user.comercio_id;
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `${SELECT_EMPLEADO} WHERE id = ? AND comercio_id = ? AND rol = 'empleado'`,
      [id, comercio_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json(aEmpleado(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el empleado' });
  }
}

// Desactivar en vez de borrar: el empleado tiene ventas y cajas a su nombre.
// Desactivado no puede entrar, y su sesion abierta se corta (ver middleware/auth.js).
async function cambiarActivo(req, res) {
  const comercio_id = req.user.comercio_id;
  const { id } = req.params;
  const { activo } = req.body;

  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'Falta indicar si el empleado queda activo' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE usuarios SET activo = ? WHERE id = ? AND comercio_id = ? AND rol = 'empleado'`,
      [activo, id, comercio_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    const [rows] = await pool.query(`${SELECT_EMPLEADO} WHERE id = ?`, [id]);
    res.json(aEmpleado(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el empleado' });
  }
}

// El admin le asigna una contraseña nueva (la actual no se puede ver: se
// guarda encriptada).
async function cambiarPassword(req, res) {
  const comercio_id = req.user.comercio_id;
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Ingresá la contraseña nueva' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query(
      `UPDATE usuarios SET password_hash = ? WHERE id = ? AND comercio_id = ? AND rol = 'empleado'`,
      [passwordHash, id, comercio_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
}

module.exports = { crear, listar, obtenerPorId, cambiarActivo, cambiarPassword };
