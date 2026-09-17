import { Link } from 'react-router-dom'
import './PageHeader.css'

// Header "← Título" que se repite en la mayoría de las páginas internas
// (Registro, Escanear, Buscar producto, Resultados, alta de producto/empleado, etc).
export default function PageHeader({ title, backTo }) {
  return (
    <div className="page-header">
      <Link className="page-header__back" to={backTo} aria-label="Volver">
        ←
      </Link>
      <h1 className="page-header__title">{title}</h1>
    </div>
  )
}
