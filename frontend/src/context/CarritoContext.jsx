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
// mostrarlo; el precio real lo toma el backend al vender. La cantidad no
// puede superar el stock (el backend igual lo vuelve a controlar al vender,
// porque la copia del stock puede estar desactualizada).
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
      if ((existente?.cantidad || 0) >= producto.stock) return actuales
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
        : actuales.map((item) =>
            item.producto_id === productoId ? { ...item, cantidad: Math.min(cantidad, Math.max(item.stock, 1)) } : item
          )
    )
  }

  // Cuando el backend rechaza la venta por stock, actualiza la copia del
  // stock de esos productos para que el carrito muestre lo que hay de verdad.
  function actualizarStock(productos) {
    setItems((actuales) =>
      actuales.map((item) => {
        const actualizado = productos.find((producto) => producto.producto_id === item.producto_id)
        return actualizado ? { ...item, stock: actualizado.stock } : item
      })
    )
  }

  function vaciar() {
    setItems([])
  }

  const cantidadTotal = items.reduce((suma, item) => suma + item.cantidad, 0)
  const total = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0)

  const value = { items, agregar, cambiarCantidad, actualizarStock, vaciar, cantidadTotal, total }

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>
}

export function useCarrito() {
  const context = useContext(CarritoContext)
  if (!context) {
    throw new Error('useCarrito debe usarse dentro de un CarritoProvider')
  }
  return context
}
