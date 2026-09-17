import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { ImagePlaceholderIcon, ScanIcon, UploadIcon } from '../components/icons'
import { obtenerPorId, subirFoto } from '../api/productos'
import { useAuth } from '../context/AuthContext'
import './ProductoDetallePage.css'

const FOTO_TAMANO_MAXIMO = 5 * 1024 * 1024

export default function ProductoDetallePage() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const esAdmin = usuario.rol === 'admin'
  const [producto, setProducto] = useState(null)
  const [error, setError] = useState('')
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  useEffect(() => {
    setProducto(null)
    setError('')
    obtenerPorId(id)
      .then(setProducto)
      .catch((err) => setError(err.message))
  }, [id])

  async function handleFotoChange(event) {
    const archivo = event.target.files[0]
    event.target.value = ''
    if (!archivo) return

    if (!['image/jpeg', 'image/png'].includes(archivo.type)) {
      setError('La foto debe ser un archivo JPG o PNG')
      return
    }
    if (archivo.size > FOTO_TAMANO_MAXIMO) {
      setError('La foto no puede superar los 5MB')
      return
    }

    setError('')
    setSubiendoFoto(true)
    try {
      const actualizado = await subirFoto(id, archivo)
      setProducto(actualizado)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubiendoFoto(false)
    }
  }

  return (
    <div className="detalle-page">
      <p className="detalle-page__eyebrow">Resultado / detalle</p>

      <div className="detalle-card">
        <PageHeader title="Detalle del producto" backTo="/catalogo" />

        {error && (
          <p className="detalle-card__error" role="alert">
            {error}
          </p>
        )}
        {!error && !producto && <p className="detalle-card__estado">Cargando...</p>}

        {producto && (
          <>
            <div className="detalle-card__imagen">
              {producto.foto_url ? (
                <img src={producto.foto_url} alt={producto.nombre} />
              ) : (
                <ImagePlaceholderIcon width="32" height="32" />
              )}

              {esAdmin && (
                <label className="detalle-card__foto-boton" aria-label={producto.foto_url ? 'Cambiar foto' : 'Subir foto'}>
                  {subiendoFoto ? '...' : <UploadIcon width="16" height="16" />}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="detalle-card__foto-input"
                    onChange={handleFotoChange}
                    disabled={subiendoFoto}
                  />
                </label>
              )}
            </div>

            <h2 className="detalle-card__nombre">{producto.nombre}</h2>
            <p className="detalle-card__precio">${producto.precio}</p>

            <div className="detalle-card__codigo">
              <ScanIcon />
              {producto.codigo_barras}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
