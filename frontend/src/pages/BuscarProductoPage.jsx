import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function BuscarProductoPage() {
  const [nombre, setNombre] = useState('')
  const navigate = useNavigate()

  function handleSubmit(event) {
    event.preventDefault()
    navigate(`/productos/resultados?nombre=${encodeURIComponent(nombre)}`)
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Buscar producto</h1>
      <label>
        Nombre
        <input
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          required
        />
      </label>
      <button type="submit">Buscar</button>
    </form>
  )
}
