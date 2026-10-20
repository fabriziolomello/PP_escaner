const pool = require('../config/db');
const { LIMITE_PRODUCTOS, LIMITE_EMPLEADOS } = require('../config/plan');

// Reglas de la suscripcion mensual:
// - al registrarse, el comercio tiene DIAS_PRUEBA de prueba gratis;
// - DIAS_AVISO antes de vencer se le avisa en el Inicio;
// - vencida, tiene DIAS_GRACIA para pagar; despues la API se bloquea y solo
//   queda la pantalla de pago (ver middleware/suscripcionActiva.js).
const DIAS_PRUEBA = 10;
const DIAS_AVISO = 3;
const DIAS_GRACIA = 1;

// Prefijo del external_reference: identifica los pagos de este sistema aunque
// la misma cuenta de MercadoPago cobre otras cosas.
const PREFIJO_REFERENCIA = 'escaner-suscripcion:';

const MP_API = 'https://api.mercadopago.com';

function precioMensual() {
  return Number(process.env.SUSCRIPCION_PRECIO);
}

async function mercadoPago(path, options = {}) {
  const response = await fetch(`${MP_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`MercadoPago ${path} respondio ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// Los calculos de fecha se hacen en MySQL (NOW()) para no mezclar la zona
// horaria del servidor de Node con la de la base.
async function obtenerEstado(comercioId) {
  const [rows] = await pool.query(
    `SELECT vence_en,
            TIMESTAMPDIFF(SECOND, NOW(), vence_en) AS segundos_restantes,
            NOW() > vence_en + INTERVAL ? DAY AS bloqueado,
            NOT EXISTS (SELECT 1 FROM pagos_suscripcion WHERE comercio_id = comercios.id) AS en_prueba
     FROM comercios
     WHERE id = ?`,
    [DIAS_GRACIA, comercioId]
  );
  const comercio = rows[0];
  if (!comercio) {
    return null;
  }

  const segundos = Number(comercio.segundos_restantes);
  let estado;
  if (Number(comercio.bloqueado)) {
    estado = 'vencida';
  } else if (segundos <= 0) {
    estado = 'gracia';
  } else if (segundos <= DIAS_AVISO * 86400) {
    estado = 'por_vencer';
  } else {
    estado = 'activa';
  }

  return {
    estado,
    vence_en: comercio.vence_en,
    dias_restantes: Math.max(0, Math.ceil(segundos / 86400)),
    en_prueba: Boolean(Number(comercio.en_prueba)),
  };
}

// Consulta el pago en MercadoPago (nunca se confia en lo que llega en el
// webhook o en la URL de vuelta) y, si esta aprobado, suma un mes.
// Devuelve { estado, comercio_id } con el estado del pago segun MP.
async function procesarPago(paymentId) {
  const pago = await mercadoPago(`/v1/payments/${encodeURIComponent(paymentId)}`);

  const referencia = String(pago.external_reference || '');
  if (!referencia.startsWith(PREFIJO_REFERENCIA)) {
    return { estado: 'ajeno', comercio_id: null };
  }
  const comercioId = Number(referencia.slice(PREFIJO_REFERENCIA.length));

  if (pago.status !== 'approved') {
    return { estado: pago.status, comercio_id: comercioId };
  }

  // El monto lo arma nuestra preferencia, pero se verifica igual: un pago en
  // otra moneda o por menos del precio no suma el mes.
  if (pago.currency_id !== 'ARS' || Number(pago.transaction_amount) < precioMensual()) {
    console.error(
      `Pago ${pago.id} del comercio ${comercioId} no acreditado: ${pago.transaction_amount} ${pago.currency_id} (precio ${precioMensual()} ARS)`
    );
    return { estado: 'monto_invalido', comercio_id: comercioId };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Si el pago ya estaba registrado (webhook repetido, o ya se confirmo al
    // volver del checkout) no se suma otro mes.
    const [insert] = await connection.query(
      `INSERT IGNORE INTO pagos_suscripcion (comercio_id, mp_payment_id, monto)
       VALUES (?, ?, ?)`,
      [comercioId, String(pago.id), pago.transaction_amount]
    );

    if (insert.affectedRows > 0) {
      await connection.query('SELECT id FROM comercios WHERE id = ? FOR UPDATE', [comercioId]);
      // Si paga antes de vencer, el mes se suma al vencimiento actual (no
      // pierde dias); si ya estaba vencido, arranca desde hoy.
      await connection.query(
        `UPDATE comercios
         SET vence_en = GREATEST(vence_en, NOW()) + INTERVAL 1 MONTH
         WHERE id = ?`,
        [comercioId]
      );
      await connection.query(
        `UPDATE pagos_suscripcion
         SET vence_hasta = (SELECT vence_en FROM comercios WHERE id = ?)
         WHERE id = ?`,
        [comercioId, insert.insertId]
      );
    }

    await connection.commit();
    return { estado: 'approved', comercio_id: comercioId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function obtener(req, res) {
  try {
    const suscripcion = await obtenerEstado(req.user.comercio_id);
    if (!suscripcion) {
      return res.status(404).json({ error: 'Comercio no encontrado' });
    }

    const [pagos] = await pool.query(
      `SELECT id, monto, vence_hasta, creado_en
       FROM pagos_suscripcion
       WHERE comercio_id = ?
       ORDER BY creado_en DESC
       LIMIT 6`,
      [req.user.comercio_id]
    );

    res.json({ ...suscripcion, precio: precioMensual(), pagos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la suscripcion' });
  }
}

// Crea una preferencia de Checkout Pro y devuelve la URL de pago.
async function pagar(req, res) {
  const appUrl = process.env.APP_URL;
  const urlVuelta = `${appUrl}/suscripcion`;
  // MP solo acepta auto_return y notification_url con URLs publicas (https).
  const esPublica = appUrl.startsWith('https://');

  try {
    const preferencia = await mercadoPago('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            id: 'suscripcion-mensual',
            title: 'Suscripción mensual Bipeo',
            quantity: 1,
            unit_price: precioMensual(),
            currency_id: 'ARS',
          },
        ],
        external_reference: `${PREFIJO_REFERENCIA}${req.user.comercio_id}`,
        // Lo que aparece en el resumen de la tarjeta (si el banco lo respeta).
        statement_descriptor: 'BIPEO',
        back_urls: { success: urlVuelta, pending: urlVuelta, failure: urlVuelta },
        ...(esPublica && {
          auto_return: 'approved',
          notification_url: `${appUrl}/api/suscripcion/webhook`,
        }),
      }),
    });

    res.json({ url: preferencia.init_point });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'No se pudo iniciar el pago con MercadoPago' });
  }
}

// Al volver del checkout, MP agrega ?payment_id=... a la URL. El frontend lo
// manda aca para acreditar el pago sin esperar al webhook.
async function confirmar(req, res) {
  const { payment_id } = req.body;
  if (!payment_id) {
    return res.status(400).json({ error: 'Falta el pago a confirmar' });
  }

  try {
    const resultado = await procesarPago(payment_id);
    if (resultado.comercio_id !== req.user.comercio_id) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const suscripcion = await obtenerEstado(req.user.comercio_id);
    res.json({ pago: resultado.estado, ...suscripcion });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'No se pudo verificar el pago con MercadoPago' });
  }
}

