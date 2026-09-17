import { useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { UploadIcon } from '../components/icons'
import { cargarCsv } from '../api/productos'
import './ImportarCsvPage.css'

export default function ImportarCsvPage() {
  const [archivo, setArchivo] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const inputRef = useRef(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!archivo) return

    setError('')
    setResumen(null)
    setCargando(true)
    try {
      const data = await cargarCsv(archivo)
      setResumen(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="csv-page">
      <p className="csv-page__eyebrow">Carga masiva CSV</p>

      <div className="csv-card">
        <PageHeader title="Cargar CSV" backTo="/catalogo" />

        <form onSubmit={handleSubmit}>
          <button type="button" className="csv-dropzone" onClick={() => inputRef.current?.click()}>
            <UploadIcon />
            <span className="csv-dropzone__titulo">{archivo ? archivo.name : 'Seleccionar archivo'}</span>
            <span className="csv-dropzone__hint">codigo_barras,nombre,precio</span>
          </button>

          <input
            ref={inputRef}
            className="csv-input-oculto"
            type="file"
            accept=".csv"
            onChange={(event) => setArchivo(event.target.files[0] ?? null)}
            required
          />

          <p className="csv-nota">
            Si el código de barras ya existe, se actualiza el producto. Si no existe, se crea uno nuevo.
          </p>

          {error && (
            <p className="csv-error" role="alert">
              {error}
            </p>
          )}

          <button className="csv-submit" type="submit" disabled={cargando || !archivo}>
            {cargando ? 'Procesando...' : 'Procesar archivo'}
          </button>
        </form>

        {resumen && (
          <div className="csv-resumen">
            <p className="csv-resumen__item">Creados: {resumen.creados}</p>
            <p className="csv-resumen__item">Actualizados: {resumen.actualizados}</p>

            {resumen.errores.length > 0 && (
              <>
                <p className="csv-resumen__item">Filas con error:</p>
                <ul className="csv-resumen__errores">
                  {resumen.errores.map((err) => (
                    <li key={err.fila}>
                      Fila {err.fila}: {err.motivo}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
