import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login as loginApi } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { ScanIcon } from '../components/icons'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setCargando(true)
    try {
      const { token, usuario } = await loginApi(email, password)
      login(token, usuario)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-page">
      <p className="login-page__eyebrow">Login</p>

      <div className="login-card">
        <div className="login-card__icon">
          <ScanIcon width="26" height="26" />
        </div>

        <h1 className="login-card__title">Ingresar</h1>
        <p className="login-card__subtitle">Accedé con tu cuenta</p>

        {error && (
          <p className="login-card__error" role="alert">
            {error}
          </p>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-form__field">
            <span className="login-form__label">Usuario</span>
            <input
              className="login-form__input"
              type="email"
              placeholder="usuario@comercio.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="login-form__field">
            <span className="login-form__label">Contraseña</span>
            <input
              className="login-form__input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button className="login-form__submit" type="submit" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="login-card__footer">
          ¿Sos dueño de un comercio?{' '}
          <Link className="login-card__link" to="/registro">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
