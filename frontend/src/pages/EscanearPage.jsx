import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const CONTENEDOR_ID = 'lector-camara'

// Formatos 1D típicos de código de barras de productos de retail. Restringir
// la lista (en vez de dejar que intente TODOS los formatos, incluidos QR,
// DataMatrix, Aztec, etc.) hace que cada frame se procese más rápido.
const FORMATOS_CODIGO_BARRAS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
]

// getUserMedia (la API de cámara del navegador) solo funciona en un
// "contexto seguro": HTTPS, o localhost/127.0.0.1 (que el navegador trata
// como seguro para poder desarrollar). En producción, sin HTTPS esta
// página no va a poder pedir permiso de cámara.
export default function EscanearPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const scanner = new Html5Qrcode(CONTENEDOR_ID, {
      formatsToSupport: FORMATOS_CODIGO_BARRAS,
    })
    let yaDetectado = false

    // Guardamos la promesa de start() para poder esperarla en el cleanup.
    const iniciado = scanner.start(
      { facingMode: 'environment' },
      // Rectángulo apaisado en vez de cuadrado: un código de barras es
      // ancho y bajo, no cuadrado como un QR.
      { fps: 10, qrbox: { width: 280, height: 140 } },
      (codigoDecodificado) => {
        // El callback de éxito se sigue disparando en cada frame mientras
        // la cámara siga viendo el código; con esta bandera nos aseguramos
        // de navegar una sola vez.
        if (yaDetectado) return
        yaDetectado = true
        scanner.stop().then(() => {
          navigate(`/productos/resultados?codigo_barras=${encodeURIComponent(codigoDecodificado)}`)
        })
      },
      () => {
        // Se llama en cada frame donde NO se detecta un código válido.
        // Es el caso normal mientras se apunta la cámara, no un error real.
      }
    )

    iniciado.catch((err) => {
      console.error('No se pudo iniciar la cámara', err)
    })

    return () => {
      yaDetectado = true
      // React StrictMode monta este efecto, lo desmonta y lo vuelve a
      // montar una vez en desarrollo (a propósito, para detectar efectos
      // mal limpiados). Si llamáramos scanner.stop() de inmediato acá,
      // se ejecutaría MIENTRAS start() todavía está pidiendo permiso de
      // cámara, dejándola en un estado inconsistente (por eso "se queda
      // escaneando" sin mostrar nada). Por eso esperamos a que start()
      // termine de asentarse -haya salido bien o mal- antes de frenarla.
      iniciado.then(() => scanner.stop()).catch(() => {})
    }
  }, [navigate])

  return (
    <div>
      <h1>Escanear código de barras</h1>
      <div id={CONTENEDOR_ID} style={{ width: '300px' }} />
    </div>
  )
}
