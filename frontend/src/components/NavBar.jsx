import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Solo se renderiza dentro de ProtectedRoute (ver routes/ProtectedRoute.jsx),
// así que usuario nunca es null acá.
export default function NavBar() {
  const { usuario, logout } = useAuth()
  const esAdmin = usuario.rol === 'admin'

  return (
    <nav>
      <Link to="/">Inicio</Link>
      {' | '}
      <Link to="/escanear">Escanear</Link>
      {' | '}
      <Link to="/productos">Buscar producto</Link>
      {esAdmin && (
        <>
          {' | '}
          <Link to="/productos/nuevo">Cargar producto</Link>
          {' | '}
          <Link to="/productos/importar">Importar CSV</Link>
          {' | '}
          <Link to="/empleados">Empleados</Link>
        </>
      )}
      {' — '}
      {usuario.nombre} ({usuario.rol}){' '}
      <button onClick={logout}>Cerrar sesión</button>
    </nav>
  )
}
