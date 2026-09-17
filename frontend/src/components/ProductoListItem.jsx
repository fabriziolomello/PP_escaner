import { Link } from 'react-router-dom'
import { ImagePlaceholderIcon, ChevronRightIcon } from './icons'
import './ProductoListItem.css'

export default function ProductoListItem({ producto, mostrarCodigo = false }) {
  return (
    <Link className="producto-list-item" to={`/productos/${producto.id}`}>
      <span className="producto-list-item__imagen">
        {producto.foto_url ? <img src={producto.foto_url} alt="" /> : <ImagePlaceholderIcon />}
      </span>

      <span className="producto-list-item__info">
        <span className="producto-list-item__nombre">{producto.nombre}</span>
        <span className="producto-list-item__precio">
          ${producto.precio}
          {mostrarCodigo && producto.codigo_barras && ` · ${producto.codigo_barras.slice(0, 6)}...`}
        </span>
      </span>

      <ChevronRightIcon className="producto-list-item__chevron" />
    </Link>
  )
}
