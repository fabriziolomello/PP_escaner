import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registrarComercio } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function Registro() {
  const [nombreComercio, setNombreComercio] = useState('')
  const [nombreAdmin, setNombreAdmin] = useState('')
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
    <form onSubmit={handleSubmit}>
      <h1>Registrar comercio</h1>

      {error && <p role="alert">{error}</p>}

      <label>
        Nombre del comercio
        <input
          value={nombreComercio}
          onChange={(event) => setNombreComercio(event.target.value)}
          required
        />
      </label>

      <label>
        Tu nombre (admin)
        <input
          value={nombreAdmin}
          onChange={(event) => setNombreAdmin(event.target.value)}
          required
        />
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

      <button type="submit" disabled={cargando}>
        {cargando ? 'Creando...' : 'Crear comercio'}
      </button>

      <p>
        ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
      </p>
    </form>
  )
}
