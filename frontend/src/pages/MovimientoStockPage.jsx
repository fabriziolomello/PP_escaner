import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { SearchIcon, ImagePlaceholderIcon, CloseIcon } from '../components/icons'
import { listar } from '../api/productos'
import { MOTIVOS_STOCK, registrarMovimiento, listarMovimientos } from '../api/stock'
import { formatearFechaHora } from '../utils/formato'
import './MovimientoStockPage.css'

// Ingreso/Egreso de stock: es un formulario, no un listado. Se busca el
// producto, se ve su stock actual como referencia y se registra la entrada
// o salida con un motivo de la lista fija.
export default function MovimientoStockPage() {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)

  const [producto, setProducto] = useState(null)
  const [tipo, setTipo] = useState('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState(MOTIVOS_STOCK.entrada[0])

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [movimientos, setMovimientos] = useState([])

  useEffect(() => {
    listarMovimientos()
      .then(setMovimientos)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const nombreBuscado = busqueda.trim()
    if (!nombreBuscado || producto) {
      setResultados([])
      setBuscando(false)
      return
    }

    setBuscando(true)
    const timeoutId = setTimeout(() => {
      listar({ nombre: nombreBuscado })
        .then(setResultados)
        .catch((err) => setError(err.message))
        .finally(() => setBuscando(false))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [busqueda, producto])

  function elegirProducto(elegido) {
    setProducto(elegido)
    setBusqueda('')
    setError('')
    setConfirmacion('')
  }

  function cambiarTipo(nuevoTipo) {
    setTipo(nuevoTipo)
    setMotivo(MOTIVOS_STOCK[nuevoTipo][0])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setConfirmacion('')
    setGuardando(true)
    try {
      const actualizado = await registrarMovimiento({
        productoId: producto.id,
        tipo,
        cantidad: Number(cantidad),
        motivo,
      })
      setConfirmacion(
        `${tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${cantidad} registrada. Stock actual: ${actualizado.stock}`
      )
      setProducto(actualizado)
      setCantidad('')
      listarMovimientos()
        .then(setMovimientos)
        .catch(() => {})
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="stock-page">
      <p className="stock-page__eyebrow">Movimientos de stock</p>

      <div className="stock-card">
        <PageHeader title="Ingreso/Egreso" backTo="/" />

        {error && (
          <p className="stock-card__error" role="alert">
            {error}
          </p>
        )}
        {confirmacion && (
          <p className="stock-card__exito" role="status">
            {confirmacion}
          </p>
        )}

        {!producto && (
          <>
            <label className="stock-input">
              <SearchIcon />
              <input
                type="text"
                placeholder="Buscar producto"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
              />
            </label>

            {buscando && <p className="stock-card__estado">Buscando...</p>}
            {!buscando && busqueda.trim() && resultados.length === 0 && (
              <p className="stock-card__estado">No se encontraron productos.</p>
            )}

            <div className="stock-resultados">
              {resultados.map((resultado) => (
                <button className="stock-resultado" key={resultado.id} onClick={() => elegirProducto(resultado)}>
                  <span className="stock-resultado__nombre">{resultado.nombre}</span>
                  <span className="stock-resultado__stock">Stock: {resultado.stock}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {producto && (
          <form className="stock-form" onSubmit={handleSubmit}>
            <div className="stock-producto">
              <span className="stock-producto__imagen">
                {producto.foto_url ? <img src={producto.foto_url} alt="" /> : <ImagePlaceholderIcon />}
              </span>
              <span className="stock-producto__info">
                <span className="stock-producto__nombre">{producto.nombre}</span>
                <span className="stock-producto__stock">Stock actual: {producto.stock}</span>
              </span>
              <button
                type="button"
                className="stock-producto__cambiar"
                onClick={() => {
                  setProducto(null)
                  setConfirmacion('')
                }}
                aria-label="Elegir otro producto"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="stock-tipos">
              <button
                type="button"
                className={`stock-tipo${tipo === 'entrada' ? ' stock-tipo--activo' : ''}`}
                onClick={() => cambiarTipo('entrada')}
              >
                Entrada
              </button>
              <button
                type="button"
                className={`stock-tipo${tipo === 'salida' ? ' stock-tipo--activo stock-tipo--salida' : ''}`}
                onClick={() => cambiarTipo('salida')}
              >
                Salida
              </button>
            </div>

            <label className="stock-form__field">
              <span className="stock-form__label">Cantidad</span>
              <input
                className="stock-form__input"
                type="number"
                min="1"
                step="1"
                max={tipo === 'salida' ? producto.stock : undefined}
                value={cantidad}
                onChange={(event) => setCantidad(event.target.value)}
                required
              />
            </label>

            <label className="stock-form__field">
              <span className="stock-form__label">Motivo</span>
              <select
                className="stock-form__input"
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
              >
                {MOTIVOS_STOCK[tipo].map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </select>
            </label>

            <button className="stock-form__submit" type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : `Confirmar ${tipo}`}
            </button>
          </form>
        )}

        {movimientos.length > 0 && (
          <>
            <p className="stock-card__seccion">Últimos movimientos</p>
            <div className="stock-movimientos">
              {movimientos.map((movimiento) => (
                <div className="stock-movimiento" key={movimiento.id}>
                  <span
                    className={`stock-movimiento__cantidad stock-movimiento__cantidad--${movimiento.tipo}`}
                  >
                    {movimiento.tipo === 'entrada' ? '+' : '−'}
                    {movimiento.cantidad}
                  </span>
                  <span className="stock-movimiento__info">
                    <span className="stock-movimiento__producto">{movimiento.producto_nombre}</span>
                    <span className="stock-movimiento__detalle">
                      {movimiento.motivo} · {formatearFechaHora(movimiento.creado_en)} · {movimiento.usuario_nombre}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
