import { useAuth } from '../context/AuthContext'

// Solo se renderiza dentro de <ProtectedRoute>, así que para cuando
// llegamos acá ya sabemos que hay una sesión activa (usuario no es null).
// La navegación (Escanear, Buscar, y los accesos admin) vive en el
// NavBar, que ProtectedRoute ya agrega en todas las páginas privadas.
export default function Dashboard() {
  const { usuario } = useAuth()

  return (
    <div>
      <h1>Hola, {usuario.nombre}</h1>
      <p>Iniciaste sesión como {usuario.rol}.</p>
    </div>
  )
}
