import apiFetch from './client'

// Devuelve { token, usuario } (ver auth.controller.js:82-92)
export function login(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// Crea el comercio + su usuario admin en un solo paso.
// Devuelve { token, usuario, comercio } (ver auth.controller.js:46)
export function registrarComercio({ nombreComercio, nombreAdmin, email, password }) {
  return apiFetch('/auth/registro', {
    method: 'POST',
    body: JSON.stringify({
      nombre_comercio: nombreComercio,
      nombre_admin: nombreAdmin,
      email,
      password,
    }),
  })
}
