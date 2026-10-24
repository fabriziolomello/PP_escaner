import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCarrito } from '../context/CarritoContext'
import { crear } from '../api/ventas'
import { abrir as abrirCaja } from '../api/caja'
import { METODOS_PAGO, formatearPrecio } from '../utils/formato'
import TicketAcciones from './TicketAcciones'
import { CartIcon, CloseIcon, MinusIcon, PlusIcon, ImagePlaceholderIcon } from './icons'
import './Carrito.css'

// Los inputs de precio y descuento guardan el texto tal cual se escribe
// ("12," o "" a mitad de escribir) y le pasan al carrito el número.
function aNumero(texto) {
  return Number(texto) || 0
}

// Una línea del carrito. "Editar" despliega el precio unitario y el
// descuento (%) de ese producto.
function CarritoItem({ item }) {
  const { cambiarCantidad, cambiarPrecio, cambiarDescuentoItem, subtotalItem } = useCarrito()
  const [editando, setEditando] = useState(false)
  const [precio, setPrecio] = useState('')
  const [descuento, setDescuento] = useState('')

  const precioCambiado = item.precio !== item.precio_lista
  const modificado = precioCambiado || item.descuento > 0

  function alternarEditor() {
    setPrecio(String(item.precio))
    setDescuento(item.descuento ? String(item.descuento) : '')
    setEditando(!editando)
  }

  function restaurarPrecio() {
    setPrecio(String(item.precio_lista))
    cambiarPrecio(item.producto_id, item.precio_lista)
  }

  return (
    <div className="carrito-item">
      <div className="carrito-item__fila">
        <span className="carrito-item__imagen">
          {item.foto_url ? <img src={item.foto_url} alt="" /> : <ImagePlaceholderIcon />}
        </span>

        <span className="carrito-item__info">
          <span className="carrito-item__nombre">{item.nombre}</span>
          <span className="carrito-item__precio">{formatearPrecio(subtotalItem(item))}</span>
          {modificado && (
            <span className="carrito-item__modificado">
              {item.cantidad} × {formatearPrecio(item.precio)}
              {item.descuento > 0 && ` · −${item.descuento}%`}
            </span>
          )}
          {item.cantidad > item.stock && (
            <span className="carrito-item__aviso">
              {item.stock > 0 ? `Solo hay ${item.stock} en stock` : 'Sin stock: sacalo del carrito'}
            </span>
          )}
          {!(item.precio > 0) && <span className="carrito-item__aviso">Poné un precio mayor a 0</span>}
          <button className="carrito-link" onClick={alternarEditor} aria-expanded={editando}>
            {editando ? 'Listo' : 'Editar precio o descuento'}
          </button>
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
            disabled={item.cantidad >= item.stock}
            aria-label="Sumar uno"
          >
            <PlusIcon width="14" height="14" />
          </button>
        </span>
      </div>

      {editando && (
        <div className="carrito-item__editor">
          <label className="carrito-campo">
            <span>Precio unitario</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={precio}
              onChange={(event) => {
                setPrecio(event.target.value)
                cambiarPrecio(item.producto_id, aNumero(event.target.value))
              }}
            />
          </label>
          <label className="carrito-campo">
            <span>Descuento %</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
              placeholder="0"
              value={descuento}
              onChange={(event) => {
                setDescuento(event.target.value)
                cambiarDescuentoItem(item.producto_id, aNumero(event.target.value))
              }}
            />
          </label>
          {precioCambiado && (
            <button className="carrito-link carrito-item__restaurar" onClick={restaurarPrecio}>
              Volver al precio de lista ({formatearPrecio(item.precio_lista)})
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Descuento a toda la venta, por porcentaje o por monto fijo.
function DescuentoVenta() {
  const { descuento, setDescuento, descuentoExcedido } = useCarrito()
  const [valor, setValor] = useState(descuento.valor ? String(descuento.valor) : '')

  function elegirTipo(tipo) {
    setValor('')
    setDescuento({ tipo, valor: 0 })
  }

  return (
    <div className="carrito-descuento">
      <p className="carrito-panel__label">Descuento a la venta</p>
      <div className="carrito-descuento__control">
        <div className="carrito-descuento__tipos">
          {[
            { tipo: 'porcentaje', etiqueta: '%' },
            { tipo: 'monto', etiqueta: '$' },
          ].map((opcion) => (
            <button
              key={opcion.tipo}
              className={`carrito-descuento__tipo${descuento.tipo === opcion.tipo ? ' carrito-descuento__tipo--activo' : ''}`}
              onClick={() => elegirTipo(opcion.tipo)}
              aria-label={opcion.tipo === 'porcentaje' ? 'Descuento en porcentaje' : 'Descuento en pesos'}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max={descuento.tipo === 'porcentaje' ? '100' : undefined}
          step={descuento.tipo === 'porcentaje' ? '1' : '0.01'}
          placeholder="0"
          value={valor}
          onChange={(event) => {
            const numero = Math.max(aNumero(event.target.value), 0)
            setValor(event.target.value)
            setDescuento({
              tipo: descuento.tipo,
              valor: Math.round((descuento.tipo === 'porcentaje' ? Math.min(numero, 100) : numero) * 100) / 100,
            })
          }}
          aria-label="Descuento a la venta"
        />
      </div>
      {descuentoExcedido && <p className="carrito-item__aviso">El descuento no puede superar el total</p>}
    </div>
  )
}

// Botón flotante + panel de la venta en curso. Igual que el NavBar, lo
// agrega ProtectedRoute en todas las páginas privadas: "Vender" no es un
// ítem del menú, se vende desde donde se esté agregando productos.
export default function Carrito() {
  const {
    items,
    actualizarStock,
    vaciar,
    descuento,
    cantidadTotal,
    subtotal,
    descuentoMonto,
    descuentoExcedido,
    total,
  } = useCarrito()
  const [abierto, setAbierto] = useState(false)
  const [metodoPago, setMetodoPago] = useState('')
  const [vendiendo, setVendiendo] = useState(false)
  const [error, setError] = useState('')
  const [ventaRegistrada, setVentaRegistrada] = useState(null)
  // Se activa cuando el backend rechaza la venta porque no hay caja abierta.
  const [pideCaja, setPideCaja] = useState(false)
  const [montoInicial, setMontoInicial] = useState('')

  const precioInvalido = items.some((item) => !(item.precio > 0))

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
        items: items.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          // Solo si se cambió: si no, el backend usa el precio del catálogo.
          ...(item.precio !== item.precio_lista && { precio_unitario: item.precio }),
          ...(item.descuento > 0 && { descuento_porcentaje: item.descuento }),
        })),
        descuento: descuento.valor > 0 ? descuento : null,
        metodoPago,
      })
      vaciar()
      setMetodoPago('')
      setVentaRegistrada(venta)
    } catch (err) {
      if (err.codigo === 'CAJA_CERRADA') {
        setPideCaja(true)
      } else {
        if (err.codigo === 'SIN_STOCK') actualizarStock(err.productos)
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
            <TicketAcciones venta={ventaRegistrada} />
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
                <CarritoItem key={item.producto_id} item={item} />
              ))}
            </div>

            <DescuentoVenta />

            {descuentoMonto > 0 && (
              <div className="carrito-subtotales">
                <p>
                  <span>Subtotal</span>
                  <span>{formatearPrecio(subtotal)}</span>
                </p>
                <p>
                  <span>Descuento{descuento.tipo === 'porcentaje' && ` ${descuento.valor}%`}</span>
                  <span>−{formatearPrecio(descuentoMonto)}</span>
                </p>
              </div>
            )}

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
                  disabled={montoInicial === '' || vendiendo || precioInvalido || descuentoExcedido}
                >
                  {vendiendo ? 'Abriendo...' : 'Abrir caja y vender'}
                </button>
              </div>
            ) : (
              <button
                className="carrito-vender"
                onClick={vender}
                disabled={!metodoPago || vendiendo || precioInvalido || descuentoExcedido}
              >
                {vendiendo ? 'Registrando...' : `Vender ${formatearPrecio(total)}`}
              </button>
            )}
          </>
        )}
      </aside>
    </>
  )
}
