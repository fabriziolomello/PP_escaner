import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { ChevronRightIcon } from '../components/icons'
import {
  MOTIVOS_CAJA,
  obtenerActual,
  abrir,
  registrarMovimiento,
  cerrar,
  listarCerradas,
  obtenerPorId,
} from '../api/caja'
import { formatearPrecio, formatearFechaHora } from '../utils/formato'
import './CajaPage.css'

function claseDiferencia(diferencia) {
  const numero = Number(diferencia)
  if (numero === 0) return 'caja-diferencia--ok'
  return numero > 0 ? 'caja-diferencia--sobra' : 'caja-diferencia--falta'
}

function textoDiferencia(diferencia) {
  const numero = Number(diferencia)
  if (numero === 0) return 'Sin diferencia'
  return numero > 0 ? `Sobran ${formatearPrecio(numero)}` : `Faltan ${formatearPrecio(-numero)}`
}

// Cuentas de una caja ya cerrada: lo mismo que se ve al cerrar y en el
// detalle de los cierres anteriores.
function ResumenCierre({ caja }) {
  return (
    <div className="caja-filas">
      <p className="caja-fila">
        <span>Efectivo inicial</span>
        <span>{formatearPrecio(caja.monto_inicial)}</span>
      </p>
      <p className="caja-fila">
        <span>Ventas en efectivo</span>
        <span>{formatearPrecio(caja.ventas.efectivo)}</span>
      </p>
      {caja.ingresos > 0 && (
        <p className="caja-fila">
          <span>Ingresos</span>
          <span>+{formatearPrecio(caja.ingresos)}</span>
        </p>
      )}
      {caja.egresos > 0 && (
        <p className="caja-fila">
          <span>Retiros y pagos</span>
          <span>-{formatearPrecio(caja.egresos)}</span>
        </p>
      )}
      <p className="caja-fila">
        <span>Efectivo esperado</span>
        <span>{formatearPrecio(caja.efectivo_esperado)}</span>
      </p>
      <p className="caja-fila">
        <span>Efectivo contado</span>
        <span>{formatearPrecio(caja.monto_final_declarado)}</span>
      </p>
      <p className="caja-fila">
        <span>MercadoPago</span>
        <span>{formatearPrecio(caja.ventas.mercadopago)}</span>
      </p>
      <p className="caja-fila">
        <span>Tarjeta</span>
        <span>{formatearPrecio(caja.ventas.tarjeta)}</span>
      </p>
      <p className="caja-fila caja-fila--total">
        <span>
          Total vendido ({caja.ventas.cantidad} venta{caja.ventas.cantidad === 1 ? '' : 's'})
        </span>
        <span>{formatearPrecio(caja.ventas.total)}</span>
      </p>
    </div>
  )
}

function ListaMovimientos({ movimientos }) {
  return (
    <div className="caja-movimientos">
      {movimientos.map((movimiento) => (
        <p className="caja-movimiento" key={movimiento.id}>
          <span>
            {movimiento.motivo}
            <span className="caja-movimiento__detalle">
              {formatearFechaHora(movimiento.creado_en)} · {movimiento.usuario_nombre}
            </span>
          </span>
          <span className={`caja-movimiento__monto caja-movimiento__monto--${movimiento.tipo}`}>
            {movimiento.tipo === 'ingreso' ? '+' : '-'}
            {formatearPrecio(movimiento.monto)}
          </span>
        </p>
      ))}
    </div>
  )
}

