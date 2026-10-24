-- Precio editable y descuentos en el carrito.
-- venta_items.precio_unitario pasa a ser el precio cobrado (el vendedor lo
-- puede cambiar); precio_lista guarda el del catalogo en ese momento para ver
-- si se modifico (NULL en ventas de antes de esta fase). subtotal ya queda
-- con el descuento del item aplicado.
-- ventas.total ya queda con el descuento de la venta aplicado; descuento es
-- el monto descontado y descuento_porcentaje el % elegido (NULL si fue por monto).
-- Para bases creadas antes de esta fase (las nuevas ya lo traen en schema.sql):
--   mysql -u root -p escaner < src/db/migrations/009_descuentos.sql

ALTER TABLE venta_items
  ADD COLUMN precio_lista NUMERIC(12, 2) NULL,
  ADD COLUMN descuento_porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE ventas
  ADD COLUMN descuento NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN descuento_porcentaje NUMERIC(5, 2) NULL;
