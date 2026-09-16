import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { crear } from '../api/productos'

export default function ProductoNuevoPage() {
  const [codigoBarras, setCodigoBarras] = useState('')
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setCargando(true)
    try {
      await crear({ codigoBarras, nombre, precio })
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Cargar producto</h1>

      {error && <p role="alert">{error}</p>}

      <label>
        Código de barras
        <input
          value={codigoBarras}
          onChange={(event) => setCodigoBarras(event.target.value)}
          required
        />
      </label>

      <label>
        Nombre
        <input value={nombre} onChange={(event) => setNombre(event.target.value)} required />
      </label>

      <label>
        Precio
        <input
          type="number"
          min="0"
          step="0.01"
          value={precio}
          onChange={(event) => setPrecio(event.target.value)}
          required
        />
      </label>

      <button type="submit" disabled={cargando}>
        {cargando ? 'Guardando...' : 'Guardar producto'}
      </button>
    </form>
  )
}
