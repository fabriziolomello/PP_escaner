const nodemailer = require('nodemailer');

// Envio de emails por SMTP (en produccion, la casilla de Hostinger).
// Sin SMTP_HOST (desarrollo local) no se manda nada: el email se muestra en
// la consola, con el link incluido, para poder probar el flujo igual.
const transporte = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Plantilla comun: un parrafo de saludo, el cuerpo, un boton y el link en
// texto por si el cliente de correo no muestra el boton.
function armarHtml({ titulo, parrafos, boton, link, pie }) {
  const cuerpo = parrafos.map((p) => `<p style="margin:0 0 16px;line-height:1.5">${p}</p>`).join('');
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
    <h1 style="margin:0 0 20px;font-size:22px">${titulo}</h1>
    ${cuerpo}
    <p style="margin:24px 0">
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#2f5fb5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold">${boton}</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#71717a">Si el botón no funciona, copiá este link en el navegador:</p>
    <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${link}" style="color:#2f5fb5">${link}</a></p>
    <p style="margin:0;font-size:13px;color:#71717a">${pie}</p>
  </div>
</body></html>`;
}

async function enviar({ para, asunto, html, texto }) {
  if (!transporte) {
    console.log(`[email sin SMTP] Para: ${para} | Asunto: ${asunto}\n${texto}`);
    return;
  }
  await transporte.sendMail({
    from: `"Bipeo" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: para,
    subject: asunto,
    html,
    text: texto,
  });
}

function enviarVerificacion({ para, nombre, comercio, link }) {
  const asunto = '¡Gracias por registrarte en Bipeo! Confirmá tu email';
  const html = armarHtml({
    titulo: `¡Gracias por sumarte, ${escaparHtml(nombre)}!`,
    parrafos: [
      `Ya creamos <strong>${escaparHtml(comercio)}</strong> en Bipeo. Gracias por confiar en nosotros para manejar las ventas, el stock y la caja de tu comercio.`,
      'Para empezar a usarlo, confirmá tu email tocando el botón:',
    ],
    boton: 'Confirmar mi email',
    link,
    pie: 'El link vence en 24 horas. Si no creaste esta cuenta, ignorá este email.',
  });
  const texto = `¡Gracias por sumarte, ${nombre}!\n\nYa creamos ${comercio} en Bipeo. Para empezar a usarlo, confirmá tu email entrando a este link:\n${link}\n\nEl link vence en 24 horas. Si no creaste esta cuenta, ignorá este email.`;
  return enviar({ para, asunto, html, texto });
}

function enviarRecuperacion({ para, nombre, link }) {
  const asunto = 'Recuperar tu contraseña de Bipeo';
  const html = armarHtml({
    titulo: 'Recuperar contraseña',
    parrafos: [
      `Hola ${escaparHtml(nombre)}, recibimos un pedido para cambiar la contraseña de tu cuenta.`,
      'Tocá el botón para elegir una contraseña nueva:',
    ],
    boton: 'Elegir contraseña nueva',
    link,
    pie: 'El link vence en 1 hora y se puede usar una sola vez. Si no lo pediste, ignorá este email: tu contraseña no cambia.',
  });
  const texto = `Hola ${nombre}, recibimos un pedido para cambiar la contraseña de tu cuenta de Bipeo.\n\nElegí una contraseña nueva entrando a este link:\n${link}\n\nEl link vence en 1 hora. Si no lo pediste, ignorá este email.`;
  return enviar({ para, asunto, html, texto });
}

module.exports = { enviarVerificacion, enviarRecuperacion };
