const pool = require('../config/db');
const { parse } = require('csv-parse/sync');
const ExcelJS = require('exceljs');
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
  if (!codigo_barras) return null;
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
  // El codigo de barras es opcional (hay productos sin codigo): vacio -> NULL.
  const codigo_barras = req.body.codigo_barras?.trim() || null;
  const { nombre, precio } = req.body;
  const comercio_id = req.user.comercio_id;

  if (!nombre || precio === undefined || precio === null || precio === '') {
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
  const codigo_barras = req.body.codigo_barras?.trim() || null;
  const nombre = req.body.nombre?.trim();
  const { precio } = req.body;

  if (!nombre || precio === undefined || precio === null || precio === '') {
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

// Tambien tab: es lo que guarda Excel con "Texto (delimitado por tabulaciones)".
function detectarSeparador(texto) {
  const encabezado = texto.split(/\r?\n/, 1)[0];
  const candidatos = [',', ';', '\t'];
  return candidatos.reduce((mejor, separador) =>
    encabezado.split(separador).length > encabezado.split(mejor).length ? separador : mejor
  );
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

// Los CSV que exportaba antes el catalogo traian los codigos como ="123" para
// que Excel no los convirtiera en numero; si se suben sin pasar por Excel llegan asi.
function limpiarCodigo(valor) {
  const texto = String(valor ?? '').trim();
  const comoTexto = texto.match(/^="(.*)"$/);
  return (comoTexto ? comoTexto[1].replace(/""/g, '"').trim() : texto) || null;
}

// "7,79E+12": Excel paso el codigo a notacion cientifica y perdio digitos.
function esNotacionCientifica(codigo) {
  return /^\d+([.,]\d+)?E\+?\d+$/i.test(codigo);
}

// Upsert por codigo_barras: si el codigo ya existe se actualiza ese producto
// (aunque este desactivado); si no, se crea. Se toma el primero que coincida
// porque bases viejas pueden tener duplicados de antes del control de repetidos.
// La columna stock es opcional y es el stock actual (no una cantidad a sumar),
// asi subir dos veces el mismo archivo deja todo igual. La diferencia con el
// stock que habia queda registrada como movimiento, como un ajuste manual.
const MOTIVO_STOCK_CSV = 'Carga masiva CSV';

// Encabezados sin importar mayusculas/espacios ("Codigo_Barras ").
function normalizarEncabezado(columna) {
  return String(columna ?? '').trim().toLowerCase();
}

// Los dos lectores devuelven { columnas, filas }. Cada fila es { numero, datos }:
// numero es la fila real del archivo (para los mensajes de error) y datos tiene
// todos los valores como texto.
function leerFilasCsv(buffer) {
  const texto = leerTextoCsv(buffer);
  const registros = parse(texto, {
    bom: true,
    delimiter: detectarSeparador(texto),
    columns: (encabezados) => encabezados.map(normalizarEncabezado),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true, // para los ="123" (ver limpiarCodigo)
    info: true,
  });
  return {
    columnas: registros.length > 0 ? Object.keys(registros[0].record) : null,
    filas: registros.map(({ record, info }) => ({ numero: info.lines, datos: record })),
  };
}

// Una celda de Excel puede ser numero, texto, formula ({ result }), link
// ({ text }) o texto con formato ({ richText }).
function textoDeCelda(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor !== 'object' || valor instanceof Date) return String(valor).trim();
  if (valor.richText) return valor.richText.map((parte) => parte.text).join('').trim();
  if ('result' in valor) return textoDeCelda(valor.result);
  if ('text' in valor) return textoDeCelda(valor.text);
  return '';
}

// Primera hoja; la fila 1 son los encabezados.
async function leerFilasExcel(buffer) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer);
  const hoja = libro.worksheets[0];
  if (!hoja) return { columnas: null, filas: [] };

  const encabezados = [];
  hoja.getRow(1).eachCell((celda, columna) => {
    encabezados[columna] = normalizarEncabezado(textoDeCelda(celda.value));
  });

  const filas = [];
  hoja.eachRow((row, numero) => {
    if (numero === 1) return;
    const datos = {};
    encabezados.forEach((encabezado, columna) => {
      if (encabezado) datos[encabezado] = textoDeCelda(row.getCell(columna).value);
    });
    if (Object.values(datos).some((valor) => valor !== '')) filas.push({ numero, datos });
  });
  return { columnas: encabezados.filter(Boolean), filas };
}

const esXlsx = (buffer) => buffer.subarray(0, 4).equals(Buffer.from('PK\x03\x04', 'latin1')); // un .xlsx es un zip
const esXlsViejo = (buffer) => buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));

