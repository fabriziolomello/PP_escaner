import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ProductoListItem from '../components/ProductoListItem'
import { SearchIcon, PlusIcon, UploadIcon } from '../components/icons'
import { listar } from '../api/productos'
import './CatalogoPage.css'

export default function CatalogoPage() {
  const [busqueda, setBusqueda] = useState('')
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const nombreBuscado = busqueda.trim()
    setCargando(true)
    setError('')

    const timeoutId = setTimeout(() => {
      listar(nombreBuscado ? { nombre: nombreBuscado } : {})
        .then(setProductos)
        .catch((err) => setError(err.message))
        .finally(() => setCargando(false))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [busqueda])

  return (
    <div className="catalogo-page">
      <p className="catalogo-page__eyebrow">Catálogo de productos</p>

      <div className="catalogo-card">
        <PageHeader title="Catálogo" backTo="/" />

        <label className="catalogo-input">
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar en catálogo"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
        </label>

        <div className="catalogo-acciones">
          <Link className="catalogo-accion" to="/productos/nuevo">
            <PlusIcon />
            Nuevo
          </Link>
          <Link className="catalogo-accion" to="/productos/importar">
            <UploadIcon />
            Cargar CSV
          </Link>
        </div>

        {error && (
          <p className="catalogo-card__error" role="alert">
            {error}
          </p>
        )}

        {cargando && <p className="catalogo-card__estado">Cargando...</p>}

        {!cargando && !error && (
          <p className="catalogo-card__contador">
            {productos.length} producto{productos.length === 1 ? '' : 's'}
          </p>
        )}

        <div className="catalogo-card__lista">
          {productos.map((producto) => (
            <ProductoListItem key={producto.id} producto={producto} mostrarCodigo />
          ))}
        </div>
      </div>
    </div>
  )
}
