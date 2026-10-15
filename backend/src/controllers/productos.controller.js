const pool = require('../config/db');
const { parse } = require('csv-parse/sync');
const cloudinary = require('../config/cloudinary');
const { LIMITE_PRODUCTOS, MENSAJE_LIMITE_PRODUCTOS, contarProductosActivos } = require('../config/plan');

const COLUMNAS = 'id, codigo_barras, nombre, precio, foto_url, stock, activo, comercio_id';

function aProducto(fila) {
  return { ...fila, activo: Boolean(fila.activo) };
}

// No puede haber dos productos con el mismo codigo dentro de un comercio
// (incluye los desactivados: se reactivan en vez de crear otro). Devuelve
// el mensaje de error, o null si el codigo esta libre. excluirId: el producto
// que se esta editando.
async function codigoOcupado(db, comercio_id, codigo_barras, excluirId = null) {
  const [rows] = await db.query(
    `SELECT id, nombre, activo FROM productos
     WHERE comercio_id = ? AND codigo_barras = ? AND id <> ?
     LIMIT 1`,
    [comercio_id, codigo_barras, excluirId ?? 0]
  );
  if (rows.length === 0) return null;
  const existente = rows[0];
  return existente.activo
    ? `Ya existe un producto con ese código de barras: ${existente.nombre}`
    : `Ya existe un producto desactivado con ese código de barras: ${existente.nombre}. Reactivalo desde el catálogo.`;
}

