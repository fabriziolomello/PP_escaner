import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { verificarEmail } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { ScanIcon } from '../components/icons'
import './Login.css'

// Destino del link del email de bienvenida (?token=...). Si el token sirve,
// confirma el email y entra directo al sistema.
export default function VerificarEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [error, setError] = useState(token ? '' : 'El link no es válido. Revisá que esté completo.')
  const { login } = useAuth()
  const navigate = useNavigate()
  // El token es de un solo uso: evita mandarlo dos veces si el efecto se repite.
  const enviado = useRef(false)

  useEffect(() => {
    if (!token || enviado.current) return
    enviado.current = true
    verificarEmail(token)
      .then(({ token: jwt, usuario }) => {
        login(jwt, usuario)
        navigate('/', { replace: true })
      })
      .catch((err) => setError(err.message))
  }, [token, login, navigate])

  return (
    <div className="login-page">
      <p className="login-page__eyebrow">Confirmar email</p>
      <div className="login-card">
        <div className="login-card__icon">
          <ScanIcon width="26" height="26" />
        </div>

        {error ? (
          <>
            <h1 className="login-card__title">No pudimos confirmar tu email</h1>
            <p className="login-card__error" role="alert">
              {error}
            </p>
            <p className="login-card__texto">
              Si el link venció, ingresá con tu email y contraseña: vas a poder pedir que te lo mandemos de nuevo.
            </p>
          </>
        ) : (
          <h1 className="login-card__title">Confirmando tu email...</h1>
        )}

        <p className="login-card__footer">
          <Link className="login-card__link" to="/login">
            Ir al login
          </Link>
        </p>
      </div>
    </div>
  )
}
