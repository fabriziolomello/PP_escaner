import apiFetch from './client'

// Devuelve { estado, vence_en, dias_restantes, en_prueba, precio, pagos }.
// estado: 'activa' | 'por_vencer' | 'gracia' | 'vencida' (ver suscripcion.controller.js).
export function obtener() {
  return apiFetch('/suscripcion')
}

// Devuelve { url } del checkout de MercadoPago.
export function pagar() {
  return apiFetch('/suscripcion/pagar', { method: 'POST' })
}

// Al volver del checkout: acredita el pago sin esperar al webhook.
// Devuelve el estado nuevo + pago: 'approved' | 'pending' | 'rejected' | 'monto_invalido' | ...
export function confirmar(paymentId) {
  return apiFetch('/suscripcion/confirmar', {
    method: 'POST',
    body: JSON.stringify({ payment_id: paymentId }),
  })
}
