import apiFetch from './client'

// Ambas rutas son admin-only en el backend (empleados.routes.js:8-9).
export function listar() {
  return apiFetch('/empleados')
}

export function crear({ nombre, email, password }) {
  return apiFetch('/empleados', {
    method: 'POST',
    body: JSON.stringify({ nombre, email, password }),
  })
}
