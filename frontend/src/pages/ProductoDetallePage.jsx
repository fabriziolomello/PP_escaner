import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { ImagePlaceholderIcon, ScanIcon, UploadIcon, CartIcon } from '../components/icons'
import { obtenerPorId, subirFoto, cambiarActivo } from '../api/productos'
import { useAuth } from '../context/AuthContext'
import { useCarrito } from '../context/CarritoContext'
import { formatearPrecio } from '../utils/formato'
import './ProductoDetallePage.css'

const FOTO_TAMANO_MAXIMO = 5 * 1024 * 1024

export default function ProductoDetallePage() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const esAdmin = usuario.rol === 'admin'
  const { items, agregar } = useCarrito()
  const [producto, setProducto] = useState(null)
  const [error, setError] = useState('')
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [cambiandoActivo, setCambiandoActivo] = useState(false)

  useEffect(() => {
    setProducto(null)
    setError('')
    obtenerPorId(id)
      .then(setProducto)
      .catch((err) => setError(err.message))
  }, [id])

  const enCarrito = items.find((item) => item.producto_id === producto?.id)?.cantidad || 0

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

  async function handleActivo() {
    const activo = !producto.activo
    if (
      !activo &&
      !window.confirm(`¿Desactivar ${producto.nombre}? No va a aparecer al buscar ni se va a poder vender.`)
    ) {
      return
    }
    setError('')
    setCambiandoActivo(true)
    try {
      setProducto(await cambiarActivo(id, activo))
    } catch (err) {
      setError(err.message)
    } finally {
      setCambiandoActivo(false)
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
            {!producto.activo && (
              <p className="detalle-card__inactivo">
                Producto desactivado: no aparece al buscar ni se puede vender.
              </p>
            )}

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
            <p className="detalle-card__precio">{formatearPrecio(producto.precio)}</p>

            <p className={`detalle-card__stock${producto.stock <= 0 ? ' detalle-card__stock--agotado' : ''}`}>
              Stock: {producto.stock}
              {enCarrito > 0 && ` · ${enCarrito} en el carrito`}
            </p>

            {producto.codigo_barras && (
              <div className="detalle-card__codigo">
                <ScanIcon />
                {producto.codigo_barras}
              </div>
            )}

            {/* No se puede agregar mas de lo que hay en stock (ver ventas.controller.js). */}
            {producto.activo && (
              <button
                className="detalle-card__agregar"
                onClick={() => agregar(producto)}
                disabled={enCarrito >= producto.stock}
              >
                <CartIcon />
                {producto.stock <= 0
                  ? 'Sin stock'
                  : enCarrito >= producto.stock
                    ? 'Todo el stock ya está en el carrito'
                    : 'Agregar al carrito'}
              </button>
            )}

            {esAdmin && (
              <>
                <Link className="detalle-card__editar" to={`/productos/${producto.id}/editar`}>
                  Editar producto
                </Link>
                <button
                  className={`detalle-card__activo${producto.activo ? ' detalle-card__activo--desactivar' : ''}`}
                  onClick={handleActivo}
                  disabled={cambiandoActivo}
                >
                  {cambiandoActivo ? '...' : producto.activo ? 'Desactivar producto' : 'Reactivar producto'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
