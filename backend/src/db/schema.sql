-- Esquema de base de datos del proyecto Escaner
-- Ejecutar una vez contra la base de datos vacia (ej: psql -d escaner -f src/db/schema.sql)

CREATE TABLE IF NOT EXISTS comercios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'empleado')),
  comercio_id INTEGER NOT NULL REFERENCES comercios(id),
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  codigo_barras VARCHAR(100) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  precio NUMERIC(12, 2) NOT NULL,
  foto_url TEXT,
  comercio_id INTEGER NOT NULL REFERENCES comercios(id),
  creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- codigo_barras no es unico (puede haber duplicados por errores de carga),
-- pero se busca siempre dentro de un comercio -> indice compuesto.
CREATE INDEX IF NOT EXISTS idx_productos_comercio_codigo
  ON productos (comercio_id, codigo_barras);
