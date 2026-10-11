-- Suscripcion mensual de los comercios (pago manual por MercadoPago).
-- Para bases creadas antes de esta fase (las nuevas ya lo traen en schema.sql):
--   mysql -u root -p escaner < src/db/migrations/003_suscripcion.sql

-- vence_en: hasta cuando esta paga (o en prueba) la suscripcion. Pasado
-- vence_en + 1 dia de gracia, la API se bloquea (ver middleware/suscripcionActiva.js).
-- Los comercios que ya existen arrancan con 10 dias de prueba desde hoy.
ALTER TABLE comercios ADD COLUMN vence_en DATETIME NULL;
UPDATE comercios SET vence_en = NOW() + INTERVAL 10 DAY WHERE vence_en IS NULL;
ALTER TABLE comercios MODIFY vence_en DATETIME NOT NULL;

-- Un registro por pago aprobado. mp_payment_id es UNIQUE para que el mismo
-- pago (webhook repetido + vuelta del checkout) no sume dos meses.
CREATE TABLE IF NOT EXISTS pagos_suscripcion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comercio_id INT NOT NULL,
  mp_payment_id VARCHAR(50) NOT NULL UNIQUE,
  monto NUMERIC(12, 2) NOT NULL,
  vence_hasta DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comercio_id) REFERENCES comercios(id),
  INDEX idx_pagos_suscripcion_comercio (comercio_id, creado_en)
);
