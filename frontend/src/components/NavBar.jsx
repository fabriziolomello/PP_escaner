import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  MenuIcon,
  HomeIcon,
  BoxIcon,
  PeopleIcon,
  LogoutIcon,
  ReceiptIcon,
  SwapIcon,
  CashIcon,
} from './icons'
import './NavBar.css'

// Solo se renderiza dentro de ProtectedRoute (ver routes/ProtectedRoute.jsx),
// así que usuario nunca es null acá. El botón hamburguesa abre el panel
// como overlay; el mockup del menú es una pantalla propia, así que no
// ocupa espacio fijo en el resto de las páginas.
export default function NavBar() {
  const { usuario, logout } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const esAdmin = usuario.rol === 'admin'

  function cerrar() {
    setAbierto(false)
  }

  function cerrarSesion() {
    logout()
    navigate('/login')
  }

  function esActiva(ruta) {
    return ruta === '/' ? location.pathname === '/' : location.pathname.startsWith(ruta)
  }

  const iniciales = (usuario.comercio_nombre || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join('')

  return (
    <>
      <button className="navbar-trigger" onClick={() => setAbierto(true)} aria-label="Abrir menú">
        <MenuIcon />
      </button>

      {abierto && <div className="navbar-backdrop" onClick={cerrar} />}

      <aside className={`navbar-drawer${abierto ? ' navbar-drawer--open' : ''}`}>
        <div className="navbar-profile">
          <span className="navbar-profile__avatar">{iniciales}</span>
          <div className="navbar-profile__info">
            <p className="navbar-profile__nombre">{usuario.comercio_nombre}</p>
            <p className="navbar-profile__rol">{esAdmin ? 'Admin' : 'Empleado'}</p>
          </div>
        </div>

        <nav className="navbar-links">
          <Link
            className={`navbar-link${esActiva('/') ? ' navbar-link--active' : ''}`}
            to="/"
            onClick={cerrar}
          >
            <HomeIcon />
            Inicio
          </Link>
          <Link
            className={`navbar-link${esActiva('/ventas') ? ' navbar-link--active' : ''}`}
            to="/ventas"
            onClick={cerrar}
          >
            <ReceiptIcon />
            Ventas
          </Link>
          <Link
            className={`navbar-link${esActiva('/stock') ? ' navbar-link--active' : ''}`}
            to="/stock"
            onClick={cerrar}
          >
            <SwapIcon />
            Ingreso/Egreso
          </Link>
          <Link
            className={`navbar-link${esActiva('/caja') ? ' navbar-link--active' : ''}`}
            to="/caja"
            onClick={cerrar}
          >
            <CashIcon />
            Caja
          </Link>

          {esAdmin && (
            <>
              <p className="navbar-section-label">Solo admin</p>
              <Link
                className={`navbar-link${esActiva('/catalogo') ? ' navbar-link--active' : ''}`}
                to="/catalogo"
                onClick={cerrar}
              >
                <BoxIcon />
                Catálogo
              </Link>
              <Link
                className={`navbar-link${esActiva('/empleados') ? ' navbar-link--active' : ''}`}
                to="/empleados"
                onClick={cerrar}
              >
                <PeopleIcon />
                Empleados
              </Link>
            </>
          )}
        </nav>

        <button className="navbar-logout" onClick={cerrarSesion}>
          <LogoutIcon />
          Cerrar sesión
        </button>
      </aside>
    </>
  )
}
