import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// Ojo: este login() NO llama a la API, solo guarda en el estado global +
// localStorage un { token, usuario } que YA vino de un login/registro
// exitoso (eso lo hacen las funciones de api/auth.js). Separamos
// "hablar con el backend" de "recordar la sesión en el cliente".
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('usuario')
    return guardado ? JSON.parse(guardado) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  function login(nuevoToken, nuevoUsuario) {
    localStorage.setItem('token', nuevoToken)
    localStorage.setItem('usuario', JSON.stringify(nuevoUsuario))
    setToken(nuevoToken)
    setUsuario(nuevoUsuario)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setToken(null)
    setUsuario(null)
  }

  const value = { usuario, token, login, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
