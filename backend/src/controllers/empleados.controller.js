const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { normalizarEmail } = require('./auth.controller');
const { LIMITE_EMPLEADOS, MENSAJE_LIMITE_EMPLEADOS, contarEmpleadosActivos } = require('../config/plan');

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

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Bloquea la fila del comercio para que dos altas simultaneas no pasen
    // las dos el control del limite del plan.
    await connection.query('SELECT id FROM comercios WHERE id = ? FOR UPDATE', [comercio_id]);
    if ((await contarEmpleadosActivos(connection, comercio_id)) >= LIMITE_EMPLEADOS) {
      await connection.rollback();
      return res.status(409).json({ error: MENSAJE_LIMITE_EMPLEADOS });
    }

    const [result] = await connection.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, comercio_id)
       VALUES (?, ?, ?, 'empleado', ?)`,
      [nombre, email, passwordHash, comercio_id]
    );
    const [rows] = await connection.query(`${SELECT_EMPLEADO} WHERE id = ?`, [result.insertId]);
    await connection.commit();
    res.status(201).json(aEmpleado(rows[0]));
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al crear el empleado' });
  } finally {
    connection.release();
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Reactivar vuelve a ocupar un lugar del plan (mismo bloqueo que en crear).
    await connection.query('SELECT id FROM comercios WHERE id = ? FOR UPDATE', [comercio_id]);
    const [actual] = await connection.query(
      `SELECT activo FROM usuarios WHERE id = ? AND comercio_id = ? AND rol = 'empleado'`,
      [id, comercio_id]
    );
    if (actual.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    if (
      activo &&
      !actual[0].activo &&
      (await contarEmpleadosActivos(connection, comercio_id)) >= LIMITE_EMPLEADOS
    ) {
      await connection.rollback();
      return res.status(409).json({ error: MENSAJE_LIMITE_EMPLEADOS });
    }

    await connection.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo, id]);
    const [rows] = await connection.query(`${SELECT_EMPLEADO} WHERE id = ?`, [id]);
    await connection.commit();
    res.json(aEmpleado(rows[0]));
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el empleado' });
  } finally {
    connection.release();
  }
}

// El admin le asigna una contraseña nueva (la actual no se puede ver: se
// guarda encriptada). Las sesiones abiertas del empleado se cierran.
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
      `UPDATE usuarios SET password_hash = ?, version_sesion = version_sesion + 1
       WHERE id = ? AND comercio_id = ? AND rol = 'empleado'`,
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
