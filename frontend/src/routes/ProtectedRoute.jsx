import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSuscripcion } from '../context/SuscripcionContext'
import NavBar from '../components/NavBar'
import Carrito from '../components/Carrito'

// Envuelve una página privada. Sin sesión -> redirige a /login.
// Con rolesPermitidos definido, además exige que el rol del usuario
// esté en esa lista (ej. rolesPermitidos={['admin']} para rutas admin-only).
// De paso, agrega el NavBar: así todas las páginas protegidas lo heredan
// sin tener que importarlo una por una. Lo mismo con el carrito flotante.
// Con la suscripción vencida, la única página accesible es /suscripcion
// (permitirVencida), y sin menú ni carrito porque no llevan a ningún lado.
export default function ProtectedRoute({ children, rolesPermitidos, permitirVencida }) {
  const { usuario } = useAuth()
  const { suscripcion } = useSuscripcion()
  const vencida = suscripcion?.estado === 'vencida'

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/" replace />
  }

  if (vencida) {
    return permitirVencida ? children : <Navigate to="/suscripcion" replace />
  }

  return (
    <>
      <NavBar />
      {children}
      <div className="carrito-espaciador" />
      <Carrito />
    </>
  )
}
