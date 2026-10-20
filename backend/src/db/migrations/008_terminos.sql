-- Guarda que version de los Terminos y la Privacidad acepto cada admin al
-- registrarse, y cuando (ver VERSION_TERMINOS en auth.controller.js).
-- Para bases creadas antes de esta fase (las nuevas ya lo traen en schema.sql):
--   mysql -u root -p escaner < src/db/migrations/008_terminos.sql

ALTER TABLE usuarios
  ADD COLUMN terminos_version VARCHAR(20) NULL,
  ADD COLUMN terminos_aceptados_en DATETIME NULL;
