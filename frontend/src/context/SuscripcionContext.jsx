import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import * as suscripcionApi from '../api/suscripcion'

const SuscripcionContext = createContext(null)

// Estado de la suscripción del comercio, cargado una vez por sesión. Lo usan
// ProtectedRoute (para bloquear si está vencida), el aviso del Inicio y la
// página de Suscripción. Si vence en medio de la sesión, el backend responde
// SUSCRIPCION_VENCIDA y api/client.js redirige a /suscripcion.
export function SuscripcionProvider({ children }) {
  const { token } = useAuth()
  const [suscripcion, setSuscripcion] = useState(null)

  const recargar = useCallback(async () => {
    try {
      setSuscripcion(await suscripcionApi.obtener())
    } catch {
      // Sin estado no se bloquea nada: el backend igual corta si está vencida.
      setSuscripcion(null)
    }
  }, [])

  useEffect(() => {
    if (token) {
      recargar()
    } else {
      setSuscripcion(null)
    }
  }, [token, recargar])

  const value = { suscripcion, recargar }

  return <SuscripcionContext.Provider value={value}>{children}</SuscripcionContext.Provider>
}

export function useSuscripcion() {
  const context = useContext(SuscripcionContext)
  if (!context) {
    throw new Error('useSuscripcion debe usarse dentro de un SuscripcionProvider')
  }
  return context
}
