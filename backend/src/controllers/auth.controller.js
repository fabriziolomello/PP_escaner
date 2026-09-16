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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const comercioResult = await client.query(
      'INSERT INTO comercios (nombre) VALUES ($1) RETURNING id, nombre',
      [nombre_comercio]
    );
    const comercio = comercioResult.rows[0];

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const usuarioResult = await client.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, comercio_id)
       VALUES ($1, $2, $3, 'admin', $4)
       RETURNING id, nombre, email, rol, comercio_id`,
      [nombre_admin, email, passwordHash, comercio.id]
    );
    const usuario = usuarioResult.rows[0];

    await client.query('COMMIT');

    const token = generarToken(usuario);
    res.status(201).json({ token, usuario, comercio });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el comercio' });
  } finally {
    client.release();
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    const result = await pool.query(
      'SELECT id, nombre, email, password_hash, rol, comercio_id FROM usuarios WHERE email = $1',
      [email]
    );
    const usuario = result.rows[0];

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
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesion' });
  }
}

module.exports = { registrarComercio, login };
