import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listar } from '../api/productos'

// Siempre se muestra esta lista, aunque haya un solo resultado (o cero).
// codigo_barras NO tiene restricción de unicidad en la base (ver schema.sql:30-33):
// pueden existir productos duplicados por errores de carga, así que nunca
// asumimos "un match = el producto correcto" sin que la persona lo confirme.
export default function ResultadosPage() {
  const [searchParams] = useSearchParams()
  const nombre = searchParams.get('nombre')
  const codigoBarras = searchParams.get('codigo_barras')

  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setCargando(true)
    setError('')
    listar({ nombre, codigoBarras })
      .then(setProductos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [nombre, codigoBarras])

  return (
    <div>
      <h1>Resultados</h1>

      {cargando && <p>Buscando...</p>}
      {error && <p role="alert">{error}</p>}

      {!cargando && !error && productos.length === 0 && <p>No se encontraron productos.</p>}

      {!cargando && !error && productos.length > 0 && (
        <ul>
          {productos.map((producto) => (
            <li key={producto.id}>
              <Link to={`/productos/${producto.id}`}>
                {producto.nombre} — ${producto.precio} (código: {producto.codigo_barras})
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
