import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import ProductoListItem from '../components/ProductoListItem'
import { SearchIcon } from '../components/icons'
import { listar } from '../api/productos'
import './BuscarProductoPage.css'

export default function BuscarProductoPage() {
  const [nombre, setNombre] = useState('')
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const nombreBuscado = nombre.trim()
    if (!nombreBuscado) {
      setProductos([])
      setError('')
      setCargando(false)
      return
    }

    setCargando(true)
    setError('')

    const timeoutId = setTimeout(() => {
      listar({ nombre: nombreBuscado })
        .then(setProductos)
        .catch((err) => setError(err.message))
        .finally(() => setCargando(false))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [nombre])

  const buscando = nombre.trim().length > 0

  return (
    <div className="buscar-page">
      <p className="buscar-page__eyebrow">Buscar por nombre</p>

      <div className="buscar-card">
        <PageHeader title="Buscar producto" backTo="/" />

        <label className="buscar-input">
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar producto"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
          />
        </label>

        {error && (
          <p className="buscar-card__error" role="alert">
            {error}
          </p>
        )}

        {!error && cargando && <p className="buscar-card__estado">Buscando...</p>}

        {!error && !cargando && buscando && (
          <p className="buscar-card__contador">
            {productos.length} resultado{productos.length === 1 ? '' : 's'}
          </p>
        )}

        {!error && !cargando && buscando && productos.length === 0 && (
          <p className="buscar-card__estado">No se encontraron productos.</p>
        )}

        <div className="buscar-card__lista">
          {productos.map((producto) => (
            <ProductoListItem key={producto.id} producto={producto} />
          ))}
        </div>
      </div>
    </div>
  )
}
