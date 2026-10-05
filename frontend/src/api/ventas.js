import apiFetch from './client'

// items: [{ producto_id, cantidad }]. El precio lo toma el backend de la
// base, no del cliente (ver ventas.controller.js).
export function crear({ items, metodoPago }) {
  return apiFetch('/ventas', {
    method: 'POST',
    body: JSON.stringify({ items, metodo_pago: metodoPago }),
  })
}

export function listar() {
  return apiFetch('/ventas')
}

// Solo admin (requireAdmin en ventas.routes.js). Devuelve el stock vendido.
export function anular(id) {
  return apiFetch(`/ventas/${id}/anular`, { method: 'POST' })
}
