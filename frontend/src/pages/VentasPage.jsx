import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { ChevronRightIcon } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { listar, anular } from '../api/ventas'
import { METODOS_PAGO, etiquetaMetodoPago, formatearPrecio, formatearFechaHora } from '../utils/formato'
import './VentasPage.css'

function esDeHoy(fecha) {
  return new Date(fecha).toDateString() === new Date().toDateString()
}

// Historial de ventas: hace también de "dashboard" con el resumen del día.
// El backend devuelve las últimas 100 ventas, cada una con sus items.
export default function VentasPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario.rol === 'admin'
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [abiertaId, setAbiertaId] = useState(null)
  const [anulandoId, setAnulandoId] = useState(null)

  useEffect(() => {
    listar()
      .then(setVentas)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  async function handleAnular(venta) {
    if (!window.confirm(`¿Anular la venta de ${formatearPrecio(venta.total)}? Los productos vuelven al stock.`)) {
      return
    }
    setError('')
    setAnulandoId(venta.id)
    try {
      await anular(venta.id)
      setVentas((actuales) =>
        actuales.map((actual) => (actual.id === venta.id ? { ...actual, anulada: true } : actual))
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setAnulandoId(null)
    }
  }

  const ventasDeHoy = ventas.filter((venta) => !venta.anulada && esDeHoy(venta.creado_en))
  const totalHoy = ventasDeHoy.reduce((suma, venta) => suma + Number(venta.total), 0)
  const totalesPorMetodo = METODOS_PAGO.map((metodo) => ({
    ...metodo,
    total: ventasDeHoy
      .filter((venta) => venta.metodo_pago === metodo.valor)
      .reduce((suma, venta) => suma + Number(venta.total), 0),
  }))

  return (
    <div className="ventas-page">
      <p className="ventas-page__eyebrow">Historial de ventas</p>

      <div className="ventas-card">
        <PageHeader title="Ventas" backTo="/" />

        <div className="ventas-resumen">
          <p className="ventas-resumen__label">Vendido hoy</p>
          <p className="ventas-resumen__total">{formatearPrecio(totalHoy)}</p>
          <p className="ventas-resumen__cantidad">
            {ventasDeHoy.length} venta{ventasDeHoy.length === 1 ? '' : 's'}
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
          <p className="ventas-card__estado">Todavía no hay ventas registradas.</p>
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

                    {esAdmin && !venta.anulada && (
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
