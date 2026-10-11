import apiFetch from './client'

// Todas las rutas son admin-only en el backend (empleados.routes.js).
export function listar() {
  return apiFetch('/empleados')
}

export function crear({ nombre, email, password }) {
  return apiFetch('/empleados', {
    method: 'POST',
    body: JSON.stringify({ nombre, email, password }),
  })
}

export function obtener(id) {
  return apiFetch(`/empleados/${id}`)
}

// Desactivado no puede entrar y su sesión abierta se corta.
export function cambiarActivo(id, activo) {
  return apiFetch(`/empleados/${id}/activo`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  })
}

// La contraseña actual no se puede ver (se guarda encriptada): el admin le
// asigna una nueva.
export function cambiarPassword(id, password) {
  return apiFetch(`/empleados/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  })
}
