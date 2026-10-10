import apiFetch from './client'

// items: [{ producto_id, cantidad }]. El precio lo toma el backend de la
// base, no del cliente (ver ventas.controller.js).
export function crear({ items, metodoPago }) {
  return apiFetch('/ventas', {
    method: 'POST',
    body: JSON.stringify({ items, metodo_pago: metodoPago }),
  })
}

// desde/hasta: Date (rango [desde, hasta)). Devuelve { ventas, resumen, limitado }:
// la lista viene cortada en 100, el resumen cubre todo el filtro.
export function listar({ desde, hasta, metodoPago } = {}) {
  const params = new URLSearchParams()
  if (desde) params.set('desde', desde.toISOString())
  if (hasta) params.set('hasta', hasta.toISOString())
  if (metodoPago) params.set('metodo_pago', metodoPago)

  const query = params.toString()
  return apiFetch(`/ventas${query ? `?${query}` : ''}`)
}

// Solo admin (requireAdmin en ventas.routes.js). Devuelve el stock vendido.
export function anular(id) {
  return apiFetch(`/ventas/${id}/anular`, { method: 'POST' })
}
