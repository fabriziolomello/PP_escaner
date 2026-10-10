import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { ScanIcon, UploadIcon } from '../components/icons'
import { useEscanerCodigoBarras } from '../hooks/useEscanerCodigoBarras'
import { crear, actualizar, obtenerPorId, subirFoto } from '../api/productos'
import './ProductoNuevoPage.css'

const CONTENEDOR_ID = 'lector-camara-nuevo-producto'
const FOTO_TAMANO_MAXIMO = 5 * 1024 * 1024

// Alta y edición comparten el formulario: con :id en la ruta
// (/productos/:id/editar) carga el producto y guarda con PUT.
export default function ProductoNuevoPage() {
  const { id } = useParams()
  const editando = Boolean(id)
  const [codigoBarras, setCodigoBarras] = useState('')
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const [escaneando, setEscaneando] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [cargandoProducto, setCargandoProducto] = useState(editando)

  const navigate = useNavigate()

  useEffect(() => {
    if (!editando) return
    obtenerPorId(id)
      .then((producto) => {
        setCodigoBarras(producto.codigo_barras)
        setNombre(producto.nombre)
        setPrecio(String(producto.precio))
        setFotoPreview(producto.foto_url || '')
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargandoProducto(false))
  }, [editando, id])

  useEscanerCodigoBarras(CONTENEDOR_ID, escaneando, (codigo) => {
    setCodigoBarras(codigo)
    setEscaneando(false)
  })

  function handleFotoChange(event) {
    const archivo = event.target.files[0]
    if (!archivo) return

    if (!['image/jpeg', 'image/png'].includes(archivo.type)) {
      setError('La foto debe ser un archivo JPG o PNG')
      event.target.value = ''
      return
    }
    if (archivo.size > FOTO_TAMANO_MAXIMO) {
      setError('La foto no puede superar los 5MB')
      event.target.value = ''
      return
    }

    setError('')
    setFoto(archivo)
    setFotoPreview(URL.createObjectURL(archivo))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setCargando(true)
    try {
      const datos = { codigoBarras, nombre, precio }
      const producto = editando ? await actualizar(id, datos) : await crear(datos)

      if (foto) {
        try {
          await subirFoto(producto.id, foto)
        } catch {
          // El producto ya se creo; se puede reintentar la foto desde su detalle.
          navigate(`/productos/${producto.id}`)
          return
        }
      }

      navigate(editando ? `/productos/${producto.id}` : '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="producto-nuevo-page">
      <p className="producto-nuevo-page__eyebrow">{editando ? 'Edición de producto' : 'Alta manual de producto'}</p>

      <div className="producto-nuevo-card">
        <PageHeader
          title={editando ? 'Editar producto' : 'Nuevo producto'}
          backTo={editando ? `/productos/${id}` : '/catalogo'}
        />

        {error && (
          <p className="producto-nuevo-card__error" role="alert">
            {error}
          </p>
        )}

        {cargandoProducto && <p className="producto-nuevo-card__estado">Cargando...</p>}

        {!cargandoProducto && (
          <form className="producto-nuevo-form" onSubmit={handleSubmit}>
            <div className="producto-nuevo-form__field">
              <span className="producto-nuevo-form__label">Código de barras</span>
              <div className="producto-nuevo-form__codigo-row">
                <input
                  className="producto-nuevo-form__input"
                  value={codigoBarras}
                  onChange={(event) => setCodigoBarras(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="producto-nuevo-form__scan-boton"
                  onClick={() => setEscaneando(true)}
                  aria-label="Escanear código de barras"
                >
                  <ScanIcon />
                </button>
              </div>
            </div>

            {escaneando && (
              <div className="producto-nuevo-camara">
                <div id={CONTENEDOR_ID} className="producto-nuevo-camara__video" />
              </div>
            )}

            <label className="producto-nuevo-form__field">
              <span className="producto-nuevo-form__label">Nombre del producto</span>
              <input
                className="producto-nuevo-form__input"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                required
              />
            </label>

            <label className="producto-nuevo-form__field">
              <span className="producto-nuevo-form__label">Precio</span>
              <input
                className="producto-nuevo-form__input"
                type="number"
                min="0"
                step="0.01"
                value={precio}
                onChange={(event) => setPrecio(event.target.value)}
                required
              />
            </label>

            <div className="producto-nuevo-form__field">
              <span className="producto-nuevo-form__label">Foto (opcional)</span>
              <label className="producto-nuevo-form__foto-picker">
                {fotoPreview ? (
                  <img src={fotoPreview} alt="" className="producto-nuevo-form__foto-preview" />
                ) : (
                  <UploadIcon />
                )}
                <span>{foto ? foto.name : fotoPreview ? 'Cambiar imagen' : 'Elegir imagen'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="producto-nuevo-form__foto-input"
                  onChange={handleFotoChange}
                />
              </label>
              <p className="producto-nuevo-form__nota">La foto se sube después de guardar el producto.</p>
              {editando && (
                <p className="producto-nuevo-form__nota">El stock se corrige desde Ingreso/Egreso.</p>
              )}
            </div>

            <button className="producto-nuevo-form__submit" type="submit" disabled={cargando}>
              {cargando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Guardar producto'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
