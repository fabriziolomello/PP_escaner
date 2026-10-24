const pool = require('../config/db');

const METODOS_PAGO = ['efectivo', 'mercadopago', 'tarjeta'];
const LIMITE_HISTORIAL = 100;

// Los DECIMAL de MySQL llegan como string; se opera en centavos para no
// arrastrar errores de punto flotante al sumar subtotales.
function aCentavos(valor) {
  return Math.round(Number(valor) * 100);
}

// Tope de precio y descuento por monto: entra en NUMERIC(12, 2).
const MAXIMO_PRECIO = 9999999999;

// Valida los items de la venta. Cada producto va una sola vez, con cantidad
// entera positiva; el precio es opcional (si no viene se usa el del catalogo,
// si viene es porque el vendedor lo cambio en el carrito) y el descuento es
// un porcentaje de 0 a 100. Devuelve un Map producto_id -> item, o null.
function normalizarItems(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const porProducto = new Map();
  for (const item of items) {
    const productoId = Number(item?.producto_id);
    const cantidad = Number(item?.cantidad);
    if (!Number.isInteger(productoId) || !Number.isInteger(cantidad) || cantidad <= 0) {
      return null;
    }
    if (porProducto.has(productoId)) return null;

    let precioCentavos = null;
    if (item.precio_unitario !== undefined && item.precio_unitario !== null) {
      const precio = Number(item.precio_unitario);
      if (!Number.isFinite(precio) || precio <= 0 || precio > MAXIMO_PRECIO) return null;
      precioCentavos = aCentavos(precio);
    }

    const descuento = Number(item.descuento_porcentaje ?? 0);
    if (!Number.isFinite(descuento) || descuento < 0 || descuento > 100) return null;

    porProducto.set(productoId, {
      cantidad,
      precioCentavos,
      descuentoPorcentaje: Math.round(descuento * 100) / 100,
    });
  }
  return porProducto;
}

// Descuento a toda la venta: { tipo: 'monto' | 'porcentaje', valor } o nada.
// Devuelve { porcentaje } o { montoCentavos }, {} si no hay, o null si es invalido.
function normalizarDescuento(descuento) {
  if (descuento === undefined || descuento === null) return {};
  const valor = Number(descuento.valor);
  if (!Number.isFinite(valor) || valor < 0) return null;
  if (valor === 0) return {};
  if (descuento.tipo === 'porcentaje') {
    return valor > 100 ? null : { porcentaje: Math.round(valor * 100) / 100 };
  }
  if (descuento.tipo === 'monto') {
    return valor > MAXIMO_PRECIO ? null : { montoCentavos: aCentavos(valor) };
  }
  return null;
}

