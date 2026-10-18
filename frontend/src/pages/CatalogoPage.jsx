import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ProductoListItem from '../components/ProductoListItem'
import { SearchIcon, PlusIcon, UploadIcon, DownloadIcon } from '../components/icons'
import { listar } from '../api/productos'
import { armarCsvProductos, descargarCsv } from '../utils/csv'
import './CatalogoPage.css'

export default function CatalogoPage() {
  const [busqueda, setBusqueda] = useState('')
  // Los desactivados no aparecen en la lista normal; se ven aparte para
  // poder reactivarlos desde su detalle.
  const [verDesactivados, setVerDesactivados] = useState(false)
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exportando, setExportando] = useState(false)

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

  // Exporta todos los activos (sin importar la búsqueda), en el formato que
  // acepta Cargar CSV: se edita y se vuelve a subir.
  async function exportarCatalogo() {
    setError('')
    setExportando(true)
    try {
      const activos = await listar()
      const fecha = new Date().toLocaleDateString('sv') // AAAA-MM-DD
      descargarCsv(`catalogo-${fecha}.csv`, armarCsvProductos(activos))
    } catch (err) {
      setError(err.message)
    } finally {
      setExportando(false)
    }
  }

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
          <button
            type="button"
            className="catalogo-accion catalogo-accion--ancha"
            onClick={exportarCatalogo}
            disabled={exportando}
          >
            <DownloadIcon />
            {exportando ? 'Exportando...' : 'Exportar catálogo'}
          </button>
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
