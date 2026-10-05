import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCarrito } from '../context/CarritoContext'
import { crear } from '../api/ventas'
import { abrir as abrirCaja } from '../api/caja'
import { METODOS_PAGO, formatearPrecio } from '../utils/formato'
import { CartIcon, CloseIcon, MinusIcon, PlusIcon, ImagePlaceholderIcon } from './icons'
import './Carrito.css'

// Botón flotante + panel de la venta en curso. Igual que el NavBar, lo
// agrega ProtectedRoute en todas las páginas privadas: "Vender" no es un
// ítem del menú, se vende desde donde se esté agregando productos.
export default function Carrito() {
  const { items, cambiarCantidad, vaciar, cantidadTotal, total } = useCarrito()
  const [abierto, setAbierto] = useState(false)
  const [metodoPago, setMetodoPago] = useState('')
  const [vendiendo, setVendiendo] = useState(false)
  const [error, setError] = useState('')
  const [ventaRegistrada, setVentaRegistrada] = useState(null)
  // Se activa cuando el backend rechaza la venta porque no hay caja abierta.
  const [pideCaja, setPideCaja] = useState(false)
  const [montoInicial, setMontoInicial] = useState('')

  function abrir() {
    setError('')
    setPideCaja(false)
    setVentaRegistrada(null)
    setAbierto(true)
  }

  function cerrar() {
    setAbierto(false)
  }

  async function vender() {
    setError('')
    setVendiendo(true)
    try {
      const venta = await crear({
        items: items.map((item) => ({ producto_id: item.producto_id, cantidad: item.cantidad })),
        metodoPago,
      })
      vaciar()
      setMetodoPago('')
      setVentaRegistrada(venta)
    } catch (err) {
      if (err.codigo === 'CAJA_CERRADA') {
        setPideCaja(true)
      } else {
        setError(err.message)
      }
    } finally {
      setVendiendo(false)
    }
  }

  // Abre la caja sin salir del carrito y sigue con la venta que quedó pendiente.
  async function abrirCajaYVender() {
    setError('')
    setVendiendo(true)
    try {
      await abrirCaja(Number(montoInicial))
      setPideCaja(false)
      setMontoInicial('')
    } catch (err) {
      setError(err.message)
      setVendiendo(false)
      return
    }
    await vender()
  }

  return (
    <>
      <button className="carrito-boton" onClick={abrir} aria-label="Abrir carrito">
        <CartIcon />
        {cantidadTotal > 0 && <span className="carrito-boton__badge">{cantidadTotal}</span>}
      </button>

      {abierto && <div className="carrito-backdrop" onClick={cerrar} />}

      <aside className={`carrito-panel${abierto ? ' carrito-panel--open' : ''}`}>
        <div className="carrito-panel__header">
          <h2 className="carrito-panel__titulo">Venta actual</h2>
          <button className="carrito-panel__cerrar" onClick={cerrar} aria-label="Cerrar carrito">
            <CloseIcon />
          </button>
        </div>

        {ventaRegistrada && (
          <div className="carrito-exito" role="status">
            <p className="carrito-exito__titulo">Venta registrada</p>
            <p className="carrito-exito__total">{formatearPrecio(ventaRegistrada.total)}</p>
            <Link className="carrito-exito__link" to="/ventas" onClick={cerrar}>
              Ver historial de ventas
            </Link>
          </div>
        )}

        {!ventaRegistrada && items.length === 0 && (
          <p className="carrito-panel__vacio">
            El carrito está vacío. Escaneá o buscá un producto y tocá "Agregar al carrito".
          </p>
        )}

        {items.length > 0 && (
          <>
            <div className="carrito-items">
              {items.map((item) => (
                <div className="carrito-item" key={item.producto_id}>
                  <span className="carrito-item__imagen">
                    {item.foto_url ? <img src={item.foto_url} alt="" /> : <ImagePlaceholderIcon />}
                  </span>

                  <span className="carrito-item__info">
                    <span className="carrito-item__nombre">{item.nombre}</span>
                    <span className="carrito-item__precio">
                      {formatearPrecio(item.precio * item.cantidad)}
                    </span>
                    {item.cantidad > item.stock && (
                      <span className="carrito-item__aviso">Supera el stock registrado ({item.stock})</span>
                    )}
                  </span>

                  <span className="carrito-item__cantidad">
                    <button
                      onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}
                      aria-label={item.cantidad === 1 ? 'Quitar del carrito' : 'Restar uno'}
                    >
                      <MinusIcon width="14" height="14" />
                    </button>
                    <span>{item.cantidad}</span>
                    <button
                      onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}
                      aria-label="Sumar uno"
                    >
                      <PlusIcon width="14" height="14" />
                    </button>
                  </span>
                </div>
              ))}
            </div>

            <div className="carrito-total">
              <span>Total</span>
              <span className="carrito-total__monto">{formatearPrecio(total)}</span>
            </div>

            <p className="carrito-panel__label">Elegir medio de pago</p>
            <div className="carrito-metodos">
              {METODOS_PAGO.map((metodo) => (
                <button
                  key={metodo.valor}
                  className={`carrito-metodo${metodoPago === metodo.valor ? ' carrito-metodo--activo' : ''}`}
                  onClick={() => setMetodoPago(metodo.valor)}
                >
                  {metodo.etiqueta}
                </button>
              ))}
            </div>

            {error && (
              <p className="carrito-panel__error" role="alert">
                {error}
              </p>
            )}

            {pideCaja ? (
              <div className="carrito-caja">
                <p className="carrito-caja__titulo">Primero abrí la caja</p>
                <label className="carrito-caja__field">
                  <span>Efectivo inicial en el cajón</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={montoInicial}
                    onChange={(event) => setMontoInicial(event.target.value)}
                  />
                </label>
                <button
                  className="carrito-vender"
                  onClick={abrirCajaYVender}
                  disabled={montoInicial === '' || vendiendo}
                >
                  {vendiendo ? 'Abriendo...' : 'Abrir caja y vender'}
                </button>
              </div>
            ) : (
              <button className="carrito-vender" onClick={vender} disabled={!metodoPago || vendiendo}>
                {vendiendo ? 'Registrando...' : `Vender ${formatearPrecio(total)}`}
              </button>
            )}
          </>
        )}
      </aside>
    </>
  )
}
