import { useEffect, useState } from 'react'
import { listar, crear } from '../api/empleados'

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [errorLista, setErrorLista] = useState('')

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [cargandoForm, setCargandoForm] = useState(false)

  function cargarLista() {
    setCargandoLista(true)
    setErrorLista('')
    listar()
      .then(setEmpleados)
      .catch((err) => setErrorLista(err.message))
      .finally(() => setCargandoLista(false))
  }

  useEffect(() => {
    cargarLista()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorForm('')
    setCargandoForm(true)
    try {
      await crear({ nombre, email, password })
      setNombre('')
      setEmail('')
      setPassword('')
      // En vez de armar a mano el nuevo item y agregarlo al estado local,
      // volvemos a pedir la lista completa: son pocos empleados por
      // comercio, así que el costo extra de la request es insignificante
      // y nos aseguramos de mostrar exactamente lo que quedó guardado.
      cargarLista()
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setCargandoForm(false)
    }
  }

  return (
    <div>
      <h1>Empleados</h1>

      <section>
        <h2>Nuevo empleado</h2>
        <form onSubmit={handleSubmit}>
          {errorForm && <p role="alert">{errorForm}</p>}
          <label>
            Nombre
            <input value={nombre} onChange={(event) => setNombre(event.target.value)} required />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={cargandoForm}>
            {cargandoForm ? 'Creando...' : 'Crear empleado'}
          </button>
        </form>
      </section>

      <section>
        <h2>Empleados actuales</h2>
        {cargandoLista && <p>Cargando...</p>}
        {errorLista && <p role="alert">{errorLista}</p>}
        {!cargandoLista && !errorLista && empleados.length === 0 && <p>No hay empleados cargados.</p>}
        {!cargandoLista && !errorLista && empleados.length > 0 && (
          <ul>
            {empleados.map((empleado) => (
              <li key={empleado.id}>
                {empleado.nombre} — {empleado.email}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
