// Limita cuantos pedidos puede hacer una IP a una ruta en una ventana de
// tiempo. Sirve para las rutas publicas que mandan emails (registro,
// recuperar contraseña): sin esto, un script podria usar nuestra casilla para
// mandar miles de emails a direcciones ajenas. Vive en memoria, igual que el
// bloqueo de login (ver auth.controller.js): alcanza para un solo proceso.
function limitePedidos({ max, minutos, mensaje }) {
  const pedidos = new Map(); // ip -> { cantidad, reiniciaEn }

  setInterval(() => {
    const ahora = Date.now();
    for (const [ip, registro] of pedidos) {
      if (registro.reiniciaEn <= ahora) pedidos.delete(ip);
    }
  }, 10 * 60000).unref();

  return function (req, res, next) {
    const ahora = Date.now();
    let registro = pedidos.get(req.ip);
    if (!registro || registro.reiniciaEn <= ahora) {
      registro = { cantidad: 0, reiniciaEn: ahora + minutos * 60000 };
      pedidos.set(req.ip, registro);
    }
    registro.cantidad++;
    if (registro.cantidad > max) {
      return res.status(429).json({ error: mensaje || 'Demasiados pedidos. Probá de nuevo en un rato.' });
    }
    next();
  };
}

module.exports = limitePedidos;
