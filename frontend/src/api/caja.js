import apiFetch from './client'

// Tienen que coincidir con MOTIVOS de caja.controller.js.
export const MOTIVOS_CAJA = {
  ingreso: ['Otro'],
  egreso: ['Retiro', 'Pago a proveedor', 'Otro'],
}

// Devuelve { caja: null } si no hay ninguna abierta; si hay, la caja con
// sus totales (ventas por medio de pago, efectivo esperado, movimientos).
export function obtenerActual() {
  return apiFetch('/caja/actual')
}

export function abrir(montoInicial) {
  return apiFetch('/caja/abrir', {
    method: 'POST',
    body: JSON.stringify({ monto_inicial: montoInicial }),
  })
}

export function registrarMovimiento({ tipo, monto, motivo }) {
  return apiFetch('/caja/movimientos', {
    method: 'POST',
    body: JSON.stringify({ tipo, monto, motivo }),
  })
}

// Devuelve el resumen final con la diferencia (contado - esperado).
export function cerrar(montoFinalDeclarado) {
  return apiFetch('/caja/cerrar', {
    method: 'POST',
    body: JSON.stringify({ monto_final_declarado: montoFinalDeclarado }),
  })
}

export function listarCerradas() {
  return apiFetch('/caja/cerradas')
}

// Detalle de una caja con sus totales y movimientos (para los cierres anteriores).
export function obtenerPorId(id) {
  return apiFetch(`/caja/${id}`)
}