// No se puede vender mas de lo que hay en stock: el stock nunca queda
// negativo. Si el conteo esta mal, primero se corrige desde Ingreso/Egreso.
// Venta, items y descuento de stock van en una sola transaccion (el FOR
// UPDATE evita que dos ventas simultaneas vendan la misma ultima unidad).
// Sin caja abierta no se vende: cada venta queda asociada a la caja del turno.
// Los montos se calculan aca (en centavos) con el mismo redondeo que muestra
// el carrito (CarritoContext.jsx): primero el descuento de cada item y
// despues el de la venta sobre la suma de los items.
async function crear(req, res) {
  const { metodo_pago } = req.body;
  const { comercio_id, user_id } = req.user;

  const pedidos = normalizarItems(req.body.items);
  if (!pedidos) {
    return res.status(400).json({ error: 'La venta tiene algun producto con cantidad, precio o descuento invalido' });
  }
  const descuentoVenta = normalizarDescuento(req.body.descuento);
  if (!descuentoVenta) {
    return res.status(400).json({ error: 'Descuento invalido' });
  }
  if (!METODOS_PAGO.includes(metodo_pago)) {
    return res.status(400).json({ error: 'Medio de pago invalido' });
  }

  const productoIds = [...pedidos.keys()];
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // LOCK IN SHARE MODE: varias ventas pueden ir en paralelo, pero si se
    // esta cerrando la caja (FOR UPDATE en caja.controller.js) se espera.
    const [cajas] = await connection.query(
      "SELECT id FROM cajas WHERE comercio_id = ? AND estado = 'abierta' LOCK IN SHARE MODE",
      [comercio_id]
    );
    if (cajas.length === 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'Primero abrí la caja', codigo: 'CAJA_CERRADA' });
    }
    const cajaId = cajas[0].id;

    // FOR UPDATE + ORDER BY id: bloquear siempre en el mismo orden evita
    // deadlocks entre ventas concurrentes que comparten productos.
    const [productos] = await connection.query(
      `SELECT id, nombre, precio, stock, activo FROM productos
       WHERE id IN (?) AND comercio_id = ?
       ORDER BY id
       FOR UPDATE`,
      [productoIds, comercio_id]
    );

    if (productos.length !== productoIds.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Algun producto de la venta no existe' });
    }
    const desactivado = productos.find((producto) => !producto.activo);
    if (desactivado) {
      await connection.rollback();
      return res
        .status(409)
        .json({ error: `${desactivado.nombre} está desactivado: sacalo del carrito para vender` });
    }
    const sinStock = productos.filter((producto) => producto.stock < pedidos.get(producto.id).cantidad);
    if (sinStock.length > 0) {
      await connection.rollback();
      const detalle = sinStock.map((producto) => `${producto.nombre} (hay ${Math.max(0, producto.stock)})`);
      return res.status(409).json({
        error: `No hay stock suficiente: ${detalle.join(', ')}`,
        codigo: 'SIN_STOCK',
        productos: sinStock.map((producto) => ({ producto_id: producto.id, stock: producto.stock })),
      });
    }

    const items = productos.map((producto) => {
      const { cantidad, precioCentavos, descuentoPorcentaje } = pedidos.get(producto.id);
      const precioListaCentavos = aCentavos(producto.precio);
      const precioUnitarioCentavos = precioCentavos ?? precioListaCentavos;
      const brutoCentavos = precioUnitarioCentavos * cantidad;
      const subtotalCentavos = brutoCentavos - Math.round((brutoCentavos * descuentoPorcentaje) / 100);
      return {
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad,
        precio_unitario: precioUnitarioCentavos / 100,
        precio_lista: precioListaCentavos / 100,
        descuento_porcentaje: descuentoPorcentaje,
        subtotal: subtotalCentavos / 100,
      };
    });
    const subtotalCentavos = items.reduce((suma, item) => suma + aCentavos(item.subtotal), 0);

    let descuentoCentavos = 0;
    if (descuentoVenta.porcentaje !== undefined) {
      descuentoCentavos = Math.round((subtotalCentavos * descuentoVenta.porcentaje) / 100);
    } else if (descuentoVenta.montoCentavos !== undefined) {
      if (descuentoVenta.montoCentavos > subtotalCentavos) {
        await connection.rollback();
        return res.status(400).json({ error: 'El descuento no puede superar el total de la venta' });
      }
      descuentoCentavos = descuentoVenta.montoCentavos;
    }
    const total = (subtotalCentavos - descuentoCentavos) / 100;
    const descuento = descuentoCentavos / 100;
    const descuentoPorcentaje = descuentoVenta.porcentaje ?? null;

    const [ventaResult] = await connection.query(
      `INSERT INTO ventas (comercio_id, usuario_id, caja_id, total, descuento, descuento_porcentaje, metodo_pago)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [comercio_id, user_id, cajaId, total, descuento, descuentoPorcentaje, metodo_pago]
    );
    const ventaId = ventaResult.insertId;

    await connection.query(
      `INSERT INTO venta_items
         (venta_id, producto_id, cantidad, precio_unitario, precio_lista, descuento_porcentaje, subtotal)
       VALUES ?`,
      [
        items.map((item) => [
          ventaId,
          item.producto_id,
          item.cantidad,
          item.precio_unitario,
          item.precio_lista,
          item.descuento_porcentaje,
          item.subtotal,
        ]),
      ]
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
      creado_en: new Date(),
      total,
      descuento,
      descuento_porcentaje: descuentoPorcentaje,
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

// Fechas del filtro: el cliente manda instantes ISO (inicio del dia local y
// inicio del dia siguiente) para que el corte de dia sea el del comercio y no
// el del servidor. Devuelve null si el valor no es una fecha valida.
function fechaFiltro(valor) {
  if (!valor) return undefined;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Historial filtrable por rango de fechas [desde, hasta) y medio de pago.
// La lista trae como mucho las ultimas 100 ventas con sus items (para
// desplegar el detalle sin otro pedido); el resumen se calcula en SQL sobre
// todas las ventas del filtro, asi no queda cortado por ese limite.
async function listar(req, res) {
  const comercio_id = req.user.comercio_id;
  const { metodo_pago } = req.query;
  const desde = fechaFiltro(req.query.desde);
  const hasta = fechaFiltro(req.query.hasta);

  if (desde === null || hasta === null) {
    return res.status(400).json({ error: 'Fecha invalida' });
  }
  if (metodo_pago && !METODOS_PAGO.includes(metodo_pago)) {
    return res.status(400).json({ error: 'Medio de pago invalido' });
  }

  const condiciones = ['ventas.comercio_id = ?'];
  const params = [comercio_id];
  if (desde) {
    condiciones.push('ventas.creado_en >= ?');
    params.push(desde);
  }
  if (hasta) {
    condiciones.push('ventas.creado_en < ?');
    params.push(hasta);
  }
  if (metodo_pago) {
    condiciones.push('ventas.metodo_pago = ?');
    params.push(metodo_pago);
  }
  const where = condiciones.join(' AND ');

  try {
    const [ventas] = await pool.query(
      `SELECT ventas.id, ventas.total, ventas.descuento, ventas.descuento_porcentaje,
              ventas.metodo_pago, ventas.anulada, ventas.creado_en,
              usuarios.nombre AS usuario_nombre, cajas.estado AS caja_estado
       FROM ventas
       JOIN usuarios ON usuarios.id = ventas.usuario_id
       LEFT JOIN cajas ON cajas.id = ventas.caja_id
       WHERE ${where}
       ORDER BY ventas.creado_en DESC, ventas.id DESC
       LIMIT ?`,
      [...params, LIMITE_HISTORIAL]
    );

    const [totales] = await pool.query(
      `SELECT ventas.metodo_pago, SUM(ventas.total) AS total, COUNT(*) AS cantidad
       FROM ventas
       WHERE ${where} AND ventas.anulada = false
       GROUP BY ventas.metodo_pago`,
      params
    );

    const porMetodo = { efectivo: 0, mercadopago: 0, tarjeta: 0 };
    let cantidad = 0;
    for (const fila of totales) {
      porMetodo[fila.metodo_pago] = aCentavos(fila.total);
      cantidad += Number(fila.cantidad);
    }
    const resumen = {
      total: (porMetodo.efectivo + porMetodo.mercadopago + porMetodo.tarjeta) / 100,
      cantidad,
      efectivo: porMetodo.efectivo / 100,
      mercadopago: porMetodo.mercadopago / 100,
      tarjeta: porMetodo.tarjeta / 100,
    };

    if (ventas.length === 0) {
      return res.json({ ventas: [], resumen });
    }

    const [items] = await pool.query(
      `SELECT venta_items.venta_id, venta_items.producto_id, venta_items.cantidad,
              venta_items.precio_unitario, venta_items.precio_lista, venta_items.descuento_porcentaje,
              venta_items.subtotal, productos.nombre
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

    res.json({
      ventas: ventas.map((venta) => ({
        ...venta,
        anulada: Boolean(venta.anulada),
        items: itemsPorVenta.get(venta.id) || [],
      })),
      resumen,
      limitado: ventas.length === LIMITE_HISTORIAL,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar las ventas' });
  }
}

// Anulacion "blanda": la venta queda en el historial marcada como anulada
// y se devuelve al stock lo que habia descontado. Si su caja ya se cerro no
// se puede anular, porque cambiaria los totales de un cierre ya hecho
// (las ventas de antes de la Fase 2 no tienen caja y si se pueden anular).
async function anular(req, res) {
  const comercio_id = req.user.comercio_id;
  const { id } = req.params;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [ventas] = await connection.query(
      `SELECT ventas.id, ventas.anulada, cajas.estado AS caja_estado
       FROM ventas
       LEFT JOIN cajas ON cajas.id = ventas.caja_id
       WHERE ventas.id = ? AND ventas.comercio_id = ?
       FOR UPDATE`,
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
    if (ventas[0].caja_estado === 'cerrada') {
      await connection.rollback();
      return res.status(409).json({ error: 'No se puede anular una venta de una caja ya cerrada' });
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
