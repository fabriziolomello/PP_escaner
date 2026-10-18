// Excel de productos con las columnas que acepta la carga masiva
// (productos.controller.js cargarCsv). exceljs pesa bastante: se carga recién
// al descargar, igual que el PDF del ticket.
const COLUMNAS = [
  // Como texto ('@'): si no, Excel muestra los códigos largos como 7,79E+12
  // y les borra los ceros de adelante.
  { header: 'codigo_barras', key: 'codigo_barras', width: 18, style: { numFmt: '@' } },
  { header: 'nombre', key: 'nombre', width: 40 },
  { header: 'precio', key: 'precio', width: 12, style: { numFmt: '#,##0.00' } },
  { header: 'stock', key: 'stock', width: 10 },
]

export async function descargarExcelProductos(nombreArchivo, productos) {
  const { default: ExcelJS } = await import('exceljs')
  const libro = new ExcelJS.Workbook()
  const hoja = libro.addWorksheet('Productos', { views: [{ state: 'frozen', ySplit: 1 }] })
  hoja.columns = COLUMNAS
  hoja.getRow(1).font = { bold: true }

  for (const producto of productos) {
    hoja.addRow({
      codigo_barras: producto.codigo_barras ? String(producto.codigo_barras) : null,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      stock: producto.stock ?? null,
    })
  }

  const contenido = await libro.xlsx.writeBuffer()
  const blob = new Blob([contenido], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  link.click()
  URL.revokeObjectURL(url)
}
