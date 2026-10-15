import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { restablecerPassword } from '../api/auth'
import { ScanIcon } from '../components/icons'
import './Login.css'

// Destino del link del email de recuperación (?token=...).
export default function RestablecerPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(token ? '' : 'El link no es válido. Revisá que esté completo.')
  const [cargando, setCargando] = useState(false)
  const [listo, setListo] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setCargando(true)
    try {
      await restablecerPassword(token, password)
      setListo(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-page">
      <p className="login-page__eyebrow">Recuperar contraseña</p>
      <div className="login-card">
        <div className="login-card__icon">
          <ScanIcon width="26" height="26" />
        </div>
        <h1 className="login-card__title">Contraseña nueva</h1>

        {error && (
          <p className="login-card__error" role="alert">
            {error}
          </p>
        )}

        {listo ? (
          <>
            <p className="login-card__ok" role="status">
              Listo, ya cambiamos tu contraseña.
            </p>
            <p className="login-card__footer">
              <Link className="login-card__link" to="/login">
                Ingresar
              </Link>
            </p>
          </>
        ) : (
          <>
            {token && (
              <form className="login-form" onSubmit={handleSubmit}>
                <label className="login-form__field">
                  <span className="login-form__label">Contraseña nueva</span>
                  <input
                    className="login-form__input"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                <label className="login-form__field">
                  <span className="login-form__label">Repetir contraseña</span>
                  <input
                    className="login-form__input"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </label>
                <button className="login-form__submit" type="submit" disabled={cargando}>
                  {cargando ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              </form>
            )}
            <p className="login-card__footer">
              ¿El link venció?{' '}
              <Link className="login-card__link" to="/recuperar-password">
                Pedí uno nuevo
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
