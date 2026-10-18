// CSV de productos con el mismo formato que acepta la carga masiva
// (productos.controller.js cargarCsv). Va con ';' y coma decimal, como lo
// guarda Excel en español, y con BOM para que Excel lea bien los acentos.
const ENCABEZADO = ['codigo_barras', 'nombre', 'precio', 'stock']

function celda(valor) {
  const texto = String(valor ?? '')
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

// ="..." hace que Excel trate el código como texto: si no, los de 13 dígitos
// los muestra como 7,79E+12 (y así los guarda) y les borra los ceros de adelante.
function celdaCodigo(codigo) {
  return codigo ? `="${String(codigo).replace(/"/g, '""')}"` : ''
}

function celdaPrecio(precio) {
  return Number(precio).toFixed(2).replace('.', ',')
}

export function armarCsvProductos(productos) {
  const filas = productos.map((producto) =>
    [celdaCodigo(producto.codigo_barras), celda(producto.nombre), celdaPrecio(producto.precio), producto.stock ?? ''].join(';')
  )
  return [ENCABEZADO.join(';'), ...filas].join('\r\n')
}

export function descargarCsv(nombreArchivo, contenido) {
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  link.click()
  URL.revokeObjectURL(url)
}
