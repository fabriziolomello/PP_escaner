// Limites del plan unico. Solo cuentan los activos: desactivar un producto o
// un empleado libera el lugar, y reactivarlo vuelve a ocuparlo.
const LIMITE_PRODUCTOS = 1000;
const LIMITE_EMPLEADOS = 3;

// db: el pool o la conexion de la transaccion en curso.
async function contarProductosActivos(db, comercio_id) {
  const [rows] = await db.query(
    'SELECT COUNT(*) AS total FROM productos WHERE comercio_id = ? AND activo = TRUE',
    [comercio_id]
  );
  return Number(rows[0].total);
}

async function contarEmpleadosActivos(db, comercio_id) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM usuarios
     WHERE comercio_id = ? AND rol = 'empleado' AND activo = TRUE`,
    [comercio_id]
  );
  return Number(rows[0].total);
}

const MENSAJE_LIMITE_PRODUCTOS = `Llegaste al límite de ${LIMITE_PRODUCTOS} productos activos. Desactivá alguno para cargar otro.`;
const MENSAJE_LIMITE_EMPLEADOS = `Llegaste al límite de ${LIMITE_EMPLEADOS} empleados activos. Desactivá alguno para agregar otro.`;

module.exports = {
  LIMITE_PRODUCTOS,
  LIMITE_EMPLEADOS,
  MENSAJE_LIMITE_PRODUCTOS,
  MENSAJE_LIMITE_EMPLEADOS,
  contarProductosActivos,
  contarEmpleadosActivos,
};
