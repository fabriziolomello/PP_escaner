import { useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { ChevronRightIcon } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { listar, anular } from '../api/ventas'
import { METODOS_PAGO, etiquetaMetodoPago, formatearPrecio, formatearFechaHora } from '../utils/formato'
import './VentasPage.css'

// Fecha local en el formato de <input type="date"> (YYYY-MM-DD).
function fechaInput(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

// "Hasta" es inclusivo en pantalla; al backend va el inicio del día siguiente.
function rangoFiltro(desde, hasta) {
  const inicio = desde ? new Date(`${desde}T00:00`) : undefined
  let fin
  if (hasta) {
    fin = new Date(`${hasta}T00:00`)
    fin.setDate(fin.getDate() + 1)
  }
  return { desde: inicio, hasta: fin }
}

// Historial de ventas: hace también de "dashboard" con el resumen del
// período filtrado (por defecto, hoy). La lista trae hasta 100 ventas con
// sus items; el resumen lo calcula el backend sobre todo el filtro.
export default function VentasPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario.rol === 'admin'
  const hoy = fechaInput(new Date())
  const [desde, setDesde] = useState(hoy)
  const [hasta, setHasta] = useState(hoy)
  const [metodoPago, setMetodoPago] = useState('')
  const [ventas, setVentas] = useState([])
  const [resumen, setResumen] = useState(null)
  const [limitado, setLimitado] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [abiertaId, setAbiertaId] = useState(null)
  const [anulandoId, setAnulandoId] = useState(null)

  const rangoInvalido = Boolean(desde && hasta && desde > hasta)
  const ultimoPedido = useRef(0)

  async function cargar() {
    // Si se cambian los filtros rápido, solo cuenta la respuesta del último pedido.
    const pedido = ++ultimoPedido.current
    setError('')
    setCargando(true)
    try {
      const respuesta = await listar({ ...rangoFiltro(desde, hasta), metodoPago })
      if (pedido !== ultimoPedido.current) return
      setVentas(respuesta.ventas)
      setResumen(respuesta.resumen)
      setLimitado(Boolean(respuesta.limitado))
    } catch (err) {
      if (pedido === ultimoPedido.current) setError(err.message)
    } finally {
      if (pedido === ultimoPedido.current) setCargando(false)
    }
  }

  useEffect(() => {
    if (rangoInvalido) return
    cargar()
  }, [desde, hasta, metodoPago])

  async function handleAnular(venta) {
    if (!window.confirm(`¿Anular la venta de ${formatearPrecio(venta.total)}? Los productos vuelven al stock.`)) {
      return
    }
    setError('')
    setAnulandoId(venta.id)
    try {
      await anular(venta.id)
      // Se recarga para que el resumen deje de contar la venta anulada.
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setAnulandoId(null)
    }
  }

  const soloHoy = desde === hoy && hasta === hoy
  const totalesPorMetodo = METODOS_PAGO.map((metodo) => ({
    ...metodo,
    total: resumen?.[metodo.valor] || 0,
  }))
  const cantidadVentas = resumen?.cantidad || 0

  return (
    <div className="ventas-page">
      <p className="ventas-page__eyebrow">Historial de ventas</p>

      <div className="ventas-card">
        <PageHeader title="Ventas" backTo="/" />

        <div className="ventas-filtros">
          <div className="ventas-filtros__fechas">
            <label className="ventas-filtros__field">
              <span className="ventas-filtros__label">Desde</span>
              <input
                className="ventas-filtros__input"
                type="date"
                value={desde}
                max={hasta || undefined}
                onChange={(event) => setDesde(event.target.value)}
              />
            </label>
            <label className="ventas-filtros__field">
              <span className="ventas-filtros__label">Hasta</span>
              <input
                className="ventas-filtros__input"
                type="date"
                value={hasta}
                min={desde || undefined}
                onChange={(event) => setHasta(event.target.value)}
              />
            </label>
          </div>
          <div className="ventas-filtros__metodos">
            {[{ valor: '', etiqueta: 'Todos' }, ...METODOS_PAGO].map((metodo) => (
              <button
                key={metodo.valor}
                type="button"
                className={`ventas-filtros__metodo${metodoPago === metodo.valor ? ' ventas-filtros__metodo--activo' : ''}`}
                onClick={() => setMetodoPago(metodo.valor)}
              >
                {metodo.etiqueta}
              </button>
            ))}
          </div>
          {!soloHoy && (
            <button
              type="button"
              className="ventas-filtros__hoy"
              onClick={() => {
                setDesde(hoy)
                setHasta(hoy)
              }}
            >
              Volver a hoy
            </button>
          )}
        </div>

        {rangoInvalido && (
          <p className="ventas-card__error" role="alert">
            La fecha "desde" no puede ser posterior a "hasta".
          </p>
        )}

        <div className="ventas-resumen">
          <p className="ventas-resumen__label">{soloHoy ? 'Vendido hoy' : 'Vendido en el período'}</p>
          <p className="ventas-resumen__total">{formatearPrecio(resumen?.total || 0)}</p>
          <p className="ventas-resumen__cantidad">
            {cantidadVentas} venta{cantidadVentas === 1 ? '' : 's'}
          </p>
          <div className="ventas-resumen__metodos">
            {totalesPorMetodo.map((metodo) => (
              <span key={metodo.valor} className="ventas-resumen__metodo">
                <span>{metodo.etiqueta}</span>
                <strong>{formatearPrecio(metodo.total)}</strong>
              </span>
            ))}
          </div>
        </div>

        {error && (
          <p className="ventas-card__error" role="alert">
            {error}
          </p>
        )}

        {cargando && <p className="ventas-card__estado">Cargando...</p>}

        {!cargando && !error && ventas.length === 0 && (
          <p className="ventas-card__estado">No hay ventas para este filtro.</p>
        )}

        {!cargando && limitado && (
          <p className="ventas-card__estado">
            Se muestran las últimas {ventas.length} ventas. Achicá el rango de fechas para ver las anteriores.
          </p>
        )}

        <div className="ventas-lista">
          {ventas.map((venta) => {
            const abierta = abiertaId === venta.id
            return (
              <div className={`venta-item${venta.anulada ? ' venta-item--anulada' : ''}`} key={venta.id}>
                <button
                  className="venta-item__resumen"
                  onClick={() => setAbiertaId(abierta ? null : venta.id)}
                  aria-expanded={abierta}
                >
                  <span className="venta-item__info">
                    <span className="venta-item__total">{formatearPrecio(venta.total)}</span>
                    <span className="venta-item__detalle">
                      {formatearFechaHora(venta.creado_en)} · {etiquetaMetodoPago(venta.metodo_pago)}
                      {venta.anulada && ' · Anulada'}
                    </span>
                  </span>
                  <ChevronRightIcon
                    className={`venta-item__chevron${abierta ? ' venta-item__chevron--abierto' : ''}`}
                  />
                </button>

                {abierta && (
                  <div className="venta-item__items">
                    {venta.items.map((item) => (
                      <p className="venta-item__linea" key={item.producto_id}>
                        <span>
                          {item.cantidad} × {item.nombre}
                        </span>
                        <span>{formatearPrecio(item.subtotal)}</span>
                      </p>
                    ))}
                    <p className="venta-item__vendedor">Vendió: {venta.usuario_nombre}</p>

                    {esAdmin && !venta.anulada && venta.caja_estado !== 'cerrada' && (
                      <button
                        className="venta-item__anular"
                        onClick={() => handleAnular(venta)}
                        disabled={anulandoId === venta.id}
                      >
                        {anulandoId === venta.id ? 'Anulando...' : 'Anular venta'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
