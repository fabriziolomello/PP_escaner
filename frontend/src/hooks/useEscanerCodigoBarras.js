import { useEffect, useRef } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

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

// Arranca la cámara en el <div id={contenedorId}> mientras `activo` es true,
// y llama a onDetectado(codigo) una sola vez por cada activación. Compartido
// por EscanearPage (pantalla completa) y ProductoNuevoPage (escaneo inline
// para precargar el código de barras al dar de alta un producto).
export function useEscanerCodigoBarras(contenedorId, activo, onDetectado) {
  const onDetectadoRef = useRef(onDetectado)
  onDetectadoRef.current = onDetectado

  useEffect(() => {
    if (!activo) return

    const scanner = new Html5Qrcode(contenedorId, {
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
        if (yaDetectado) return
        yaDetectado = true
        // Algunos decoders devuelven espacios o caracteres de control junto
        // al código (invisibles en pantalla) que rompen la comparación
        // exacta contra la base. Se normaliza acá para cubrir a los dos
        // consumidores del hook (EscanearPage y ProductoNuevoPage).
        scanner.stop().then(() => onDetectadoRef.current(codigoDecodificado.trim()))
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
      // montar una vez en desarrollo. Esperamos a que start() termine de
      // asentarse -haya salido bien o mal- antes de frenar la cámara.
      iniciado.then(() => scanner.stop()).catch(() => {})
    }
  }, [contenedorId, activo])
}
