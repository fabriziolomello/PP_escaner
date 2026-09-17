import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { crear } from '../api/empleados'
import './EmpleadoNuevoPage.css'

export default function EmpleadoNuevoPage() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setCargando(true)
    try {
      await crear({ nombre, email, password })
      navigate('/empleados')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="empleado-nuevo-page">
      <div className="empleado-nuevo-card">
        <PageHeader title="Nuevo empleado" backTo="/empleados" />

        {error && (
          <p className="empleado-nuevo-card__error" role="alert">
            {error}
          </p>
        )}

        <form className="empleado-nuevo-form" onSubmit={handleSubmit}>
          <label className="empleado-nuevo-form__field">
            <span className="empleado-nuevo-form__label">Nombre</span>
            <input
              className="empleado-nuevo-form__input"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              required
            />
          </label>

          <label className="empleado-nuevo-form__field">
            <span className="empleado-nuevo-form__label">Email</span>
            <input
              className="empleado-nuevo-form__input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="empleado-nuevo-form__field">
            <span className="empleado-nuevo-form__label">Contraseña</span>
            <input
              className="empleado-nuevo-form__input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <span className="empleado-nuevo-form__hint">
              El empleado va a poder cambiarla luego de iniciar sesión.
            </span>
          </label>

          <button className="empleado-nuevo-form__submit" type="submit" disabled={cargando}>
            {cargando ? 'Creando...' : 'Crear empleado'}
          </button>
        </form>
      </div>
    </div>
  )
}
