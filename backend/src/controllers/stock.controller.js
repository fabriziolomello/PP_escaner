const pool = require('../config/db');

// Lista cerrada (no texto libre) para que los movimientos sean comparables.
// "Corrección de conteo" vale en ambos sentidos.
const MOTIVOS = {
  entrada: ['Reposición de mercadería', 'Corrección de conteo'],
  salida: ['Rotura/vencimiento', 'Corrección de conteo'],
};
const LIMITE_MOVIMIENTOS = 20;

async function registrarMovimiento(req, res) {
  const { tipo, motivo } = req.body;
  const productoId = Number(req.body.producto_id);
  const cantidad = Number(req.body.cantidad);
  const { comercio_id, user_id } = req.user;

  if (!Number.isInteger(productoId)) {
    return res.status(400).json({ error: 'Falta el producto' });
  }
  if (!MOTIVOS[tipo]) {
    return res.status(400).json({ error: 'El tipo debe ser entrada o salida' });
  }
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser un numero entero mayor a cero' });
  }
  if (!MOTIVOS[tipo].includes(motivo)) {
    return res.status(400).json({ error: 'Motivo invalido' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [productos] = await connection.query(
      'SELECT id, stock FROM productos WHERE id = ? AND comercio_id = ? FOR UPDATE',
      [productoId, comercio_id]
    );
    if (productos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    if (tipo === 'salida' && productos[0].stock < cantidad) {
      await connection.rollback();
      return res
        .status(409)
        .json({ error: `No se puede sacar ${cantidad}: el stock actual es ${productos[0].stock}` });
    }

    const diferencia = tipo === 'entrada' ? cantidad : -cantidad;
    await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [diferencia, productoId]);
    await connection.query(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id)
       VALUES (?, ?, ?, ?, ?)`,
      [productoId, tipo, cantidad, motivo, user_id]
    );

    await connection.commit();

    const [rows] = await pool.query(
      `SELECT id, codigo_barras, nombre, precio, foto_url, stock, comercio_id
       FROM productos WHERE id = ?`,
      [productoId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el movimiento de stock' });
  } finally {
    connection.release();
  }
}

// movimientos_stock no guarda comercio_id: se filtra a traves del producto.
async function listarMovimientos(req, res) {
  const comercio_id = req.user.comercio_id;

  try {
    const [rows] = await pool.query(
      `SELECT movimientos_stock.id, movimientos_stock.tipo, movimientos_stock.cantidad,
              movimientos_stock.motivo, movimientos_stock.creado_en,
              productos.nombre AS producto_nombre, usuarios.nombre AS usuario_nombre
       FROM movimientos_stock
       JOIN productos ON productos.id = movimientos_stock.producto_id
       JOIN usuarios ON usuarios.id = movimientos_stock.usuario_id
       WHERE productos.comercio_id = ?
       ORDER BY movimientos_stock.creado_en DESC, movimientos_stock.id DESC
       LIMIT ?`,
      [comercio_id, LIMITE_MOVIMIENTOS]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar los movimientos de stock' });
  }
}

module.exports = { registrarMovimiento, listarMovimientos };
