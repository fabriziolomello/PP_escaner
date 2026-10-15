import { useState } from 'react'
import { Link } from 'react-router-dom'
import { registrarComercio, reenviarVerificacion } from '../api/auth'
import PageHeader from '../components/PageHeader'
import './Login.css'
import './Registro.css'

export default function Registro() {
  const [nombreComercio, setNombreComercio] = useState('')
  const [nombreAdmin, setNombreAdmin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  // Registro hecho: no se inicia sesión hasta confirmar el email.
  const [registrado, setRegistrado] = useState(null)
  const [reenviando, setReenviando] = useState(false)
  const [reenviado, setReenviado] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setCargando(true)
    try {
      const resultado = await registrarComercio({
        nombreComercio,
        nombreAdmin,
        email,
        password,
      })
      setRegistrado(resultado)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  async function handleReenviar() {
    setError('')
    setReenviando(true)
    try {
      await reenviarVerificacion(registrado.email)
      setReenviado(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setReenviando(false)
    }
  }

  if (registrado) {
    return (
      <div className="login-page">
        <p className="login-page__eyebrow">Registro de comercio</p>
        <div className="login-card">
          <h1 className="login-card__title">¡Gracias por registrarte!</h1>
          <p className="login-card__subtitle">Falta un paso: confirmar tu email</p>

          {error && (
            <p className="login-card__error" role="alert">
              {error}
            </p>
          )}
          {reenviado && (
            <p className="login-card__ok" role="status">
              Te mandamos el email de nuevo.
            </p>
          )}

          {registrado.email_enviado ? (
            <p className="login-card__texto">
              Te mandamos un email a <strong>{registrado.email}</strong> con un link para confirmar tu cuenta.
              Tocalo para empezar a usar Bipeo. Si no lo ves, revisá la carpeta de spam.
            </p>
          ) : (
            <p className="login-card__texto">
              Creamos tu cuenta, pero no pudimos mandar el email a <strong>{registrado.email}</strong>. Probá
              reenviarlo en unos minutos.
            </p>
          )}

          <p className="login-card__footer">
            ¿No te llegó?{' '}
            <button className="login-card__boton-link" onClick={handleReenviar} disabled={reenviando}>
              {reenviando ? 'Reenviando...' : 'Reenviar email'}
            </button>
          </p>
          <p className="login-card__footer">
            <Link className="login-card__link" to="/login">
              Volver al login
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="registro-page">
      <p className="registro-page__eyebrow">Registro de comercio</p>

      <div className="registro-card">
        <PageHeader title="Crear tu comercio" backTo="/login" />

        {error && (
          <p className="registro-card__error" role="alert">
            {error}
          </p>
        )}

        <form className="registro-form" onSubmit={handleSubmit}>
          <label className="registro-form__field">
            <span className="registro-form__label">Nombre del comercio</span>
            <input
              className="registro-form__input"
              placeholder="Kiosco Don Mario"
              value={nombreComercio}
              onChange={(event) => setNombreComercio(event.target.value)}
              required
            />
          </label>

          <label className="registro-form__field">
            <span className="registro-form__label">Tu nombre</span>
            <input
              className="registro-form__input"
              placeholder="Juan Pérez"
              value={nombreAdmin}
              onChange={(event) => setNombreAdmin(event.target.value)}
              required
            />
          </label>

          <label className="registro-form__field">
            <span className="registro-form__label">Email</span>
            <input
              className="registro-form__input"
              type="email"
              placeholder="dueño@comercio.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="registro-form__field">
            <span className="registro-form__label">Contraseña</span>
            <input
              className="registro-form__input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label className="registro-form__field">
            <span className="registro-form__label">Repetir contraseña</span>
            <input
              className="registro-form__input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>

          <button className="registro-form__submit" type="submit" disabled={cargando}>
            {cargando ? 'Creando...' : 'Crear comercio'}
          </button>
        </form>
      </div>
    </div>
  )
}
