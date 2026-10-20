import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { cambiarPassword } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { LegalLinks } from './LegalPage'
import './MiCuentaPage.css'

// Solo admin: cambia su propia contraseña. Los empleados no pueden; se la
// cambia el admin desde Empleados.
export default function MiCuentaPage() {
  const { usuario, login } = useAuth()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmNueva, setConfirmNueva] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardada, setGuardada] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setGuardada(false)
    if (nueva !== confirmNueva) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }
    setGuardando(true)
    try {
      // Cambiar la contraseña cierra las demás sesiones; esta sigue con el
      // token nuevo que devuelve el backend.
      const { token } = await cambiarPassword(actual, nueva)
      login(token, usuario)
      setActual('')
      setNueva('')
      setConfirmNueva('')
      setGuardada(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mi-cuenta-page">
      <div className="mi-cuenta-card">
        <PageHeader title="Mi cuenta" backTo="/" />

        <div className="mi-cuenta-card__datos">
          <p className="mi-cuenta-card__nombre">{usuario.nombre}</p>
          <p className="mi-cuenta-card__email">{usuario.email}</p>
          <p className="mi-cuenta-card__email">{usuario.comercio_nombre}</p>
        </div>

        {error && (
          <p className="mi-cuenta-card__error" role="alert">
            {error}
          </p>
        )}
        {guardada && (
          <p className="mi-cuenta-card__ok" role="status">
            Contraseña actualizada.
          </p>
        )}

        <form className="mi-cuenta-form" onSubmit={handleSubmit}>
          <label className="mi-cuenta-form__field">
            <span className="mi-cuenta-form__label">Contraseña actual</span>
            <input
              className="mi-cuenta-form__input"
              type="password"
              value={actual}
              onChange={(event) => setActual(event.target.value)}
              required
            />
          </label>
          <label className="mi-cuenta-form__field">
            <span className="mi-cuenta-form__label">Contraseña nueva</span>
            <input
              className="mi-cuenta-form__input"
              type="password"
              value={nueva}
              onChange={(event) => setNueva(event.target.value)}
              required
            />
          </label>
          <label className="mi-cuenta-form__field">
            <span className="mi-cuenta-form__label">Repetir contraseña nueva</span>
            <input
              className="mi-cuenta-form__input"
              type="password"
              value={confirmNueva}
              onChange={(event) => setConfirmNueva(event.target.value)}
              required
            />
          </label>
          <button className="mi-cuenta-form__submit" type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>

        <LegalLinks className="mi-cuenta-card__legal" />
      </div>
    </div>
  )
}
