import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

const CarritoContext = createContext(null)
const CLAVE_STORAGE = 'carrito'

function leerGuardado() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_STORAGE)) || []
  } catch {
    return []
  }
}

// Carrito de la venta en curso. Se guarda en localStorage para no perderlo
// si se recarga la página a mitad de una venta, y se vacía al cerrar sesión
// para que no le quede al próximo usuario del mismo dispositivo.
// Cada item guarda una copia del producto (nombre, precio, stock) solo para
// mostrarlo; el precio real lo toma el backend al vender. La cantidad no se
// limita al stock: se puede vender aunque el conteo diga que no hay.
export function CarritoProvider({ children }) {
  const { usuario } = useAuth()
  const [items, setItems] = useState(leerGuardado)

  useEffect(() => {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (!usuario) setItems([])
  }, [usuario])

  function agregar(producto) {
    setItems((actuales) => {
      const existente = actuales.find((item) => item.producto_id === producto.id)
      if (existente) {
        return actuales.map((item) =>
          item.producto_id === producto.id
            ? { ...item, cantidad: item.cantidad + 1, stock: producto.stock }
            : item
        )
      }
      return [
        ...actuales,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          foto_url: producto.foto_url,
          stock: producto.stock,
          cantidad: 1,
        },
      ]
    })
  }

  function cambiarCantidad(productoId, cantidad) {
    setItems((actuales) =>
      cantidad <= 0
        ? actuales.filter((item) => item.producto_id !== productoId)
        : actuales.map((item) => (item.producto_id === productoId ? { ...item, cantidad } : item))
    )
  }

  function vaciar() {
    setItems([])
  }

  const cantidadTotal = items.reduce((suma, item) => suma + item.cantidad, 0)
  const total = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0)

  const value = { items, agregar, cambiarCantidad, vaciar, cantidadTotal, total }

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>
}

export function useCarrito() {
  const context = useContext(CarritoContext)
  if (!context) {
    throw new Error('useCarrito debe usarse dentro de un CarritoProvider')
  }
  return context
}
