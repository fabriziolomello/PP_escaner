import apiFetch from './client'

// Devuelve { token, usuario } (ver auth.controller.js:82-92)
export function login(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// Crea el comercio + su usuario admin en un solo paso. No inicia sesión:
// devuelve { pendiente_verificacion, email, email_enviado } y el admin entra
// recién después de tocar el link del email (ver verificarEmail).
export function registrarComercio({ nombreComercio, nombreAdmin, email, password, aceptaTerminos }) {
  return apiFetch('/auth/registro', {
    method: 'POST',
    body: JSON.stringify({
      nombre_comercio: nombreComercio,
      nombre_admin: nombreAdmin,
      email,
      password,
      acepta_terminos: aceptaTerminos,
    }),
  })
}

// Vuelve a mandar el link de confirmación (el login devuelve
// EMAIL_NO_VERIFICADO mientras no se confirme).
export function reenviarVerificacion(email) {
  return apiFetch('/auth/reenviar-verificacion', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

// Token del link del email. Devuelve { token, usuario }: queda logueado.
export function verificarEmail(token) {
  return apiFetch('/auth/verificar-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

// Solo admins reciben el email; la respuesta es igual exista o no la cuenta.
export function recuperarPassword(email) {
  return apiFetch('/auth/recuperar-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function restablecerPassword(token, password) {
  return apiFetch('/auth/restablecer-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

// Solo admin: cambia su propia contraseña.
export function cambiarPassword(actual, nueva) {
  return apiFetch('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ actual, nueva }),
  })
}
