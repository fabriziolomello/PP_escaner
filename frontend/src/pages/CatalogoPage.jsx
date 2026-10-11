import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ProductoListItem from '../components/ProductoListItem'
import { SearchIcon, PlusIcon, UploadIcon } from '../components/icons'
import { listar } from '../api/productos'
import './CatalogoPage.css'

export default function CatalogoPage() {
  const [busqueda, setBusqueda] = useState('')
  // Los desactivados no aparecen en la lista normal; se ven aparte para
  // poder reactivarlos desde su detalle.
  const [verDesactivados, setVerDesactivados] = useState(false)
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const nombreBuscado = busqueda.trim()
    setCargando(true)
    setError('')

    const timeoutId = setTimeout(() => {
      listar({ nombre: nombreBuscado || undefined, desactivados: verDesactivados })
        .then(setProductos)
        .catch((err) => setError(err.message))
        .finally(() => setCargando(false))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [busqueda, verDesactivados])

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

        <label className="catalogo-desactivados">
          <input
            type="checkbox"
            checked={verDesactivados}
            onChange={(event) => setVerDesactivados(event.target.checked)}
          />
          Ver productos desactivados
        </label>

        {error && (
          <p className="catalogo-card__error" role="alert">
            {error}
          </p>
        )}

        {cargando && <p className="catalogo-card__estado">Cargando...</p>}

        {!cargando && !error && (
          <p className="catalogo-card__contador">
            {productos.length} producto{productos.length === 1 ? '' : 's'}
            {verDesactivados && ` desactivado${productos.length === 1 ? '' : 's'}`}
          </p>
        )}

        <div className="catalogo-card__lista">
          {productos.map((producto) => (
            <ProductoListItem key={producto.id} producto={producto} mostrarCodigo mostrarStock />
          ))}
        </div>
      </div>
    </div>
  )
}
