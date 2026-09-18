const pool = require('../config/db');
const { parse } = require('csv-parse/sync');
const cloudinary = require('../config/cloudinary');

async function crear(req, res) {
  const { codigo_barras, nombre, precio } = req.body;
  const comercio_id = req.user.comercio_id;

  if (!codigo_barras || !nombre || precio === undefined || precio === null || precio === '') {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const precioNumerico = Number(precio);
  if (!Number.isFinite(precioNumerico) || precioNumerico < 0) {
    return res.status(400).json({ error: 'El precio debe ser un numero valido' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO productos (codigo_barras, nombre, precio, comercio_id)
       VALUES (?, ?, ?, ?)`,
      [codigo_barras, nombre, precioNumerico, comercio_id]
    );
    res.status(201).json({
      id: result.insertId,
      codigo_barras,
      nombre,
      precio: precioNumerico,
      foto_url: null,
      comercio_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
}

// Busqueda compartida por el flujo de escaneo (codigo_barras) y por nombre.
// Sin parametros, devuelve el catalogo completo del comercio.
async function listar(req, res) {
  const comercio_id = req.user.comercio_id;
  const { nombre, codigo_barras } = req.query;

  try {
    let rows;
    if (codigo_barras) {
      [rows] = await pool.query(
        `SELECT id, codigo_barras, nombre, precio, foto_url, comercio_id
         FROM productos WHERE comercio_id = ? AND codigo_barras = ?
         ORDER BY nombre`,
        [comercio_id, codigo_barras]
      );
    } else if (nombre) {
      [rows] = await pool.query(
        `SELECT id, codigo_barras, nombre, precio, foto_url, comercio_id
         FROM productos WHERE comercio_id = ? AND nombre LIKE ?
         ORDER BY nombre`,
        [comercio_id, `%${nombre}%`]
      );
    } else {
      [rows] = await pool.query(
        `SELECT id, codigo_barras, nombre, precio, foto_url, comercio_id
         FROM productos WHERE comercio_id = ?
         ORDER BY nombre`,
        [comercio_id]
      );
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al buscar productos' });
  }
}

async function obtenerPorId(req, res) {
  const comercio_id = req.user.comercio_id;
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT id, codigo_barras, nombre, precio, foto_url, comercio_id
       FROM productos WHERE id = ? AND comercio_id = ?`,
      [id, comercio_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
}

// Upsert por codigo_barras. Como codigo_barras no es unico (pueden existir
// duplicados por errores de carga previos), se actualiza el primero que
// coincida en lugar de usar ON CONFLICT.
async function cargarCsv(req, res) {
  const comercio_id = req.user.comercio_id;

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibio ningun archivo' });
  }

  let filas;
  try {
    filas = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    return res.status(400).json({ error: 'No se pudo leer el archivo CSV' });
  }

  const resumen = { creados: 0, actualizados: 0, errores: [] };

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const numeroFila = i + 2; // +2: encabezado + indice base 1
    const codigo_barras = fila.codigo_barras?.trim();
    const nombre = fila.nombre?.trim();
    const precio = Number(fila.precio);

    if (!codigo_barras || !nombre) {
      resumen.errores.push({ fila: numeroFila, motivo: 'Falta codigo_barras o nombre' });
      continue;
    }
    if (!Number.isFinite(precio) || precio < 0) {
      resumen.errores.push({ fila: numeroFila, motivo: 'Precio invalido' });
      continue;
    }

    try {
      const [existente] = await pool.query(
        `SELECT id FROM productos WHERE comercio_id = ? AND codigo_barras = ?
         ORDER BY id LIMIT 1`,
        [comercio_id, codigo_barras]
      );

      if (existente.length > 0) {
        await pool.query('UPDATE productos SET nombre = ?, precio = ? WHERE id = ?', [
          nombre,
          precio,
          existente[0].id,
        ]);
        resumen.actualizados++;
      } else {
        await pool.query(
          `INSERT INTO productos (codigo_barras, nombre, precio, comercio_id)
           VALUES (?, ?, ?, ?)`,
          [codigo_barras, nombre, precio, comercio_id]
        );
        resumen.creados++;
      }
    } catch (err) {
      console.error(err);
      resumen.errores.push({ fila: numeroFila, motivo: 'Error al guardar en la base de datos' });
    }
  }

  res.json(resumen);
}

async function subirFoto(req, res) {
  const comercio_id = req.user.comercio_id;
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibio ninguna imagen' });
  }

  try {
    const [existente] = await pool.query(
      'SELECT id FROM productos WHERE id = ? AND comercio_id = ?',
      [id, comercio_id]
    );
    if (existente.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const subida = await cloudinary.uploader.upload(dataUri, {
      folder: `escaner/comercio_${comercio_id}`,
    });

    await pool.query('UPDATE productos SET foto_url = ? WHERE id = ?', [subida.secure_url, id]);

    const [rows] = await pool.query(
      `SELECT id, codigo_barras, nombre, precio, foto_url, comercio_id
       FROM productos WHERE id = ?`,
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir la foto del producto' });
  }
}

module.exports = { crear, listar, obtenerPorId, cargarCsv, subirFoto };
