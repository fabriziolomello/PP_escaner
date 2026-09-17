import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registrarComercio } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import './Registro.css'

export default function Registro() {
  const [nombreComercio, setNombreComercio] = useState('')
  const [nombreAdmin, setNombreAdmin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setCargando(true)
    try {
      const { token, usuario } = await registrarComercio({
        nombreComercio,
        nombreAdmin,
        email,
        password,
      })
      login(token, usuario)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
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
