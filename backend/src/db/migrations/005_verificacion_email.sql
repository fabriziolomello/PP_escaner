-- Verificacion de email al registrarse y recuperacion de contraseña.
-- Para bases creadas antes de esta fase (las nuevas ya lo traen en schema.sql):
--   mysql -u root -p escaner < src/db/migrations/005_verificacion_email.sql

-- Un admin recien registrado no puede entrar hasta confirmar su email.
-- Los usuarios que ya existen quedan como verificados.
ALTER TABLE usuarios ADD COLUMN email_verificado BOOLEAN NOT NULL DEFAULT false;
UPDATE usuarios SET email_verificado = true;

-- Links de un solo uso que se mandan por email. Se guarda el hash SHA-256
-- del token (no el token): si se filtra la base, los links no sirven.
CREATE TABLE IF NOT EXISTS tokens_email (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('verificacion', 'recuperacion')),
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_en DATETIME NOT NULL,
  usado_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_tokens_email_usuario (usuario_id, tipo, creado_en)
);
