const pool = require('../config/db');

const METODOS_PAGO = ['efectivo', 'mercadopago', 'tarjeta'];
const LIMITE_HISTORIAL = 100;

// Los DECIMAL de MySQL llegan como string; se opera en centavos para no
// arrastrar errores de punto flotante al sumar subtotales.
function aCentavos(valor) {
  return Math.round(Number(valor) * 100);
}

// Une items repetidos del mismo producto (ej: se agrego dos veces al carrito)
// y valida que cada cantidad sea un entero positivo.
function normalizarItems(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const cantidades = new Map();
  for (const item of items) {
    const productoId = Number(item?.producto_id);
    const cantidad = Number(item?.cantidad);
    if (!Number.isInteger(productoId) || !Number.isInteger(cantidad) || cantidad <= 0) {
      return null;
    }
    cantidades.set(productoId, (cantidades.get(productoId) || 0) + cantidad);
  }
  return cantidades;
}

// La venta nunca se bloquea por falta de stock: si el conteo esta mal, en
// el mostrador igual hay que poder vender. El stock puede quedar negativo,
// y eso mismo avisa que hay que corregirlo desde Ingreso/Egreso.
// Venta, items y descuento de stock van en una sola transaccion.
async function crear(req, res) {
  const { metodo_pago } = req.body;
  const { comercio_id, user_id } = req.user;

  const cantidades = normalizarItems(req.body.items);
  if (!cantidades) {
    return res.status(400).json({ error: 'La venta debe tener al menos un producto con cantidad valida' });
  }
  if (!METODOS_PAGO.includes(metodo_pago)) {
    return res.status(400).json({ error: 'Medio de pago invalido' });
  }

  const productoIds = [...cantidades.keys()];
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // FOR UPDATE + ORDER BY id: bloquear siempre en el mismo orden evita
    // deadlocks entre ventas concurrentes que comparten productos.
    const [productos] = await connection.query(
      `SELECT id, nombre, precio FROM productos
       WHERE id IN (?) AND comercio_id = ?
       ORDER BY id
       FOR UPDATE`,
      [productoIds, comercio_id]
    );

    if (productos.length !== productoIds.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Algun producto de la venta no existe' });
    }

    const items = productos.map((producto) => {
      const cantidad = cantidades.get(producto.id);
      const precioCentavos = aCentavos(producto.precio);
      return {
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad,
        precio_unitario: precioCentavos / 100,
        subtotal: (precioCentavos * cantidad) / 100,
      };
    });
    const totalCentavos = items.reduce((suma, item) => suma + aCentavos(item.subtotal), 0);
    const total = totalCentavos / 100;

    const [ventaResult] = await connection.query(
      `INSERT INTO ventas (comercio_id, usuario_id, total, metodo_pago)
       VALUES (?, ?, ?, ?)`,
      [comercio_id, user_id, total, metodo_pago]
    );
    const ventaId = ventaResult.insertId;

    await connection.query(
      `INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
       VALUES ?`,
      [items.map((item) => [ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal])]
    );

    for (const item of items) {
      await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [
        item.cantidad,
        item.producto_id,
      ]);
    }

    await connection.commit();

    res.status(201).json({
      id: ventaId,
      total,
      metodo_pago,
      anulada: false,
      items,
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al registrar la venta' });
  } finally {
    connection.release();
  }
}

// Historial: ultimas ventas del comercio (incluidas las anuladas, marcadas)
// con sus items, para poder desplegar el detalle sin otro pedido.
async function listar(req, res) {
  const comercio_id = req.user.comercio_id;

  try {
    const [ventas] = await pool.query(
      `SELECT ventas.id, ventas.total, ventas.metodo_pago, ventas.anulada, ventas.creado_en,
              usuarios.nombre AS usuario_nombre
       FROM ventas
       JOIN usuarios ON usuarios.id = ventas.usuario_id
       WHERE ventas.comercio_id = ?
       ORDER BY ventas.creado_en DESC, ventas.id DESC
       LIMIT ?`,
      [comercio_id, LIMITE_HISTORIAL]
    );

    if (ventas.length === 0) {
      return res.json([]);
    }

    const [items] = await pool.query(
      `SELECT venta_items.venta_id, venta_items.producto_id, venta_items.cantidad,
              venta_items.precio_unitario, venta_items.subtotal, productos.nombre
       FROM venta_items
       JOIN productos ON productos.id = venta_items.producto_id
       WHERE venta_items.venta_id IN (?)
       ORDER BY venta_items.id`,
      [ventas.map((venta) => venta.id)]
    );

    const itemsPorVenta = new Map();
    for (const item of items) {
      if (!itemsPorVenta.has(item.venta_id)) itemsPorVenta.set(item.venta_id, []);
      itemsPorVenta.get(item.venta_id).push(item);
    }

    res.json(
      ventas.map((venta) => ({
        ...venta,
        anulada: Boolean(venta.anulada),
        items: itemsPorVenta.get(venta.id) || [],
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar las ventas' });
  }
}

// Anulacion "blanda": la venta queda en el historial marcada como anulada
// y se devuelve al stock lo que habia descontado.
async function anular(req, res) {
  const comercio_id = req.user.comercio_id;
  const { id } = req.params;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [ventas] = await connection.query(
      'SELECT id, anulada FROM ventas WHERE id = ? AND comercio_id = ? FOR UPDATE',
      [id, comercio_id]
    );
    if (ventas.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    if (ventas[0].anulada) {
      await connection.rollback();
      return res.status(409).json({ error: 'La venta ya estaba anulada' });
    }

    const [items] = await connection.query(
      'SELECT producto_id, cantidad FROM venta_items WHERE venta_id = ? ORDER BY producto_id',
      [id]
    );
    for (const item of items) {
      await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [
        item.cantidad,
        item.producto_id,
      ]);
    }

    await connection.query('UPDATE ventas SET anulada = true WHERE id = ?', [id]);
    await connection.commit();

    res.json({ id: Number(id), anulada: true });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al anular la venta' });
  } finally {
    connection.release();
  }
}

module.exports = { crear, listar, anular };
