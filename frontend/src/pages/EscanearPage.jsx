import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useEscanerCodigoBarras } from '../hooks/useEscanerCodigoBarras'
import './EscanearPage.css'

const CONTENEDOR_ID = 'lector-camara'

// getUserMedia (la API de cámara del navegador) solo funciona en un
// "contexto seguro": HTTPS, o localhost/127.0.0.1 (que el navegador trata
// como seguro para poder desarrollar). En producción, sin HTTPS esta
// página no va a poder pedir permiso de cámara.
export default function EscanearPage() {
  const navigate = useNavigate()
  const [codigoManual, setCodigoManual] = useState('')

  useEscanerCodigoBarras(CONTENEDOR_ID, true, (codigoDecodificado) => {
    navigate(`/productos/resultados?codigo_barras=${encodeURIComponent(codigoDecodificado)}`)
  })

  function handleBuscarManual(event) {
    event.preventDefault()
    const codigo = codigoManual.trim()
    if (!codigo) return
    navigate(`/productos/resultados?codigo_barras=${encodeURIComponent(codigo)}`)
  }

  return (
    <div className="escanear-page">
      <p className="escanear-page__eyebrow">Escanear producto</p>

      <div className="escanear-card">
        <PageHeader title="Escanear producto" backTo="/" />

        <div className="escanear-camara">
          <div id={CONTENEDOR_ID} className="escanear-camara__video" />
        </div>

        <p className="escanear-card__instruccion">Apuntá al código de barras</p>

        <p className="escanear-card__divisor">o ingresá el código manualmente</p>

        <form className="escanear-manual" onSubmit={handleBuscarManual}>
          <input
            className="escanear-manual__input"
            type="text"
            placeholder="7791234567890"
            value={codigoManual}
            onChange={(event) => setCodigoManual(event.target.value)}
          />
          <button className="escanear-manual__boton" type="submit">
            Buscar
          </button>
        </form>
      </div>
    </div>
  )
}
