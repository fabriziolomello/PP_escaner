import { useState } from 'react'
import { cargarCsv } from '../api/productos'

export default function ImportarCsvPage() {
  const [archivo, setArchivo] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

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
    <div>
      <h1>Importar productos desde CSV</h1>
      <p>El archivo debe tener columnas: codigo_barras, nombre, precio.</p>

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".csv"
          onChange={(event) => setArchivo(event.target.files[0] ?? null)}
          required
        />
        <button type="submit" disabled={cargando || !archivo}>
          {cargando ? 'Importando...' : 'Importar'}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      {resumen && (
        <div>
          <p>Creados: {resumen.creados}</p>
          <p>Actualizados: {resumen.actualizados}</p>

          {resumen.errores.length > 0 && (
            <>
              <p>Filas con error:</p>
              <ul>
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
  )
}
