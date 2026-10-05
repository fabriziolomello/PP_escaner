-- Fase 1 de ventas: stock por producto, registro de ventas y movimientos de stock.
-- Para bases creadas antes de esta fase (las nuevas ya lo traen en schema.sql):
--   mysql -u root -p escaner < src/db/migrations/001_ventas_stock.sql

ALTER TABLE productos ADD COLUMN stock INT NOT NULL DEFAULT 0;

-- caja_id queda NULL hasta la Fase 2 (tabla cajas); ahi se agrega la FK.
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