async function cargarCsv(req, res) {
  const { comercio_id, user_id } = req.user;

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibio ningun archivo' });
  }
  if (esXlsViejo(req.file.buffer)) {
    return res.status(400).json({
      error: 'Ese archivo es de un Excel viejo (.xls). Abrilo y guardalo como "Libro de Excel (.xlsx)"',
    });
  }

  let columnas;
  let filas;
  try {
    ({ columnas, filas } = esXlsx(req.file.buffer)
      ? await leerFilasExcel(req.file.buffer)
      : leerFilasCsv(req.file.buffer));
  } catch (err) {
    return res.status(400).json({ error: 'No se pudo leer el archivo' });
  }

  const columnasFaltantes = ['codigo_barras', 'nombre', 'precio'].filter(
    (columna) => columnas && !columnas.includes(columna)
  );
  if (columnasFaltantes.length > 0) {
    return res.status(400).json({
      error: `Al archivo le faltan las columnas: ${columnasFaltantes.join(', ')}. La primera fila tiene que tener codigo_barras, nombre, precio (y opcionalmente stock)`,
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

  const connection = await pool.getConnection();
  try {
    for (let i = 0; i < filas.length; i++) {
      const { numero: numeroFila, datos: fila } = filas[i];
      const codigo_barras = limpiarCodigo(fila.codigo_barras);
      const nombre = fila.nombre?.trim();
      const precio = parsearPrecio(fila.precio);
      // Celda vacia o sin columna: el stock no se toca.
      const textoStock = fila.stock?.trim() ?? '';
      const stock = textoStock === '' ? null : Number(textoStock);

      if (!nombre) {
        resumen.errores.push({ fila: numeroFila, motivo: 'Falta el nombre' });
        continue;
      }
      if (codigo_barras && esNotacionCientifica(codigo_barras)) {
        resumen.errores.push({
          fila: numeroFila,
          motivo: `Código de barras ilegible (${codigo_barras}): Excel lo pasó a notación científica. Poné la columna en formato Texto y volvé a escribir el código`,
        });
        continue;
      }
      if (!Number.isFinite(precio) || precio < 0) {
        resumen.errores.push({ fila: numeroFila, motivo: 'Precio invalido' });
        continue;
      }
      if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
        resumen.errores.push({ fila: numeroFila, motivo: 'Stock invalido: tiene que ser un numero entero, 0 o mayor' });
        continue;
      }

      try {
        await connection.beginTransaction();

        // Sin codigo, el producto se reconoce por el nombre (entre los que
        // tampoco tienen codigo), asi reimportar el archivo no lo duplica.
        // FOR UPDATE: que una venta en paralelo no cambie el stock en el medio.
        const [existente] = codigo_barras
          ? await connection.query(
              `SELECT id, stock FROM productos WHERE comercio_id = ? AND codigo_barras = ?
               ORDER BY id LIMIT 1 FOR UPDATE`,
              [comercio_id, codigo_barras]
            )
          : await connection.query(
              `SELECT id, stock FROM productos WHERE comercio_id = ? AND codigo_barras IS NULL AND nombre = ?
               ORDER BY id LIMIT 1 FOR UPDATE`,
              [comercio_id, nombre]
            );

        let productoId;
        let stockAnterior;
        const esNuevo = existente.length === 0;
        if (existente.length > 0) {
          productoId = existente[0].id;
          stockAnterior = existente[0].stock;
          await connection.query('UPDATE productos SET nombre = ?, precio = ? WHERE id = ?', [
            nombre,
            precio,
            productoId,
          ]);
        } else if (lugaresLibres <= 0) {
          await connection.rollback();
          resumen.errores.push({ fila: numeroFila, motivo: `Límite de ${LIMITE_PRODUCTOS} productos alcanzado` });
          continue;
        } else {
          const [result] = await connection.query(
            `INSERT INTO productos (codigo_barras, nombre, precio, comercio_id)
             VALUES (?, ?, ?, ?)`,
            [codigo_barras, nombre, precio, comercio_id]
          );
          productoId = result.insertId;
          stockAnterior = 0;
        }

        const diferencia = stock === null ? 0 : stock - stockAnterior;
        if (diferencia !== 0) {
          await connection.query('UPDATE productos SET stock = ? WHERE id = ?', [stock, productoId]);
          await connection.query(
            `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, usuario_id)
             VALUES (?, ?, ?, ?, ?)`,
            [productoId, diferencia > 0 ? 'entrada' : 'salida', Math.abs(diferencia), MOTIVO_STOCK_CSV, user_id]
          );
        }

        await connection.commit();
        if (esNuevo) {
          resumen.creados++;
          lugaresLibres--;
        } else {
          resumen.actualizados++;
        }
      } catch (err) {
        await connection.rollback();
        console.error(err);
        resumen.errores.push({ fila: numeroFila, motivo: 'Error al guardar en la base de datos' });
      }
    }
  } finally {
    connection.release();
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
    // Se achica antes de guardar (máx. 800px, JPG con calidad automática) y se
    // sobrescribe la foto anterior del producto para no acumular archivos.
    const subida = await cloudinary.uploader.upload(dataUri, {
      folder: `escaner/comercio_${comercio_id}`,
      public_id: `producto_${id}`,
      overwrite: true,
      invalidate: true,
      format: 'jpg',
      transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
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
