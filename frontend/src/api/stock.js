import apiFetch from './client'

// Tienen que coincidir con MOTIVOS de stock.controller.js.
export const MOTIVOS_STOCK = {
  entrada: ['Reposición de mercadería', 'Corrección de conteo'],
  salida: ['Rotura/vencimiento', 'Corrección de conteo'],
}

// Devuelve el producto con el stock ya actualizado.
export function registrarMovimiento({ productoId, tipo, cantidad, motivo }) {
  return apiFetch('/stock/movimientos', {
    method: 'POST',
    body: JSON.stringify({ producto_id: productoId, tipo, cantidad, motivo }),
  })
}

export function listarMovimientos() {
  return apiFetch('/stock/movimientos')
}
