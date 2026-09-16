import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NavBar from '../components/NavBar'

// Envuelve una página privada. Sin sesión -> redirige a /login.
// Con rolesPermitidos definido, además exige que el rol del usuario
// esté en esa lista (ej. rolesPermitidos={['admin']} para rutas admin-only).
// De paso, agrega el NavBar: así todas las páginas protegidas lo heredan
// sin tener que importarlo una por una.
export default function ProtectedRoute({ children, rolesPermitidos }) {
  const { usuario } = useAuth()

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <NavBar />
      {children}
    </>
  )
}
