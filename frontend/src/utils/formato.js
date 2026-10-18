// Helpers de presentación compartidos por el carrito, Ventas, Ingreso/Egreso y Caja.

export const METODOS_PAGO = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'mercadopago', etiqueta: 'MercadoPago' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
]

export function etiquetaMetodoPago(valor) {
  return METODOS_PAGO.find((metodo) => metodo.valor === valor)?.etiqueta || valor
}

// Los DECIMAL llegan del backend como string ("1500.00"); los totales
// calculados en el cliente son number. Ambos se muestran igual, en formato
// argentino: punto para los miles y coma para los decimales ($1.500,00).
const FORMATO_PESOS = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatearPrecio(valor) {
  const numero = Number(valor)
  return `${numero < 0 ? '-' : ''}$${FORMATO_PESOS.format(Math.abs(numero))}`
}

export function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatearFechaHora(fecha) {
  return new Date(fecha).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
