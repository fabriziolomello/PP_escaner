import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSuscripcion } from '../context/SuscripcionContext'
import { ScanIcon, SearchIcon, BoxIcon, PeopleIcon } from '../components/icons'
import './Dashboard.css'

// Solo se renderiza dentro de <ProtectedRoute>, así que para cuando
// llegamos acá ya sabemos que hay una sesión activa (usuario no es null).
// La navegación (Escanear, Buscar, y los accesos admin) vive en el
// NavBar, que ProtectedRoute ya agrega en todas las páginas privadas.
export default function Dashboard() {
  const { usuario } = useAuth()
  const { suscripcion } = useSuscripcion()
  const esAdmin = usuario.rol === 'admin'

  return (
    <div className="dashboard-page">
      <p className="dashboard-page__eyebrow">Home</p>

      <div className="dashboard-card">
        <p className="dashboard-card__saludo">Hola,</p>
        <h1 className="dashboard-card__comercio">{usuario.comercio_nombre}</h1>

        <AvisoSuscripcion suscripcion={suscripcion} esAdmin={esAdmin} />

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

// Aviso desde 3 días antes de que venza y durante el día de gracia
// (ver DIAS_AVISO / DIAS_GRACIA en suscripcion.controller.js).
function AvisoSuscripcion({ suscripcion, esAdmin }) {
  if (!suscripcion || !['por_vencer', 'gracia'].includes(suscripcion.estado)) {
    return null
  }

  const que = suscripcion.en_prueba ? 'Tu prueba gratis' : 'Tu suscripción'
  const dias = suscripcion.dias_restantes
  const texto =
    suscripcion.estado === 'gracia'
      ? `${que} venció. Pagá hoy para no perder el acceso.`
      : `${que} vence en ${dias} ${dias === 1 ? 'día' : 'días'}.`

  return (
    <div className={`dashboard-aviso dashboard-aviso--${suscripcion.estado}`} role="status">
      <p className="dashboard-aviso__texto">{texto}</p>
      {esAdmin ? (
        <Link className="dashboard-aviso__link" to="/suscripcion">
          Pagar ahora
        </Link>
      ) : (
        <p className="dashboard-aviso__texto">Avisale al administrador del comercio.</p>
      )}
    </div>
  )
}
