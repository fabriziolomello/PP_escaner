import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useSuscripcion } from '../context/SuscripcionContext'
import * as suscripcionApi from '../api/suscripcion'
import { formatearPrecio, formatearFecha } from '../utils/formato'
import './SuscripcionPage.css'

const ETIQUETAS_ESTADO = {
  activa: 'Activa',
  por_vencer: 'Por vencer',
  gracia: 'Vencida (último día para pagar)',
  vencida: 'Vencida',
}

// Mensaje según el estado del pago que devuelve MercadoPago al volver del checkout.
function mensajePago(estadoPago) {
  if (estadoPago === 'approved') {
    return { tipo: 'ok', texto: '¡Pago acreditado! Gracias por renovar la suscripción.' }
  }
  if (estadoPago === 'pending' || estadoPago === 'in_process') {
    return {
      tipo: 'aviso',
      texto: 'El pago quedó pendiente. Se acredita solo apenas MercadoPago lo confirme.',
    }
  }
  return { tipo: 'error', texto: 'El pago no se completó. Podés intentar de nuevo.' }
}

export default function SuscripcionPage() {
  const { usuario, logout } = useAuth()
  const { suscripcion, recargar } = useSuscripcion()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [pagando, setPagando] = useState(false)
  const confirmado = useRef(false)
  const esAdmin = usuario.rol === 'admin'
  const vencida = suscripcion?.estado === 'vencida'

  // Vuelta del checkout: MP agrega ?payment_id=...&status=... (payment_id
  // llega como "null" si el usuario cerró el checkout sin pagar).
  useEffect(() => {
    const paymentId = searchParams.get('payment_id')
    if (!searchParams.has('status') || confirmado.current) {
      return
    }
    confirmado.current = true
    setSearchParams({}, { replace: true })

    if (!paymentId || paymentId === 'null') {
      setMensaje(mensajePago(searchParams.get('status')))
      return
    }

    suscripcionApi
      .confirmar(paymentId)
      .then((resultado) => {
        setMensaje(mensajePago(resultado.pago))
        recargar()
      })
      .catch((err) => setError(err.message))
  }, [searchParams, setSearchParams, recargar])

  async function handlePagar() {
    setError('')
    setPagando(true)
    try {
      const { url } = await suscripcionApi.pagar()
      window.location.assign(url)
    } catch (err) {
      setError(err.message)
      setPagando(false)
    }
  }

  function cerrarSesion() {
    logout()
    navigate('/login')
  }

  return (
    <div className="suscripcion-page">
      <p className="suscripcion-page__eyebrow">Plan mensual</p>

      <div className="suscripcion-card">
        {vencida ? (
          <h1 className="suscripcion-card__titulo">Suscripción vencida</h1>
        ) : (
          <PageHeader title="Suscripción" backTo="/" />
        )}

        {error && (
          <p className="suscripcion-card__error" role="alert">
            {error}
          </p>
        )}

        {mensaje && (
          <p className={`suscripcion-mensaje suscripcion-mensaje--${mensaje.tipo}`} role="status">
            {mensaje.texto}
          </p>
        )}

        {!suscripcion && <p className="suscripcion-card__estado">Cargando...</p>}

        {suscripcion && (
          <>
            {vencida && (
              <p className="suscripcion-card__texto">
                {esAdmin
                  ? 'Para seguir usando Escaner, renová la suscripción. Apenas se acredite el pago, vuelve todo a la normalidad.'
                  : 'Para seguir usando Escaner, el administrador del comercio tiene que renovar la suscripción.'}
              </p>
            )}

            <div className={`suscripcion-resumen${vencida ? ' suscripcion-resumen--vencida' : ''}`}>
              <p className="suscripcion-resumen__label">
                {suscripcion.en_prueba ? 'Prueba gratis' : ETIQUETAS_ESTADO[suscripcion.estado]}
              </p>
              <p className="suscripcion-resumen__fecha">
                {suscripcion.estado === 'activa' || suscripcion.estado === 'por_vencer'
                  ? `Vence el ${formatearFecha(suscripcion.vence_en)}`
                  : `Venció el ${formatearFecha(suscripcion.vence_en)}`}
              </p>
            </div>

            <div className="suscripcion-filas">
              <p className="suscripcion-fila">
                <span>Precio mensual</span>
                <span>{formatearPrecio(suscripcion.precio)}</span>
              </p>
            </div>

            {esAdmin && (
              <>
                <button
                  className="suscripcion-card__pagar"
                  type="button"
                  onClick={handlePagar}
                  disabled={pagando}
                >
                  {pagando ? 'Abriendo MercadoPago...' : 'Pagar con MercadoPago'}
                </button>
                <p className="suscripcion-card__nota">
                  Cada pago suma un mes. Si pagás antes de que venza, no perdés los días que te quedaban.
                </p>
              </>
            )}

            {esAdmin && suscripcion.pagos.length > 0 && (
              <>
                <p className="suscripcion-card__seccion">Últimos pagos</p>
                <div className="suscripcion-filas">
                  {suscripcion.pagos.map((pago) => (
                    <p className="suscripcion-fila" key={pago.id}>
                      <span>{formatearFecha(pago.creado_en)}</span>
                      <span>{formatearPrecio(pago.monto)}</span>
                    </p>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {vencida && (
          <button className="suscripcion-card__salir" type="button" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  )
}
