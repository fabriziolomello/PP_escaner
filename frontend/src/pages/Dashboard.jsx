import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ScanIcon, SearchIcon, BoxIcon, PeopleIcon } from '../components/icons'
import './Dashboard.css'

// Solo se renderiza dentro de <ProtectedRoute>, así que para cuando
// llegamos acá ya sabemos que hay una sesión activa (usuario no es null).
// La navegación (Escanear, Buscar, y los accesos admin) vive en el
// NavBar, que ProtectedRoute ya agrega en todas las páginas privadas.
export default function Dashboard() {
  const { usuario } = useAuth()
  const esAdmin = usuario.rol === 'admin'

  return (
    <div className="dashboard-page">
      <p className="dashboard-page__eyebrow">Home</p>

      <div className="dashboard-card">
        <p className="dashboard-card__saludo">Hola,</p>
        <h1 className="dashboard-card__comercio">{usuario.comercio_nombre}</h1>

        <Link className="dashboard-action dashboard-action--primary" to="/escanear">
          <ScanIcon />
          Escanear producto
        </Link>

        <Link className="dashboard-action dashboard-action--secondary" to="/productos">
          <SearchIcon />
          Buscar por nombre
        </Link>

        {esAdmin && (
          <>
            <p className="dashboard-card__section-label">Solo admin</p>

            <Link className="dashboard-link" to="/catalogo">
              <BoxIcon />
              Catálogo de productos
            </Link>

            <Link className="dashboard-link" to="/empleados">
              <PeopleIcon />
              Empleados
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
