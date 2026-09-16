const pool = require('../config/db');
const { parse } = require('csv-parse/sync');

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
    const result = await pool.query(
      `INSERT INTO productos (codigo_barras, nombre, precio, comercio_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, codigo_barras, nombre, precio, foto_url, comercio_id`,
      [codigo_barras, nombre, precioNumerico, comercio_id]
    );
    res.status(201).json(result.rows[0]);
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
    let result;
    if (codigo_barras) {
      result = await pool.query(
        `SELECT id, codigo_barras, nombre, precio, foto_url, comercio_id
         FROM productos WHERE comercio_id = $1 AND codigo_barras = $2
         ORDER BY nombre`,
        [comercio_id, codigo_barras]
      );
    } else if (nombre) {
      result = await pool.query(
        `SELECT id, codigo_barras, nombre, precio, foto_url, comercio_id
         FROM productos WHERE comercio_id = $1 AND nombre ILIKE $2
         ORDER BY nombre`,
        [comercio_id, `%${nombre}%`]
      );
    } else {
      result = await pool.query(
        `SELECT id, codigo_barras, nombre, precio, foto_url, comercio_id
         FROM productos WHERE comercio_id = $1
         ORDER BY nombre`,
        [comercio_id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al buscar productos' });
  }
}

async function obtenerPorId(req, res) {
  const comercio_id = req.user.comercio_id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, codigo_barras, nombre, precio, foto_url, comercio_id
       FROM productos WHERE id = $1 AND comercio_id = $2`,
      [id, comercio_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
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
      const existente = await pool.query(
        `SELECT id FROM productos WHERE comercio_id = $1 AND codigo_barras = $2
         ORDER BY id LIMIT 1`,
        [comercio_id, codigo_barras]
      );

      if (existente.rows.length > 0) {
        await pool.query('UPDATE productos SET nombre = $1, precio = $2 WHERE id = $3', [
          nombre,
          precio,
          existente.rows[0].id,
        ]);
        resumen.actualizados++;
      } else {
        await pool.query(
          `INSERT INTO productos (codigo_barras, nombre, precio, comercio_id)
           VALUES ($1, $2, $3, $4)`,
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

module.exports = { crear, listar, obtenerPorId, cargarCsv };
