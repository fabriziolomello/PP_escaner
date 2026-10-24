import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

const CarritoContext = createContext(null)
const CLAVE_STORAGE = 'carrito'
const CLAVE_DESCUENTO = 'carrito-descuento'
const SIN_DESCUENTO = { tipo: 'porcentaje', valor: 0 }

function leerGuardado(clave, vacio) {
  try {
    return JSON.parse(localStorage.getItem(clave)) || vacio
  } catch {
    return vacio
  }
}

function aCentavos(valor) {
  return Math.round(Number(valor) * 100)
}

// Subtotal de un item en centavos, con su descuento aplicado. Mismo
// redondeo que el backend (ventas.controller.js crear).
function subtotalItemCentavos(item) {
  const bruto = aCentavos(item.precio) * item.cantidad
  return bruto - Math.round((bruto * (item.descuento || 0)) / 100)
}

// Los items guardados antes de que existieran precio editable y descuentos
// no traen precio_lista ni descuento.
function completarItem(item) {
  return { precio_lista: item.precio, descuento: 0, ...item }
}

// Carrito de la venta en curso. Se guarda en localStorage para no perderlo
// si se recarga la página a mitad de una venta, y se vacía al cerrar sesión
// para que no le quede al próximo usuario del mismo dispositivo.
// Cada item guarda una copia del producto (nombre, precio, stock) para
// mostrarlo. El vendedor puede cambiar el precio y ponerle un descuento (%)
// a cada item, y un descuento a toda la venta (por monto o %). El precio
// solo se le manda al backend si se cambió: si no, usa el del catálogo,
// por si cambió mientras el producto estaba en el carrito. La cantidad no
// puede superar el stock (el backend igual lo vuelve a controlar al vender,
// porque la copia del stock puede estar desactualizada).
export function CarritoProvider({ children }) {
  const { usuario } = useAuth()
  const [items, setItems] = useState(() => leerGuardado(CLAVE_STORAGE, []).map(completarItem))
  const [descuento, setDescuento] = useState(() => leerGuardado(CLAVE_DESCUENTO, SIN_DESCUENTO))

  useEffect(() => {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    localStorage.setItem(CLAVE_DESCUENTO, JSON.stringify(descuento))
  }, [descuento])

  useEffect(() => {
    if (!usuario) {
      setItems([])
      setDescuento(SIN_DESCUENTO)
    }
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
          precio_lista: Number(producto.precio),
          descuento: 0,
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

  function cambiarPrecio(productoId, precio) {
    setItems((actuales) =>
      actuales.map((item) => (item.producto_id === productoId ? { ...item, precio: Math.max(precio, 0) } : item))
    )
  }

  // Con dos decimales como mucho, igual que lo guarda el backend.
  function cambiarDescuentoItem(productoId, porcentaje) {
    const descuento = Math.round(Math.min(Math.max(porcentaje, 0), 100) * 100) / 100
    setItems((actuales) =>
      actuales.map((item) => (item.producto_id === productoId ? { ...item, descuento } : item))
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
    setDescuento(SIN_DESCUENTO)
  }

  const cantidadTotal = items.reduce((suma, item) => suma + item.cantidad, 0)
  const subtotalCentavos = items.reduce((suma, item) => suma + subtotalItemCentavos(item), 0)
  // El descuento de la venta se calcula sobre la suma de los items ya con
  // sus descuentos. Si el monto supera esa suma no se puede vender.
  const descuentoCentavos =
    descuento.tipo === 'porcentaje'
      ? Math.round((subtotalCentavos * Math.min(descuento.valor, 100)) / 100)
      : aCentavos(descuento.valor)
  const descuentoExcedido = descuentoCentavos > subtotalCentavos

  const value = {
    items,
    agregar,
    cambiarCantidad,
    cambiarPrecio,
    cambiarDescuentoItem,
    actualizarStock,
    vaciar,
    descuento,
    setDescuento,
    cantidadTotal,
    subtotalItem: (item) => subtotalItemCentavos(item) / 100,
    subtotal: subtotalCentavos / 100,
    descuentoMonto: Math.min(descuentoCentavos, subtotalCentavos) / 100,
    descuentoExcedido,
    total: Math.max(subtotalCentavos - descuentoCentavos, 0) / 100,
  }

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>
}

export function useCarrito() {
  const context = useContext(CarritoContext)
  if (!context) {
    throw new Error('useCarrito debe usarse dentro de un CarritoProvider')
  }
  return context
}
