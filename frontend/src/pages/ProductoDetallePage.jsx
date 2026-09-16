import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { obtenerPorId } from '../api/productos'

export default function ProductoDetallePage() {
  const { id } = useParams()
  const [producto, setProducto] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setProducto(null)
    setError('')
    obtenerPorId(id)
      .then(setProducto)
      .catch((err) => setError(err.message))
  }, [id])

  if (error) return <p role="alert">{error}</p>
  if (!producto) return <p>Cargando...</p>

  return (
    <div>
      <h1>{producto.nombre}</h1>
      <p>Precio: ${producto.precio}</p>
      <p>Código de barras: {producto.codigo_barras}</p>
      <Link to="/">Volver al inicio</Link>
    </div>
  )
}
