import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { generarTicketPdf, nombreArchivoTicket } from '../utils/ticket'
import './TicketAcciones.css'

// jsPDF pesa bastante, así que se baja recién cuando hace falta un ticket
// (una sola vez para toda la app). Se carga al mostrar los botones y no al
// tocarlos: el celular solo deja compartir o abrir otra pestaña si eso pasa
// enseguida del toque, sin esperas en el medio.
let cargaJsPdf = null
function cargarJsPdf() {
  cargaJsPdf ??= import('jspdf').then((modulo) => modulo.jsPDF)
  return cargaJsPdf
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombre
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// Botones "Compartir" e "Imprimir" del ticket en PDF de una venta. Se usan
// al terminar una venta (Carrito) y en el historial (Ventas).
export default function TicketAcciones({ venta }) {
  const { usuario } = useAuth()
  const [jsPDF, setJsPDF] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarJsPdf()
      .then((modulo) => setJsPDF(() => modulo))
      .catch(() => {
        cargaJsPdf = null
        setError('No se pudo preparar el ticket. Revisá la conexión.')
      })
  }, [])

  function generar() {
    return generarTicketPdf(jsPDF, { comercio: usuario.comercio_nombre, venta })
  }

  // En el celular abre el menú para compartir (WhatsApp, mail, etc.); donde
  // no se puede compartir un archivo (algunas compus), lo descarga.
  async function compartir() {
    setError('')
    const blob = generar()
    const archivo = new File([blob], nombreArchivoTicket(venta), { type: 'application/pdf' })

    if (!navigator.canShare?.({ files: [archivo] })) {
      descargar(blob, archivo.name)
      return
    }
    try {
      await navigator.share({ files: [archivo], title: `Ticket ${usuario.comercio_nombre}` })
    } catch (err) {
      if (err.name !== 'AbortError') setError('No se pudo compartir el ticket.')
    }
  }

  // Abre el PDF en otra pestaña; desde el visor del navegador se imprime.
  function imprimir() {
    setError('')
    const blob = generar()
    const url = URL.createObjectURL(blob)
    const pestana = window.open(url, '_blank')
    if (!pestana) descargar(blob, nombreArchivoTicket(venta))
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  return (
    <div className="ticket-acciones">
      <div className="ticket-acciones__botones">
        <button className="ticket-acciones__boton" onClick={compartir} disabled={!jsPDF}>
          Compartir ticket
        </button>
        <button className="ticket-acciones__boton" onClick={imprimir} disabled={!jsPDF}>
          Imprimir
        </button>
      </div>
      {error && (
        <p className="ticket-acciones__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