// Notificacion de MercadoPago. Sin auth: cualquiera puede llamarla, pero solo
// trae un id y el pago se consulta en MP con nuestro access token, asi que no
// se puede acreditar un pago que no exista. Responde 200 rapido para que MP
// no reintente; con error responde 500 y MP vuelve a mandarla mas tarde.
async function webhook(req, res) {
  // Formato actual: body { type: 'payment', data: { id } }. Formato viejo
  // (IPN): ?topic=payment&id=...
  const tipo = req.body?.type || req.query.type || req.query.topic;
  const paymentId = req.body?.data?.id || req.query['data.id'] || req.query.id;

  if (tipo !== 'payment' || !paymentId) {
    return res.sendStatus(200);
  }

  try {
    await procesarPago(paymentId);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
}

// Publica (sin login): la landing muestra el plan con los mismos valores que
// se cobran y se controlan.
function plan(req, res) {
  res.json({
    precio: precioMensual(),
    dias_prueba: DIAS_PRUEBA,
    limite_productos: LIMITE_PRODUCTOS,
    limite_empleados: LIMITE_EMPLEADOS,
  });
}

module.exports = {
  DIAS_PRUEBA,
  plan,
  obtenerEstado,
  obtener,
  pagar,
  confirmar,
  webhook,
};
