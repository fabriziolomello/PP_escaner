const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { enviarVerificacion, enviarRecuperacion } = require('../config/email');
const { DIAS_PRUEBA } = require('./suscripcion.controller');

const SALT_ROUNDS = 10;

// Fecha de la version vigente de los Terminos y la Privacidad (ver
// frontend/src/pages/LegalPage.jsx). Se guarda en cada registro, junto con
// cuando se aceptaron, como prueba de que version acepto cada comercio.
const VERSION_TERMINOS = '2026-10-20';

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

// Despues de restablecer la contraseña por email, se levanta el bloqueo de
// ese email desde cualquier IP.
function limpiarIntentos(email) {
  for (const clave of intentosFallidos.keys()) {
    if (clave.endsWith(`|${email}`)) intentosFallidos.delete(clave);
  }
}

// Links por email (confirmar cuenta, recuperar contraseña): el token va en
// el link y en la base solo queda su hash. Ver tabla tokens_email.
const HORAS_VERIFICACION = 24;
const HORAS_RECUPERACION = 1;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function crearTokenEmail(usuarioId, tipo, horas) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO tokens_email (usuario_id, tipo, token_hash, expira_en)
     VALUES (?, ?, ?, NOW() + INTERVAL ? HOUR)`,
    [usuarioId, tipo, hashToken(token), horas]
  );
  return token;
}

// Para no mandar emails en rafaga si alguien toca el boton muchas veces.
async function pidioHacePoco(usuarioId, tipo) {
  const [rows] = await pool.query(
    `SELECT 1 FROM tokens_email
     WHERE usuario_id = ? AND tipo = ? AND creado_en > NOW() - INTERVAL 1 MINUTE
     LIMIT 1`,
    [usuarioId, tipo]
  );
  return rows.length > 0;
}

// Busca un token del tipo pedido y lo bloquea dentro de la transaccion.
// Devuelve { fila } si sirve, o { error } con el motivo para mostrar.
async function tomarToken(connection, token, tipo) {
  const [rows] = await connection.query(
    `SELECT id, usuario_id, usado_en, expira_en < NOW() AS vencido
     FROM tokens_email WHERE token_hash = ? AND tipo = ?
     FOR UPDATE`,
    [hashToken(token), tipo]
  );
  const fila = rows[0];
  if (!fila) return { error: 'El link no es válido. Revisá que esté completo.' };
  if (fila.usado_en) return { error: 'Este link ya se usó.', usado: true };
  if (Number(fila.vencido)) return { error: 'El link venció. Pedí uno nuevo.' };
  return { fila };
}

function linkApp(ruta, token) {
  return `${process.env.APP_URL}${ruta}?token=${token}`;
}

// Devuelve true si se mando; si falla el SMTP lo registra y devuelve false.
async function mandarVerificacion(usuario) {
  try {
    const token = await crearTokenEmail(usuario.id, 'verificacion', HORAS_VERIFICACION);
    await enviarVerificacion({
      para: usuario.email,
      nombre: usuario.nombre,
      comercio: usuario.comercio_nombre,
      link: linkApp('/verificar-email', token),
    });
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// El email se guarda y se busca siempre en minusculas y sin espacios.
function normalizarEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

// v = version_sesion: al cambiar la contraseña sube y este token deja de
// valer (ver middleware/auth.js).
function generarToken(usuario) {
  return jwt.sign(
    { user_id: usuario.id, rol: usuario.rol, comercio_id: usuario.comercio_id, v: usuario.version_sesion },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// Alta inicial: crea el comercio y su usuario admin en una misma transaccion.
// El admin queda con email_verificado = false hasta tocar el link del email.
async function registrarComercio(req, res) {
  const { nombre_comercio, nombre_admin, password } = req.body;
  const email = normalizarEmail(req.body.email);

  if (!nombre_comercio || !nombre_admin || !email || !password) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  if (req.body.acepta_terminos !== true) {
    return res.status(400).json({ error: 'Tenés que aceptar los Términos y la Política de privacidad' });
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
      `INSERT INTO usuarios (nombre, email, password_hash, rol, comercio_id, terminos_version, terminos_aceptados_en)
       VALUES (?, ?, ?, 'admin', ?, ?, NOW())`,
      [nombre_admin, email, passwordHash, comercio.id, VERSION_TERMINOS]
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

    // No entra hasta confirmar el email: se le manda el link (con el
    // agradecimiento por registrarse) y el login queda trabado hasta entonces.
    const emailEnviado = await mandarVerificacion(usuario);
    res.status(201).json({ pendiente_verificacion: true, email, email_enviado: emailEnviado });
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
              usuarios.rol, usuarios.comercio_id, usuarios.activo, usuarios.email_verificado,
              usuarios.version_sesion, comercios.nombre AS comercio_nombre
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

    // Solo el admin confirma email: a los empleados los crea el admin.
    if (usuario.rol === 'admin' && !usuario.email_verificado) {
      return res.status(403).json({
        error: 'Todavía no confirmaste tu email. Revisá tu casilla (y la carpeta de spam).',
        codigo: 'EMAIL_NO_VERIFICADO',
      });
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

// Busca al admin sin confirmar y le vuelve a mandar el link. Responde lo
// mismo exista o no el email, para no revelar que cuentas hay.
async function reenviarVerificacion(req, res) {
  const email = normalizarEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ error: 'Falta el email' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT usuarios.id, usuarios.nombre, usuarios.email, comercios.nombre AS comercio_nombre
       FROM usuarios
       JOIN comercios ON comercios.id = usuarios.comercio_id
       WHERE usuarios.email = ? AND usuarios.rol = 'admin' AND usuarios.email_verificado = false`,
      [email]
    );
    const usuario = rows[0];
    if (usuario && !(await pidioHacePoco(usuario.id, 'verificacion'))) {
      if (!(await mandarVerificacion(usuario))) {
        return res.status(502).json({ error: 'No pudimos mandar el email. Probá de nuevo más tarde.' });
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al reenviar el email' });
  }
}

