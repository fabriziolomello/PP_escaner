import { useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { UploadIcon } from '../components/icons'
import { cargarCsv } from '../api/productos'
import { armarCsvProductos, descargarCsv } from '../utils/csv'
import './ImportarCsvPage.css'

const PRODUCTOS_EJEMPLO = [
  { codigo_barras: '7790895000997', nombre: 'Coca-Cola 500 ml', precio: 1500, stock: 24 },
  { codigo_barras: '7790040113408', nombre: 'Galletitas Oreo 118 g', precio: 1250.5, stock: 10 },
  { codigo_barras: null, nombre: 'Pan casero (por kg)', precio: 2800, stock: null },
]

function descargarEjemplo() {
  descargarCsv('ejemplo-productos.csv', armarCsvProductos(PRODUCTOS_EJEMPLO))
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
      // Ya procesado: se limpia para no volver a subirlo por error.
      setArchivo(null)
      if (inputRef.current) inputRef.current.value = ''
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
            <span className="csv-dropzone__hint">codigo_barras,nombre,precio,stock</span>
          </button>

          <input
            ref={inputRef}
            className="csv-input-oculto"
            type="file"
            accept=".csv"
            onChange={(event) => {
              setArchivo(event.target.files[0] ?? null)
              setResumen(null)
            }}
            required
          />

          <button type="button" className="csv-ejemplo" onClick={descargarEjemplo}>
            Descargar archivo de ejemplo
          </button>

          <p className="csv-nota">
            Si el código de barras ya existe, se actualiza el producto. Si no existe, se crea uno nuevo.
            El código de barras y el stock son opcionales: podés dejarlos vacíos. El stock es la cantidad que
            tenés ahora (no se suma a la anterior); si lo dejás vacío, no se modifica. Para actualizar
            lo que ya tenés, usá Exportar catálogo, cambiá los números y subilo de nuevo.
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
