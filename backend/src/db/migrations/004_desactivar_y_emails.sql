-- Desactivar empleados y productos, y emails en minusculas.
-- Para bases creadas antes de esta fase (las nuevas ya lo traen en schema.sql):
--   mysql -u root -p escaner < src/db/migrations/004_desactivar_y_emails.sql

-- Desactivar en vez de borrar: empleados y productos tienen ventas asociadas.
-- Un empleado desactivado no puede entrar (ni seguir usando una sesion abierta);
-- un producto desactivado no aparece al buscar/escanear y no se puede vender.
ALTER TABLE usuarios ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE productos ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true;

-- El login y el registro ahora guardan y buscan el email en minusculas.
UPDATE usuarios SET email = LOWER(TRIM(email));