// Una sola pantalla con dos estados: sin caja (abrir + últimos cierres) o
// con caja abierta (totales del turno, movimientos de efectivo y cierre).
export default function CajaPage() {
  const [caja, setCaja] = useState(null)
  const [cerradas, setCerradas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [ultimoCierre, setUltimoCierre] = useState(null)
  const [abiertaId, setAbiertaId] = useState(null)
  // Detalles de cierres anteriores ya pedidos, por id (un cierre no cambia).
  const [detalles, setDetalles] = useState({})
  const [errorDetalle, setErrorDetalle] = useState('')

  const [montoInicial, setMontoInicial] = useState('')
  const [tipoMovimiento, setTipoMovimiento] = useState('egreso')
  const [montoMovimiento, setMontoMovimiento] = useState('')
  const [motivoMovimiento, setMotivoMovimiento] = useState(MOTIVOS_CAJA.egreso[0])
  const [montoContado, setMontoContado] = useState('')

  async function cargar() {
    try {
      const [actual, historial] = await Promise.all([obtenerActual(), listarCerradas()])
      setCaja(actual.caja)
      setCerradas(historial)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  // Envuelve cada acción: muestra "guardando", captura el error y recarga
  // los totales al terminar bien.
  async function ejecutar(accion) {
    setError('')
    setGuardando(true)
    try {
      await accion()
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  function handleAbrir(event) {
    event.preventDefault()
    ejecutar(async () => {
      await abrir(Number(montoInicial))
      setMontoInicial('')
      setUltimoCierre(null)
    })
  }

  function handleMovimiento(event) {
    event.preventDefault()
    ejecutar(async () => {
      await registrarMovimiento({ tipo: tipoMovimiento, monto: Number(montoMovimiento), motivo: motivoMovimiento })
      setMontoMovimiento('')
    })
  }

  function cambiarTipoMovimiento(tipo) {
    setTipoMovimiento(tipo)
    setMotivoMovimiento(MOTIVOS_CAJA[tipo][0])
  }

  function handleCerrar(event) {
    event.preventDefault()
    if (!window.confirm('¿Cerrar la caja? Después no se pueden anular las ventas de este turno.')) return
    ejecutar(async () => {
      const cierre = await cerrar(Number(montoContado))
      setMontoContado('')
      setUltimoCierre(cierre)
    })
  }

  async function toggleCierre(id) {
    if (abiertaId === id) {
      setAbiertaId(null)
      return
    }
    setAbiertaId(id)
    setErrorDetalle('')
    if (detalles[id]) return
    try {
      const detalle = await obtenerPorId(id)
      setDetalles((actuales) => ({ ...actuales, [id]: detalle }))
    } catch (err) {
      setErrorDetalle(err.message)
    }
  }

  const diferenciaPrevia =
    caja && montoContado !== '' ? Number(montoContado) - Number(caja.efectivo_esperado) : null

  return (
    <div className="caja-page">
      <p className="caja-page__eyebrow">Apertura y cierre</p>

      <div className="caja-card">
        <PageHeader title="Caja" backTo="/" />

        {error && (
          <p className="caja-card__error" role="alert">
            {error}
          </p>
        )}
        {cargando && <p className="caja-card__estado">Cargando...</p>}

        {ultimoCierre && (
          <div className="caja-cierre">
            <p className="caja-cierre__titulo">Caja cerrada</p>
            <p className={`caja-cierre__diferencia ${claseDiferencia(ultimoCierre.diferencia)}`}>
              {textoDiferencia(ultimoCierre.diferencia)}
            </p>
            <ResumenCierre caja={ultimoCierre} />
          </div>
        )}

        {!cargando && !caja && (
          <form className="caja-form" onSubmit={handleAbrir}>
            <p className="caja-card__texto">No hay una caja abierta. Para empezar a vender, abrila con el efectivo que hay en el cajón.</p>
            <label className="caja-form__field">
              <span className="caja-form__label">Efectivo inicial</span>
              <input
                className="caja-form__input"
                type="number"
                min="0"
                step="0.01"
                value={montoInicial}
                onChange={(event) => setMontoInicial(event.target.value)}
                required
              />
            </label>
            <button className="caja-form__submit" type="submit" disabled={guardando}>
              {guardando ? 'Abriendo...' : 'Abrir caja'}
            </button>
          </form>
        )}

        {caja && (
          <>
            <p className="caja-card__texto">
              Abierta {formatearFechaHora(caja.abierta_en)} por {caja.usuario_apertura_nombre}
            </p>

            <div className="caja-resumen">
              <p className="caja-resumen__label">Efectivo que debería haber</p>
              <p className="caja-resumen__monto">{formatearPrecio(caja.efectivo_esperado)}</p>
            </div>

            <div className="caja-filas">
              <p className="caja-fila">
                <span>Efectivo inicial</span>
                <span>{formatearPrecio(caja.monto_inicial)}</span>
              </p>
              <p className="caja-fila">
                <span>Ventas en efectivo</span>
                <span>{formatearPrecio(caja.ventas.efectivo)}</span>
              </p>
              {caja.ingresos > 0 && (
                <p className="caja-fila">
                  <span>Ingresos</span>
                  <span>+{formatearPrecio(caja.ingresos)}</span>
                </p>
              )}
              {caja.egresos > 0 && (
                <p className="caja-fila">
                  <span>Retiros y pagos</span>
                  <span>-{formatearPrecio(caja.egresos)}</span>
                </p>
              )}
              <p className="caja-fila">
                <span>MercadoPago</span>
                <span>{formatearPrecio(caja.ventas.mercadopago)}</span>
              </p>
              <p className="caja-fila">
                <span>Tarjeta</span>
                <span>{formatearPrecio(caja.ventas.tarjeta)}</span>
              </p>
              <p className="caja-fila caja-fila--total">
                <span>
                  Total vendido ({caja.ventas.cantidad} venta{caja.ventas.cantidad === 1 ? '' : 's'})
                </span>
                <span>{formatearPrecio(caja.ventas.total)}</span>
              </p>
            </div>

            <p className="caja-card__seccion">Movimiento de efectivo</p>
            <form className="caja-form" onSubmit={handleMovimiento}>
              <div className="caja-tipos">
                <button
                  type="button"
                  className={`caja-tipo${tipoMovimiento === 'egreso' ? ' caja-tipo--activo caja-tipo--egreso' : ''}`}
                  onClick={() => cambiarTipoMovimiento('egreso')}
                >
                  Sale plata
                </button>
                <button
                  type="button"
                  className={`caja-tipo${tipoMovimiento === 'ingreso' ? ' caja-tipo--activo' : ''}`}
                  onClick={() => cambiarTipoMovimiento('ingreso')}
                >
                  Entra plata
                </button>
              </div>
              <div className="caja-form__fila">
                <label className="caja-form__field">
                  <span className="caja-form__label">Monto</span>
                  <input
                    className="caja-form__input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={montoMovimiento}
                    onChange={(event) => setMontoMovimiento(event.target.value)}
                    required
                  />
                </label>
                <label className="caja-form__field">
                  <span className="caja-form__label">Motivo</span>
                  <select
                    className="caja-form__input"
                    value={motivoMovimiento}
                    onChange={(event) => setMotivoMovimiento(event.target.value)}
                  >
                    {MOTIVOS_CAJA[tipoMovimiento].map((motivo) => (
                      <option key={motivo} value={motivo}>
                        {motivo}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="caja-form__secundario" type="submit" disabled={guardando}>
                Registrar movimiento
              </button>
            </form>

            {caja.movimientos.length > 0 && <ListaMovimientos movimientos={caja.movimientos} />}

            <p className="caja-card__seccion">Cerrar caja</p>
            <form className="caja-form" onSubmit={handleCerrar}>
              <label className="caja-form__field">
                <span className="caja-form__label">Efectivo contado en el cajón</span>
                <input
                  className="caja-form__input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoContado}
                  onChange={(event) => setMontoContado(event.target.value)}
                  required
                />
              </label>
              {diferenciaPrevia !== null && (
                <p className={`caja-diferencia ${claseDiferencia(diferenciaPrevia.toFixed(2))}`}>
                  {textoDiferencia(diferenciaPrevia.toFixed(2))}
                </p>
              )}
              <button className="caja-form__submit" type="submit" disabled={guardando}>
                {guardando ? 'Cerrando...' : 'Cerrar caja'}
              </button>
            </form>
          </>
        )}

        {!cargando && cerradas.length > 0 && (
          <>
            <p className="caja-card__seccion">Últimos cierres</p>
            <div className="caja-historial">
              {cerradas.map((cerrada) => {
                const abierta = abiertaId === cerrada.id
                const detalle = detalles[cerrada.id]
                return (
                  <div className="caja-historial__item" key={cerrada.id}>
                    <button
                      className="caja-historial__resumen"
                      onClick={() => toggleCierre(cerrada.id)}
                      aria-expanded={abierta}
                    >
                      <span className="caja-historial__info">
                        {formatearFechaHora(cerrada.cerrada_en)}
                        <span className="caja-movimiento__detalle">Cerró {cerrada.usuario_cierre_nombre}</span>
                      </span>
                      <span className={`caja-historial__diferencia ${claseDiferencia(cerrada.diferencia)}`}>
                        {textoDiferencia(cerrada.diferencia)}
                      </span>
                      <ChevronRightIcon
                        className={`caja-historial__chevron${abierta ? ' caja-historial__chevron--abierto' : ''}`}
                      />
                    </button>

                    {abierta && (
                      <div className="caja-historial__detalle">
                        {!detalle && !errorDetalle && <p className="caja-card__estado">Cargando...</p>}
                        {!detalle && errorDetalle && (
                          <p className="caja-card__error" role="alert">
                            {errorDetalle}
                          </p>
                        )}
                        {detalle && (
                          <>
                            <p className="caja-card__texto">
                              Abierta {formatearFechaHora(detalle.abierta_en)} por {detalle.usuario_apertura_nombre}
                            </p>
                            <ResumenCierre caja={detalle} />
                            {detalle.movimientos.length > 0 && (
                              <>
                                <p className="caja-historial__subtitulo">Movimientos de efectivo</p>
                                <ListaMovimientos movimientos={detalle.movimientos} />
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
