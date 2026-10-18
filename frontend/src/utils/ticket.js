import { etiquetaMetodoPago, formatearFecha, formatearPrecio } from './formato'

// Ticket de una venta en PDF, del ancho de un rollo de impresora térmica
// de 80mm. No es fiscal: lleva la leyenda "No válido como factura".
// jsPDF se pasa como parámetro porque se carga aparte (ver TicketAcciones).

const ANCHO = 80
const MARGEN = 5
const DERECHA = ANCHO - MARGEN
const ANCHO_UTIL = ANCHO - MARGEN * 2

// Alto de una línea en mm para un tamaño de letra en puntos.
function interlineado(tamano) {
  return tamano * 0.42
}

function formatearHora(fecha) {
  return new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

// Dibuja el ticket y devuelve hasta dónde llegó (en mm), para poder
// medir el alto con una primera pasada.
function dibujar(doc, { comercio, venta }) {
  let y = MARGEN + 4

  function texto(contenido, { tamano = 9, negrita = false, alineacion = 'left' } = {}) {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal')
    doc.setFontSize(tamano)
    const lineas = doc.splitTextToSize(contenido, ANCHO_UTIL)
    const x = alineacion === 'center' ? ANCHO / 2 : MARGEN
    doc.text(lineas, x, y, { align: alineacion })
    y += lineas.length * interlineado(tamano)
  }

  // Texto a la izquierda y monto a la derecha en la misma línea.
  function fila(izquierda, derecha, { tamano = 9, negrita = false } = {}) {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal')
    doc.setFontSize(tamano)
    doc.text(izquierda, MARGEN, y)
    doc.text(derecha, DERECHA, y, { align: 'right' })
    y += interlineado(tamano)
  }

  function separador() {
    y += 1
    doc.setLineDashPattern([1, 1], 0)
    doc.setLineWidth(0.2)
    doc.line(MARGEN, y, DERECHA, y)
    y += 4
  }

  texto(comercio, { tamano: 13, negrita: true, alineacion: 'center' })
  y += 1
  texto(`${formatearFecha(venta.creado_en)} ${formatearHora(venta.creado_en)}`, { alineacion: 'center' })
  texto(`Ticket N° ${venta.id}`, { alineacion: 'center' })
  separador()

  for (const item of venta.items) {
    texto(item.nombre, { negrita: true })
    fila(`${item.cantidad} × ${formatearPrecio(item.precio_unitario)}`, formatearPrecio(item.subtotal))
    y += 1.5
  }
  separador()

  fila('TOTAL', formatearPrecio(venta.total), { tamano: 12, negrita: true })
  y += 1
  fila('Medio de pago', etiquetaMetodoPago(venta.metodo_pago))
  separador()

  texto('No válido como factura', { tamano: 8, alineacion: 'center' })
  texto('¡Gracias por su compra!', { tamano: 8, alineacion: 'center' })

  return y
}

export function nombreArchivoTicket(venta) {
  return `ticket-${venta.id}.pdf`
}

export function generarTicketPdf(jsPDF, datos) {
  // El alto depende de cuántos productos haya: se mide en una hoja
  // descartable bien larga y después se dibuja en una del alto justo.
  const alto = dibujar(new jsPDF({ unit: 'mm', format: [ANCHO, 1000] }), datos) + MARGEN
  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, Math.max(alto, ANCHO)] })
  dibujar(doc, datos)
  return doc.output('blob')
}
