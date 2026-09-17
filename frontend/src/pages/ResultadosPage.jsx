import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ProductoListItem from '../components/ProductoListItem'
import { ScanIcon } from '../components/icons'
import { listar } from '../api/productos'
import './ResultadosPage.css'

// Siempre se muestra esta lista, aunque haya un solo resultado (o cero).
// codigo_barras NO tiene restricción de unicidad en la base (ver schema.sql:30-33):
// pueden existir productos duplicados por errores de carga, así que nunca
// asumimos "un match = el producto correcto" sin que la persona lo confirme.
export default function ResultadosPage() {
  const [searchParams] = useSearchParams()
  const codigoBarras = searchParams.get('codigo_barras')
  const navigate = useNavigate()

  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setCargando(true)
    setError('')
    listar({ codigoBarras })
      .then(setProductos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [codigoBarras])

  return (
    <div className="resultados-page">
      <p className="resultados-page__eyebrow">Resultado del escaneo</p>

      <div className="resultados-card">
        <PageHeader title="Resultado del escaneo" backTo="/" />

        <div className="resultados-card__codigo">
          <ScanIcon />
          {codigoBarras}
        </div>

        {cargando && <p className="resultados-card__estado">Buscando...</p>}
        {error && (
          <p className="resultados-card__error" role="alert">
            {error}
          </p>
        )}

        {!cargando && !error && (
          <p className="resultados-card__contador">
            {productos.length === 0
              ? 'No se encontraron productos con este código'
              : `${productos.length} producto${productos.length === 1 ? '' : 's'} coincide${
                  productos.length === 1 ? '' : 'n'
                } con este código`}
          </p>
        )}

        <div className="resultados-card__lista">
          {productos.map((producto) => (
            <ProductoListItem key={producto.id} producto={producto} />
          ))}
        </div>

        <button className="resultados-card__reescanear" onClick={() => navigate('/escanear')}>
          <ScanIcon />
          Escanear de nuevo
        </button>
      </div>
    </div>
  )
}
