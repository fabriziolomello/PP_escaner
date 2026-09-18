const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

function generarToken(usuario) {
  return jwt.sign(
    { user_id: usuario.id, rol: usuario.rol, comercio_id: usuario.comercio_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// Alta inicial: crea el comercio y su usuario admin en una misma transaccion
async function registrarComercio(req, res) {
  const { nombre_comercio, nombre_admin, email, password } = req.body;

  if (!nombre_comercio || !nombre_admin || !email || !password) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [comercioResult] = await connection.query(
      'INSERT INTO comercios (nombre) VALUES (?)',
      [nombre_comercio]
    );
    const comercio = { id: comercioResult.insertId, nombre: nombre_comercio };

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [usuarioResult] = await connection.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, comercio_id)
       VALUES (?, ?, ?, 'admin', ?)`,
      [nombre_admin, email, passwordHash, comercio.id]
    );
    const usuario = {
      id: usuarioResult.insertId,
      nombre: nombre_admin,
      email,
      rol: 'admin',
      comercio_id: comercio.id,
      comercio_nombre: comercio.nombre,
    };

    await connection.commit();

    const token = generarToken(usuario);
    res.status(201).json({ token, usuario, comercio });
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el comercio' });
  } finally {
    connection.release();
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT usuarios.id, usuarios.nombre, usuarios.email, usuarios.password_hash,
              usuarios.rol, usuarios.comercio_id, comercios.nombre AS comercio_nombre
       FROM usuarios
       JOIN comercios ON comercios.id = usuarios.comercio_id
       WHERE usuarios.email = ?`,
      [email]
    );
    const usuario = rows[0];

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = generarToken(usuario);
    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        comercio_id: usuario.comercio_id,
        comercio_nombre: usuario.comercio_nombre,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesion' });
  }
}

module.exports = { registrarComercio, login };
