-- Al cambiar la contraseña se suma 1 a version_sesion y los JWT emitidos con
-- la version anterior dejan de valer (ver middleware/auth.js): si alguien
-- tenia la contraseña robada, pierde la sesion abierta.
-- Para bases creadas antes de esta fase (las nuevas ya lo traen en schema.sql):
--   mysql -u root -p escaner < src/db/migrations/007_version_sesion.sql

ALTER TABLE usuarios ADD COLUMN version_sesion INT NOT NULL DEFAULT 0;
