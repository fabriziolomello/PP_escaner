import apiFetch from './client'

// Publico (sin login). Devuelve { precio, dias_prueba, limite_productos, limite_empleados }.
export function obtenerPlan() {
  return apiFetch('/suscripcion/plan')
}
