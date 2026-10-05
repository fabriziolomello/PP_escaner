-- Esquema de base de datos del proyecto Escaner
-- Ejecutar una vez contra la base de datos vacia (ej: mysql -u root -p escaner < src/db/schema.sql)

CREATE TABLE IF NOT EXISTS comercios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'empleado')),
  comercio_id INT NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comercio_id) REFERENCES comercios(id)
);

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_barras VARCHAR(100) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  precio NUMERIC(12, 2) NOT NULL,
  foto_url TEXT,
  stock INT NOT NULL DEFAULT 0,
  comercio_id INT NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comercio_id) REFERENCES comercios(id)
);

-- codigo_barras no es unico (puede haber duplicados por errores de carga),
-- pero se busca siempre dentro de un comercio -> indice compuesto.
CREATE INDEX idx_productos_comercio_codigo
  ON productos (comercio_id, codigo_barras);

-- Solo una caja abierta por comercio a la vez (se controla en caja.controller.js).
-- diferencia = monto_final_declarado - monto esperado de efectivo al cerrar.
CREATE TABLE IF NOT EXISTS cajas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comercio_id INT NOT NULL,
  usuario_apertura_id INT NOT NULL,
  monto_inicial NUMERIC(12, 2) NOT NULL,
  abierta_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_cierre_id INT NULL,
  monto_final_declarado NUMERIC(12, 2) NULL,
  diferencia NUMERIC(12, 2) NULL,
  cerrada_en TIMESTAMP NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  FOREIGN KEY (comercio_id) REFERENCES comercios(id),
  FOREIGN KEY (usuario_apertura_id) REFERENCES usuarios(id),
  FOREIGN KEY (usuario_cierre_id) REFERENCES usuarios(id),
  INDEX idx_cajas_comercio_estado (comercio_id, estado)
);

CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comercio_id INT NOT NULL,
  usuario_id INT NOT NULL,
  caja_id INT NULL,
  total NUMERIC(12, 2) NOT NULL,
  metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo', 'mercadopago', 'tarjeta')),
  anulada BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comercio_id) REFERENCES comercios(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (caja_id) REFERENCES cajas(id),
  INDEX idx_ventas_comercio_fecha (comercio_id, creado_en)
);

-- precio_unitario se copia al momento de la venta: si despues cambia el
-- precio del producto, el historial no se altera.
CREATE TABLE IF NOT EXISTS venta_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12, 2) NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL,
  FOREIGN KEY (venta_id) REFERENCES ventas(id),
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE TABLE IF NOT EXISTS movimientos_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad INT NOT NULL CHECK (cantidad > 0),
  motivo VARCHAR(50) NOT NULL,
  usuario_id INT NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Entradas/salidas de efectivo que no son ventas (retiros, pagos a proveedor).
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caja_id INT NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  motivo VARCHAR(50) NOT NULL,
  usuario_id INT NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caja_id) REFERENCES cajas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
