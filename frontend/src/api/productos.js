import apiFetch from './client'

// Búsqueda compartida por el flujo de escaneo (codigoBarras) y por nombre
// (ver productos.controller.js:33-66). Sin filtros, trae el catálogo entero.
export function listar({ nombre, codigoBarras } = {}) {
  const params = new URLSearchParams()
  if (nombre) params.set('nombre', nombre)
  if (codigoBarras) params.set('codigo_barras', codigoBarras)

  const query = params.toString()
  return apiFetch(`/productos${query ? `?${query}` : ''}`)
}

export function obtenerPorId(id) {
  return apiFetch(`/productos/${id}`)
}

// Solo admin (el backend lo exige con requireAdmin, ver productos.routes.js:12).
export function crear({ codigoBarras, nombre, precio }) {
  return apiFetch('/productos', {
    method: 'POST',
    body: JSON.stringify({ codigo_barras: codigoBarras, nombre, precio }),
  })
}

// 'archivo' tiene que coincidir con upload.single('archivo') del backend
// (ver productos.routes.js:13, multer lee ese nombre de campo del form-data).
export function cargarCsv(archivo) {
  const formData = new FormData()
  formData.append('archivo', archivo)
  return apiFetch('/productos/csv', {
    method: 'POST',
    body: formData,
  })
}

// 'foto' tiene que coincidir con uploadFoto.single('foto') del backend
// (ver productos.routes.js, solo admin).
export function subirFoto(id, foto) {
  const formData = new FormData()
  formData.append('foto', foto)
  return apiFetch(`/productos/${id}/foto`, {
    method: 'POST',
    body: formData,
  })
}
