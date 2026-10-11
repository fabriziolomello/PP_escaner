const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { DIAS_PRUEBA } = require('./suscripcion.controller');

const SALT_ROUNDS = 10;

// Limite de intentos de login: con MAX_INTENTOS contraseñas incorrectas
// seguidas, ese email queda bloqueado MINUTOS_BLOQUEO desde esa IP. Se cuenta
// por email + IP para que alguien de afuera no pueda dejar sin acceso a un
// usuario desde otra conexion. Vive en memoria: alcanza para un solo proceso
// de Node, y si el servidor se reinicia los contadores vuelven a cero.
const MAX_INTENTOS = 3;
const MINUTOS_BLOQUEO = 15;
const intentosFallidos = new Map(); // clave -> { fallos, bloqueadoHasta }

function claveIntentos(req, email) {
  return `${req.ip}|${email}`;
}

// Devuelve los minutos que faltan si esta bloqueado, o 0 si puede intentar.
function minutosBloqueado(clave) {
  const registro = intentosFallidos.get(clave);
  if (!registro?.bloqueadoHasta) return 0;
  const restante = registro.bloqueadoHasta - Date.now();
  if (restante <= 0) {
    intentosFallidos.delete(clave);
    return 0;
  }
  return Math.ceil(restante / 60000);
}

// Suma un fallo y devuelve cuantos intentos le quedan (0 = recien bloqueado).
function registrarFallo(clave) {
  const registro = intentosFallidos.get(clave) || { fallos: 0, bloqueadoHasta: null };
  registro.fallos++;
  registro.ultimoFallo = Date.now();
  if (registro.fallos >= MAX_INTENTOS) {
    registro.bloqueadoHasta = Date.now() + MINUTOS_BLOQUEO * 60000;
  }
  intentosFallidos.set(clave, registro);
  return Math.max(0, MAX_INTENTOS - registro.fallos);
}

// Limpieza de bloqueos vencidos para que el Map no crezca sin limite. Los
// fallos sueltos (sin llegar al bloqueo) se descartan a la hora.
setInterval(() => {
  const ahora = Date.now();
  for (const [clave, registro] of intentosFallidos) {
    const vencido = registro.bloqueadoHasta
      ? registro.bloqueadoHasta <= ahora
      : ahora - (registro.ultimoFallo || 0) > 60 * 60000;
    if (vencido) intentosFallidos.delete(clave);
  }
}, 10 * 60000).unref();

// El email se guarda y se busca siempre en minusculas y sin espacios.
function normalizarEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function generarToken(usuario) {
  return jwt.sign(
    { user_id: usuario.id, rol: usuario.rol, comercio_id: usuario.comercio_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// Alta inicial: crea el comercio y su usuario admin en una misma transaccion
async function registrarComercio(req, res) {
  const { nombre_comercio, nombre_admin, password } = req.body;
  const email = normalizarEmail(req.body.email);

  if (!nombre_comercio || !nombre_admin || !email || !password) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Arranca con la prueba gratis; despues paga por mes (ver suscripcion.controller.js).
    const [comercioResult] = await connection.query(
      'INSERT INTO comercios (nombre, vence_en) VALUES (?, NOW() + INTERVAL ? DAY)',
      [nombre_comercio, DIAS_PRUEBA]
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
  const { password } = req.body;
  const email = normalizarEmail(req.body.email);

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const clave = claveIntentos(req, email);
  const minutos = minutosBloqueado(clave);
  if (minutos > 0) {
    return res.status(429).json({
      error: `Demasiados intentos fallidos. Probá de nuevo en ${minutos} minuto${minutos === 1 ? '' : 's'}.`,
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT usuarios.id, usuarios.nombre, usuarios.email, usuarios.password_hash,
              usuarios.rol, usuarios.comercio_id, usuarios.activo,
              comercios.nombre AS comercio_nombre
       FROM usuarios
       JOIN comercios ON comercios.id = usuarios.comercio_id
       WHERE usuarios.email = ?`,
      [email]
    );
    const usuario = rows[0];

    // Email inexistente y contraseña incorrecta cuentan igual, para no
    // revelar que emails estan registrados.
    const passwordValida = usuario ? await bcrypt.compare(password, usuario.password_hash) : false;
    if (!passwordValida) {
      const restantes = registrarFallo(clave);
      if (restantes === 0) {
        return res.status(429).json({
          error: `Demasiados intentos fallidos. Probá de nuevo en ${MINUTOS_BLOQUEO} minutos.`,
        });
      }
      return res.status(401).json({
        error: `Email o contraseña incorrectos. Te queda${restantes === 1 ? '' : 'n'} ${restantes} intento${restantes === 1 ? '' : 's'}.`,
      });
    }

    intentosFallidos.delete(clave);

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Tu usuario fue desactivado. Hablá con el administrador.' });
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

module.exports = { registrarComercio, login, normalizarEmail };
