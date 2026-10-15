import { useState } from 'react'
import { Link } from 'react-router-dom'
import { recuperarPassword } from '../api/auth'
import PageHeader from '../components/PageHeader'
import './Login.css'

// Pide el link para elegir una contraseña nueva. Solo les llega a los
// admins; el mensaje es el mismo exista o no la cuenta.
export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setCargando(true)
    try {
      await recuperarPassword(email)
      setEnviado(true)
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
        <PageHeader title="Recuperar contraseña" backTo="/login" />

        {error && (
          <p className="login-card__error" role="alert">
            {error}
          </p>
        )}

        {enviado ? (
          <>
            <p className="login-card__ok" role="status">
              Si <strong>{email}</strong> es la cuenta de un administrador, te mandamos un email con un link para
              elegir una contraseña nueva. Vence en 1 hora.
            </p>
            <p className="login-card__texto">Si no lo ves, revisá la carpeta de spam.</p>
            <p className="login-card__footer">
              <Link className="login-card__link" to="/login">
                Volver al login
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="login-card__texto">
              Escribí el email de tu cuenta y te mandamos un link para elegir una contraseña nueva. Si sos empleado,
              pedile la contraseña nueva al administrador del comercio.
            </p>
            <form className="login-form" onSubmit={handleSubmit}>
              <label className="login-form__field">
                <span className="login-form__label">Email</span>
                <input
                  className="login-form__input"
                  type="email"
                  placeholder="usuario@comercio.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <button className="login-form__submit" type="submit" disabled={cargando}>
                {cargando ? 'Enviando...' : 'Mandarme el link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
