-- Fase 2 de ventas: apertura/cierre de caja y movimientos de efectivo.
-- Para bases creadas antes de esta fase (las nuevas ya lo traen en schema.sql):
--   mysql -u root -p escaner < src/db/migrations/002_caja.sql

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

-- Las ventas de la Fase 1 quedan con caja_id NULL.
ALTER TABLE ventas ADD FOREIGN KEY (caja_id) REFERENCES cajas(id);
