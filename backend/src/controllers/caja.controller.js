const pool = require('../config/db');

// Lista cerrada de motivos para la plata que entra o sale de la caja sin
// ser una venta.
const MOTIVOS = {
  ingreso: ['Otro'],
  egreso: ['Retiro', 'Pago a proveedor', 'Otro'],
};
const LIMITE_HISTORIAL = 10;

// Los DECIMAL de MySQL llegan como string; se opera en centavos.
function aCentavos(valor) {
  return Math.round(Number(valor || 0) * 100);
}

function montoValido(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

// Totales de una caja. Solo el efectivo se "cuenta" al cerrar:
// esperado = inicial + ventas en efectivo + ingresos - egresos.
// MercadoPago y tarjeta se suman para mostrar, pero no se concilian.
async function calcularResumen(db, caja) {
  const [ventas] = await db.query(
    `SELECT metodo_pago, SUM(total) AS total, COUNT(*) AS cantidad
     FROM ventas WHERE caja_id = ? AND anulada = false
     GROUP BY metodo_pago`,
    [caja.id]
  );
  const [movimientos] = await db.query(
    `SELECT movimientos_caja.id, movimientos_caja.tipo, movimientos_caja.monto,
            movimientos_caja.motivo, movimientos_caja.creado_en, usuarios.nombre AS usuario_nombre
     FROM movimientos_caja
     JOIN usuarios ON usuarios.id = movimientos_caja.usuario_id
     WHERE movimientos_caja.caja_id = ?
     ORDER BY movimientos_caja.creado_en DESC, movimientos_caja.id DESC`,
    [caja.id]
  );

  const ventasPorMetodo = { efectivo: 0, mercadopago: 0, tarjeta: 0 };
  let cantidadVentas = 0;
  for (const fila of ventas) {
    ventasPorMetodo[fila.metodo_pago] = aCentavos(fila.total);
    cantidadVentas += Number(fila.cantidad);
  }

  let ingresos = 0;
  let egresos = 0;
  for (const movimiento of movimientos) {
    if (movimiento.tipo === 'ingreso') ingresos += aCentavos(movimiento.monto);
    else egresos += aCentavos(movimiento.monto);
  }

  const esperado = aCentavos(caja.monto_inicial) + ventasPorMetodo.efectivo + ingresos - egresos;
  const totalVentas = ventasPorMetodo.efectivo + ventasPorMetodo.mercadopago + ventasPorMetodo.tarjeta;

  return {
    ventas: {
      efectivo: ventasPorMetodo.efectivo / 100,
      mercadopago: ventasPorMetodo.mercadopago / 100,
      tarjeta: ventasPorMetodo.tarjeta / 100,
      total: totalVentas / 100,
      cantidad: cantidadVentas,
    },
    ingresos: ingresos / 100,
    egresos: egresos / 100,
    efectivo_esperado: esperado / 100,
    movimientos,
  };
}

const SELECT_CAJA = `
  SELECT cajas.id, cajas.monto_inicial, cajas.abierta_en, cajas.estado,
         cajas.monto_final_declarado, cajas.diferencia, cajas.cerrada_en,
         apertura.nombre AS usuario_apertura_nombre, cierre.nombre AS usuario_cierre_nombre
  FROM cajas
  JOIN usuarios apertura ON apertura.id = cajas.usuario_apertura_id
  LEFT JOIN usuarios cierre ON cierre.id = cajas.usuario_cierre_id`;

// Devuelve { caja: null } si no hay ninguna abierta.
async function obtenerActual(req, res) {
  const comercio_id = req.user.comercio_id;

  try {
    const [cajas] = await pool.query(
      `${SELECT_CAJA} WHERE cajas.comercio_id = ? AND cajas.estado = 'abierta'`,
      [comercio_id]
    );
    if (cajas.length === 0) {
      return res.json({ caja: null });
    }
    const resumen = await calcularResumen(pool, cajas[0]);
    res.json({ caja: { ...cajas[0], ...resumen } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la caja' });
  }
}

async function abrir(req, res) {
  const { comercio_id, user_id } = req.user;
  const montoInicial = montoValido(req.body.monto_inicial);

  if (montoInicial === null) {
    return res.status(400).json({ error: 'El monto inicial debe ser un numero mayor o igual a cero' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Se bloquea la fila del comercio para que dos aperturas simultaneas
    // no terminen creando dos cajas abiertas.
    await connection.query('SELECT id FROM comercios WHERE id = ? FOR UPDATE', [comercio_id]);
    const [abiertas] = await connection.query(
      "SELECT id FROM cajas WHERE comercio_id = ? AND estado = 'abierta'",
      [comercio_id]
    );
    if (abiertas.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'Ya hay una caja abierta' });
    }

    const [result] = await connection.query(
      `INSERT INTO cajas (comercio_id, usuario_apertura_id, monto_inicial)
       VALUES (?, ?, ?)`,
      [comercio_id, user_id, montoInicial]
    );
    await connection.commit();

    res.status(201).json({ id: result.insertId, monto_inicial: montoInicial, estado: 'abierta' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al abrir la caja' });
  } finally {
    connection.release();
  }
}

async function registrarMovimiento(req, res) {
  const { comercio_id, user_id } = req.user;
  const { tipo, motivo } = req.body;
  const monto = montoValido(req.body.monto);

  if (!MOTIVOS[tipo]) {
    return res.status(400).json({ error: 'El tipo debe ser ingreso o egreso' });
  }
  if (!monto) {
    return res.status(400).json({ error: 'El monto debe ser mayor a cero' });
  }
  if (!MOTIVOS[tipo].includes(motivo)) {
    return res.status(400).json({ error: 'Motivo invalido' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // LOCK IN SHARE MODE: si en paralelo se esta cerrando la caja, se espera
    // al cierre en vez de agregar un movimiento a una caja que ya no cuenta.
    const [cajas] = await connection.query(
      "SELECT id FROM cajas WHERE comercio_id = ? AND estado = 'abierta' LOCK IN SHARE MODE",
      [comercio_id]
    );
    if (cajas.length === 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'No hay una caja abierta', codigo: 'CAJA_CERRADA' });
    }

    await connection.query(
      `INSERT INTO movimientos_caja (caja_id, tipo, monto, motivo, usuario_id)
       VALUES (?, ?, ?, ?, ?)`,
      [cajas[0].id, tipo, monto, motivo, user_id]
    );
    await connection.commit();

    res.status(201).json({ caja_id: cajas[0].id, tipo, monto, motivo });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el movimiento de caja' });
  } finally {
    connection.release();
  }
}

async function cerrar(req, res) {
  const { comercio_id, user_id } = req.user;
  const montoDeclarado = montoValido(req.body.monto_final_declarado);

  if (montoDeclarado === null) {
    return res.status(400).json({ error: 'Ingresá el efectivo contado (puede ser 0)' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // FOR UPDATE: espera a las ventas/movimientos en curso y bloquea los
    // nuevos hasta terminar, asi el resumen no cambia mientras se cierra.
    const [cajas] = await connection.query(
      `SELECT id, monto_inicial FROM cajas
       WHERE comercio_id = ? AND estado = 'abierta' FOR UPDATE`,
      [comercio_id]
    );
    if (cajas.length === 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'No hay una caja abierta' });
    }

    const resumen = await calcularResumen(connection, cajas[0]);
    const diferencia = (aCentavos(montoDeclarado) - aCentavos(resumen.efectivo_esperado)) / 100;

    await connection.query(
      `UPDATE cajas
       SET estado = 'cerrada', usuario_cierre_id = ?, monto_final_declarado = ?,
           diferencia = ?, cerrada_en = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [user_id, montoDeclarado, diferencia, cajas[0].id]
    );
    await connection.commit();

    res.json({
      id: cajas[0].id,
      estado: 'cerrada',
      monto_inicial: cajas[0].monto_inicial,
      monto_final_declarado: montoDeclarado,
      diferencia,
      ...resumen,
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al cerrar la caja' });
  } finally {
    connection.release();
  }
}

// Ultimos cierres, para revisar diferencias de dias anteriores.
async function listarCerradas(req, res) {
  const comercio_id = req.user.comercio_id;

  try {
    const [cajas] = await pool.query(
      `${SELECT_CAJA}
       WHERE cajas.comercio_id = ? AND cajas.estado = 'cerrada'
       ORDER BY cajas.cerrada_en DESC, cajas.id DESC
       LIMIT ?`,
      [comercio_id, LIMITE_HISTORIAL]
    );
    res.json(cajas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar las cajas' });
  }
}

module.exports = { obtenerActual, abrir, registrarMovimiento, cerrar, listarCerradas };
