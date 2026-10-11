import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { obtener, cambiarActivo, cambiarPassword } from '../api/empleados'
import './EmpleadoDetallePage.css'

// La contraseña actual no se puede mostrar (se guarda encriptada): el admin
// le asigna una nueva y se la pasa al empleado. Por eso el campo se puede
// mostrar en texto plano, para ver bien lo que se escribe.
export default function EmpleadoDetallePage() {
  const { id } = useParams()
  const [empleado, setEmpleado] = useState(null)
  const [error, setError] = useState('')

  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [guardandoPassword, setGuardandoPassword] = useState(false)
  const [passwordGuardada, setPasswordGuardada] = useState(false)

  const [cambiandoActivo, setCambiandoActivo] = useState(false)

  useEffect(() => {
    obtener(id)
      .then(setEmpleado)
      .catch((err) => setError(err.message))
  }, [id])

  async function handlePassword(event) {
    event.preventDefault()
    setError('')
    setPasswordGuardada(false)
    setGuardandoPassword(true)
    try {
      await cambiarPassword(id, password)
      setPassword('')
      setMostrarPassword(false)
      setPasswordGuardada(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardandoPassword(false)
    }
  }

  async function handleActivo() {
    const activo = !empleado.activo
    if (!activo && !window.confirm(`¿Desactivar a ${empleado.nombre}? No va a poder ingresar más.`)) {
      return
    }
    setError('')
    setCambiandoActivo(true)
    try {
      setEmpleado(await cambiarActivo(id, activo))
    } catch (err) {
      setError(err.message)
    } finally {
      setCambiandoActivo(false)
    }
  }

  return (
    <div className="empleado-detalle-page">
      <div className="empleado-detalle-card">
        <PageHeader title="Empleado" backTo="/empleados" />

        {error && (
          <p className="empleado-detalle-card__error" role="alert">
            {error}
          </p>
        )}
        {!error && !empleado && <p className="empleado-detalle-card__estado">Cargando...</p>}

        {empleado && (
          <>
            <div className="empleado-detalle-card__datos">
              <p className="empleado-detalle-card__nombre">{empleado.nombre}</p>
              <p className="empleado-detalle-card__email">{empleado.email}</p>
              {!empleado.activo && <p className="empleado-detalle-card__inactivo">Desactivado: no puede ingresar</p>}
            </div>

            <form className="empleado-detalle-form" onSubmit={handlePassword}>
              <label className="empleado-detalle-form__field">
                <span className="empleado-detalle-form__label">Contraseña nueva</span>
                <span className="empleado-detalle-form__password">
                  <input
                    className="empleado-detalle-form__input"
                    type={mostrarPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setPasswordGuardada(false)
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="empleado-detalle-form__ver"
                    onClick={() => setMostrarPassword((actual) => !actual)}
                  >
                    {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </span>
                <span className="empleado-detalle-form__hint">
                  La contraseña actual no se puede ver. Poné una nueva y pasásela a {empleado.nombre}.
                </span>
              </label>

              {passwordGuardada && (
                <p className="empleado-detalle-form__ok" role="status">
                  Contraseña actualizada.
                </p>
              )}

              <button className="empleado-detalle-form__submit" type="submit" disabled={guardandoPassword}>
                {guardandoPassword ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>

            <button
              className={`empleado-detalle-card__activo${empleado.activo ? ' empleado-detalle-card__activo--desactivar' : ''}`}
              onClick={handleActivo}
              disabled={cambiandoActivo}
            >
              {cambiandoActivo ? '...' : empleado.activo ? 'Desactivar empleado' : 'Reactivar empleado'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
