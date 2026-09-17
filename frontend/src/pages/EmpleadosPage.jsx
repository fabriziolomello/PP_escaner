import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { PlusIcon, MoreIcon } from '../components/icons'
import { listar } from '../api/empleados'
import './EmpleadosPage.css'

function iniciales(nombre) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join('')
}

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listar()
      .then(setEmpleados)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className="empleados-page">
      <div className="empleados-card">
        <PageHeader title="Empleados" backTo="/" />

        <Link className="empleados-nuevo-boton" to="/empleados/nuevo">
          <PlusIcon />
          Nuevo empleado
        </Link>

        {error && (
          <p className="empleados-card__error" role="alert">
            {error}
          </p>
        )}

        {cargando && <p className="empleados-card__estado">Cargando...</p>}

        {!cargando && !error && (
          <p className="empleados-card__contador">
            {empleados.length} empleado{empleados.length === 1 ? '' : 's'}
          </p>
        )}

        <div className="empleados-lista">
          {empleados.map((empleado) => (
            <div className="empleado-item" key={empleado.id}>
              <span className="empleado-item__avatar">{iniciales(empleado.nombre)}</span>
              <span className="empleado-item__info">
                <span className="empleado-item__nombre">{empleado.nombre}</span>
                <span className="empleado-item__email">{empleado.email}</span>
              </span>
              <span className="empleado-item__mas" aria-hidden="true">
                <MoreIcon />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
