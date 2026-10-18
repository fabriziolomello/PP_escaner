-- El codigo de barras pasa a ser opcional: hay productos que no tienen.
-- Para bases creadas antes de esta fase (las nuevas ya lo traen en schema.sql):
--   mysql -u root -p escaner < src/db/migrations/006_codigo_barras_opcional.sql

ALTER TABLE productos MODIFY codigo_barras VARCHAR(100) NULL;
