const API_URL = import.meta.env.VITE_API_URL

// Wrapper sobre fetch: arma la URL final, agrega el JWT guardado en
// localStorage (si existe) y traduce una respuesta con error del backend
// ({ error: '...' }, ver controllers/*.js) en un Error de JS normal, para
// poder usar try/catch en los componentes en vez de chequear response.ok
// en cada llamada.
export default async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token')

  const headers = { ...options.headers }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  // FormData (carga de CSV) arma su propio Content-Type con boundary;
  // si lo pisamos acá, el backend no puede parsear el body.
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  // Algunas respuestas (204, o errores de red del proxy) pueden no traer
  // JSON; data queda en null en vez de romper acá.
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error || `Error ${response.status}`)
  }

  return data
}