// Link del email de bienvenida: confirma el email y deja la sesion iniciada.
async function verificarEmail(req, res) {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'El link no es válido. Revisá que esté completo.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const resultado = await tomarToken(connection, token, 'verificacion');
    if (resultado.error) {
      await connection.rollback();
      return res.status(400).json({
        error: resultado.usado ? 'Este link ya se usó: tu email ya está confirmado. Ingresá con tu contraseña.' : resultado.error,
      });
    }

    await connection.query('UPDATE tokens_email SET usado_en = NOW() WHERE id = ?', [resultado.fila.id]);
    await connection.query('UPDATE usuarios SET email_verificado = true WHERE id = ?', [resultado.fila.usuario_id]);
    const [rows] = await connection.query(
      `SELECT usuarios.id, usuarios.nombre, usuarios.email, usuarios.rol, usuarios.comercio_id,
              usuarios.version_sesion, comercios.nombre AS comercio_nombre
       FROM usuarios
       JOIN comercios ON comercios.id = usuarios.comercio_id
       WHERE usuarios.id = ?`,
      [resultado.fila.usuario_id]
    );
    await connection.commit();

    const { version_sesion, ...usuario } = rows[0];
    res.json({ token: generarToken({ ...usuario, version_sesion }), usuario });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al confirmar el email' });
  } finally {
    connection.release();
  }
}

// "Olvide mi contraseña": solo para admins (a los empleados les cambia la
// contraseña el admin). Responde lo mismo exista o no el email.
async function recuperarPassword(req, res) {
  const email = normalizarEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ error: 'Falta el email' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, email FROM usuarios WHERE email = ? AND rol = 'admin' AND activo = true`,
      [email]
    );
    const usuario = rows[0];
    if (usuario && !(await pidioHacePoco(usuario.id, 'recuperacion'))) {
      const token = await crearTokenEmail(usuario.id, 'recuperacion', HORAS_RECUPERACION);
      try {
        await enviarRecuperacion({
          para: usuario.email,
          nombre: usuario.nombre,
          link: linkApp('/restablecer-password', token),
        });
      } catch (err) {
        console.error(err);
        return res.status(502).json({ error: 'No pudimos mandar el email. Probá de nuevo más tarde.' });
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al pedir la recuperación' });
  }
}

// Link del email de recuperacion: pone la contraseña nueva. De paso confirma
// el email (si le llego el link, el email es suyo), levanta el bloqueo de
// login y cierra las sesiones abiertas (por si alguien mas tenia la contraseña).
async function restablecerPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const resultado = await tomarToken(connection, token, 'recuperacion');
    if (resultado.error) {
      await connection.rollback();
      return res.status(400).json({ error: resultado.error });
    }

    const usuarioId = resultado.fila.usuario_id;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await connection.query(
      `UPDATE usuarios SET password_hash = ?, email_verificado = true, version_sesion = version_sesion + 1
       WHERE id = ?`,
      [passwordHash, usuarioId]
    );
    // Invalida este link y cualquier otro de recuperacion pendiente.
    await connection.query(
      `UPDATE tokens_email SET usado_en = NOW()
       WHERE usuario_id = ? AND tipo = 'recuperacion' AND usado_en IS NULL`,
      [usuarioId]
    );
    const [rows] = await connection.query('SELECT email FROM usuarios WHERE id = ?', [usuarioId]);
    await connection.commit();

    limpiarIntentos(rows[0].email);
    res.json({ ok: true });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  } finally {
    connection.release();
  }
}

// El admin cambia su propia contraseña (los empleados no: se la cambia el admin).
// Cierra las demas sesiones abiertas y devuelve un token nuevo para esta.
async function cambiarPassword(req, res) {
  const { actual, nueva } = req.body;
  if (!actual || !nueva) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    const [rows] = await pool.query('SELECT password_hash, version_sesion FROM usuarios WHERE id = ?', [
      req.user.user_id,
    ]);
    if (!(await bcrypt.compare(actual, rows[0].password_hash))) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' });
    }
    const passwordHash = await bcrypt.hash(nueva, SALT_ROUNDS);
    await pool.query('UPDATE usuarios SET password_hash = ?, version_sesion = version_sesion + 1 WHERE id = ?', [
      passwordHash,
      req.user.user_id,
    ]);
    const token = generarToken({
      id: req.user.user_id,
      rol: req.user.rol,
      comercio_id: req.user.comercio_id,
      version_sesion: rows[0].version_sesion + 1,
    });
    res.json({ ok: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
}

module.exports = {
  registrarComercio,
  login,
  reenviarVerificacion,
  verificarEmail,
  recuperarPassword,
  restablecerPassword,
  cambiarPassword,
  normalizarEmail,
};