async function crear(req, res) {
  const codigo_barras = req.body.codigo_barras?.trim();
  const { nombre, precio } = req.body;
  const comercio_id = req.user.comercio_id;

  if (!codigo_barras || !nombre || precio === undefined || precio === null || precio === '') {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const precioNumerico = Number(precio);
  if (!Number.isFinite(precioNumerico) || precioNumerico < 0) {
    return res.status(400).json({ error: 'El precio debe ser un numero valido' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Bloquea la fila del comercio para que dos altas simultaneas no pasen
    // las dos el control de repetidos ni el del limite del plan.
    await connection.query('SELECT id FROM comercios WHERE id = ? FOR UPDATE', [comercio_id]);
    if ((await contarProductosActivos(connection, comercio_id)) >= LIMITE_PRODUCTOS) {
      await connection.rollback();
      return res.status(409).json({ error: MENSAJE_LIMITE_PRODUCTOS });
    }
    const ocupado = await codigoOcupado(connection, comercio_id, codigo_barras);
    if (ocupado) {
      await connection.rollback();
      return res.status(409).json({ error: ocupado });
    }

    const [result] = await connection.query(
      `INSERT INTO productos (codigo_barras, nombre, precio, comercio_id)
       VALUES (?, ?, ?, ?)`,
      [codigo_barras, nombre, precioNumerico, comercio_id]
    );
    await connection.commit();

    res.status(201).json({
      id: result.insertId,
      codigo_barras,
      nombre,
      precio: precioNumerico,
      foto_url: null,
      stock: 0,
      activo: true,
      comercio_id,
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al crear el producto' });
  } finally {
    connection.release();
  }
}

// Busqueda compartida por el flujo de escaneo (codigo_barras) y por nombre.
// Sin parametros, devuelve el catalogo completo del comercio.
// Solo trae productos activos; con ?desactivados=1 (solo admin, desde el
// Catalogo) trae unicamente los desactivados, para poder reactivarlos.
async function listar(req, res) {
  const comercio_id = req.user.comercio_id;
  const { nombre } = req.query;
  const codigo_barras = req.query.codigo_barras?.trim();
  const activo = !(req.query.desactivados === '1' && req.user.rol === 'admin');

  const condiciones = ['comercio_id = ?', 'activo = ?'];
  const params = [comercio_id, activo];
  if (codigo_barras) {
    condiciones.push('codigo_barras = ?');
    params.push(codigo_barras);
  } else if (nombre) {
    condiciones.push('nombre LIKE ?');
    params.push(`%${nombre}%`);
  }

  try {
    const [rows] = await pool.query(
      `SELECT ${COLUMNAS} FROM productos
       WHERE ${condiciones.join(' AND ')}
       ORDER BY nombre`,
      params
    );
    res.json(rows.map(aProducto));
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
      `SELECT ${COLUMNAS}
       FROM productos WHERE id = ? AND comercio_id = ?`,
      [id, comercio_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(aProducto(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
}

// Edita los datos basicos. El stock no se toca aca: se corrige con un
// movimiento de Ingreso/Egreso para que quede registrado.
async function actualizar(req, res) {
  const comercio_id = req.user.comercio_id;
  const { id } = req.params;
  const codigo_barras = req.body.codigo_barras?.trim();
  const nombre = req.body.nombre?.trim();
  const { precio } = req.body;

  if (!codigo_barras || !nombre || precio === undefined || precio === null || precio === '') {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const precioNumerico = Number(precio);
  if (!Number.isFinite(precioNumerico) || precioNumerico < 0) {
    return res.status(400).json({ error: 'El precio debe ser un numero valido' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query('SELECT id FROM comercios WHERE id = ? FOR UPDATE', [comercio_id]);
    const ocupado = await codigoOcupado(connection, comercio_id, codigo_barras, Number(id));
    if (ocupado) {
      await connection.rollback();
      return res.status(409).json({ error: ocupado });
    }

    const [result] = await connection.query(
      `UPDATE productos SET codigo_barras = ?, nombre = ?, precio = ?
       WHERE id = ? AND comercio_id = ?`,
      [codigo_barras, nombre, precioNumerico, id, comercio_id]
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    await connection.commit();

    const [rows] = await pool.query(`SELECT ${COLUMNAS} FROM productos WHERE id = ?`, [id]);
    res.json(aProducto(rows[0]));
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  } finally {
    connection.release();
  }
}

// Desactivar en vez de borrar: el producto puede tener ventas en el
// historial. Desactivado no aparece al buscar/escanear ni se puede vender.
async function cambiarActivo(req, res) {
  const comercio_id = req.user.comercio_id;
  const { id } = req.params;
  const { activo } = req.body;

  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'Falta indicar si el producto queda activo' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Reactivar vuelve a ocupar un lugar del plan (mismo bloqueo que en crear).
    await connection.query('SELECT id FROM comercios WHERE id = ? FOR UPDATE', [comercio_id]);
    const [actual] = await connection.query('SELECT activo FROM productos WHERE id = ? AND comercio_id = ?', [
      id,
      comercio_id,
    ]);
    if (actual.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    if (
      activo &&
      !actual[0].activo &&
      (await contarProductosActivos(connection, comercio_id)) >= LIMITE_PRODUCTOS
    ) {
      await connection.rollback();
      return res.status(409).json({ error: MENSAJE_LIMITE_PRODUCTOS });
    }

    await connection.query('UPDATE productos SET activo = ? WHERE id = ?', [activo, id]);
    const [rows] = await connection.query(`SELECT ${COLUMNAS} FROM productos WHERE id = ?`, [id]);
    await connection.commit();
    res.json(aProducto(rows[0]));
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  } finally {
    connection.release();
  }
}

// Excel en español guarda el CSV con ';' como separador (porque la coma es
// el decimal) y a veces en Windows-1252 en vez de UTF-8. Se detecta todo eso
// para que el archivo funcione tal como sale de Excel.
function leerTextoCsv(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function detectarSeparador(texto) {
  const encabezado = texto.split(/\r?\n/, 1)[0];
  const puntoYComa = encabezado.split(';').length;
  const comas = encabezado.split(',').length;
  return puntoYComa > comas ? ';' : ',';
}

// Acepta "1234.5", "1234,50", "1.234,50", "$ 1.234,50". Si hay coma, la
// coma es el decimal y los puntos son de miles; si no, el punto es decimal.
function parsearPrecio(valor) {
  let texto = String(valor ?? '').replace(/[$\s]/g, '');
  if (texto === '') return NaN;
  if (texto.includes(',')) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  }
  return Number(texto);
}

// Upsert por codigo_barras: si el codigo ya existe se actualiza ese producto
// (aunque este desactivado); si no, se crea. Se toma el primero que coincida
// porque bases viejas pueden tener duplicados de antes del control de repetidos.
async function cargarCsv(req, res) {
  const comercio_id = req.user.comercio_id;

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibio ningun archivo' });
  }

  let filas;
  try {
    const texto = leerTextoCsv(req.file.buffer);
    filas = parse(texto, {
      bom: true,
      delimiter: detectarSeparador(texto),
      // Encabezados sin importar mayusculas/espacios ("Codigo_Barras ").
      columns: (encabezados) => encabezados.map((columna) => columna.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (err) {
    return res.status(400).json({ error: 'No se pudo leer el archivo CSV' });
  }

  const columnasFaltantes = ['codigo_barras', 'nombre', 'precio'].filter(
    (columna) => filas.length > 0 && !(columna in filas[0])
  );
  if (columnasFaltantes.length > 0) {
    return res.status(400).json({
      error: `Al archivo le faltan las columnas: ${columnasFaltantes.join(', ')}. La primera fila tiene que ser codigo_barras,nombre,precio`,
    });
  }

  const resumen = { creados: 0, actualizados: 0, errores: [] };

  // Los codigos que ya existen se actualizan igual; solo las altas nuevas
  // cuentan para el limite del plan.
  let lugaresLibres;
  try {
    lugaresLibres = LIMITE_PRODUCTOS - (await contarProductosActivos(pool, comercio_id));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al cargar el archivo' });
  }

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const numeroFila = i + 2; // +2: encabezado + indice base 1
    const codigo_barras = fila.codigo_barras?.trim();
    const nombre = fila.nombre?.trim();
    const precio = parsearPrecio(fila.precio);

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
      } else if (lugaresLibres <= 0) {
        resumen.errores.push({ fila: numeroFila, motivo: `Límite de ${LIMITE_PRODUCTOS} productos alcanzado` });
      } else {
        await pool.query(
          `INSERT INTO productos (codigo_barras, nombre, precio, comercio_id)
           VALUES (?, ?, ?, ?)`,
          [codigo_barras, nombre, precio, comercio_id]
        );
        resumen.creados++;
        lugaresLibres--;
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

    const [rows] = await pool.query(`SELECT ${COLUMNAS} FROM productos WHERE id = ?`, [id]);
    res.json(aProducto(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir la foto del producto' });
  }
}

module.exports = { crear, listar, obtenerPorId, actualizar, cambiarActivo, cargarCsv, subirFoto };
