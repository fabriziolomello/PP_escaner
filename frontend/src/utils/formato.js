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
// calculados en el cliente son number. Ambos se muestran igual.
export function formatearPrecio(valor) {
  const numero = Number(valor)
  return `${numero < 0 ? '-' : ''}$${Math.abs(numero).toFixed(2)}`
}

export function formatearFechaHora(fecha) {
  return new Date(fecha).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
