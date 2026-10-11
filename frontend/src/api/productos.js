import apiFetch from './client'

// Búsqueda compartida por el flujo de escaneo (codigoBarras) y por nombre
// (ver productos.controller.js). Sin filtros, trae el catálogo entero.
// Solo productos activos; con desactivados: true (solo admin) trae
// únicamente los desactivados.
export function listar({ nombre, codigoBarras, desactivados } = {}) {
  const params = new URLSearchParams()
  if (nombre) params.set('nombre', nombre)
  if (codigoBarras) params.set('codigo_barras', codigoBarras)
  if (desactivados) params.set('desactivados', '1')

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

// Solo admin. El stock no se edita acá: va por Ingreso/Egreso.
export function actualizar(id, { codigoBarras, nombre, precio }) {
  return apiFetch(`/productos/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ codigo_barras: codigoBarras, nombre, precio }),
  })
}

// Solo admin. Desactivado no aparece al buscar/escanear ni se puede vender.
export function cambiarActivo(id, activo) {
  return apiFetch(`/productos/${id}/activo`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
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
