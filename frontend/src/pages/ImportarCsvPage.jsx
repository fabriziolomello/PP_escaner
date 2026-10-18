import { useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { UploadIcon } from '../components/icons'
import { cargarCsv } from '../api/productos'
import './ImportarCsvPage.css'

// Con ';' y coma decimal, como lo guarda Excel en español; el BOM hace que
// Excel lea bien los acentos. El backend acepta tambien ',' y punto decimal.
const CSV_EJEMPLO = [
  'codigo_barras;nombre;precio',
  '7790895000997;Coca-Cola 500 ml;1500,00',
  '7790040113408;Galletitas Oreo 118 g;1250,50',
  ';Pan casero (por kg);2800',
].join('\r\n')

function descargarEjemplo() {
  const blob = new Blob(['\uFEFF' + CSV_EJEMPLO], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'ejemplo-productos.csv'
  link.click()
  URL.revokeObjectURL(url)
}

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

          <button type="button" className="csv-ejemplo" onClick={descargarEjemplo}>
            Descargar archivo de ejemplo
          </button>

          <p className="csv-nota">
            Si el código de barras ya existe, se actualiza el producto. Si no existe, se crea uno nuevo.
            El código de barras es opcional: podés dejarlo vacío.
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
