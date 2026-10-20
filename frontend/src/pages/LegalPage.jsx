import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './LegalPage.css'

// Páginas legales públicas: Términos, Privacidad, Arrepentimiento y Baja.
// Si cambian los Términos o la Privacidad, actualizar ACTUALIZACION y
// VERSION_TERMINOS en backend/src/controllers/auth.controller.js (queda
// guardada en cada registro como prueba de qué versión se aceptó).

const ACTUALIZACION = '20 de octubre de 2026'
const TITULAR = 'Fabrizio Gonzalo Lomello'
const EMAIL = 'contacto@bipeo.com.ar'

function mailto(asunto, cuerpo) {
  return `mailto:${EMAIL}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
}

function Email() {
  return <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
}

function LegalLayout({ titulo, children }) {
  // Se llega desde el pie de la landing (o de otra página legal) y el router
  // conserva el scroll: sin esto el texto se abriría por el final.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [titulo])

  return (
    <div className="legal">
      <header className="legal-nav">
        <div className="legal-wrap legal-nav__inner">
          <Link className="legal-nav__logo" to="/">
            Bipeo
          </Link>
          <Link className="legal-nav__volver" to="/">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="legal-wrap legal-content">
        <h1>{titulo}</h1>
        <p className="legal-content__fecha">Última actualización: {ACTUALIZACION}</p>
        {children}
      </main>

      <LegalFooter />
    </div>
  )
}

// Links a las páginas legales; también lo usan la landing y Mi cuenta.
export function LegalLinks({ className = '' }) {
  return (
    <nav className={`legal-links ${className}`} aria-label="Información legal">
      <Link to="/terminos">Términos y condiciones</Link>
      <Link to="/privacidad">Privacidad</Link>
      <Link to="/arrepentimiento">Botón de arrepentimiento</Link>
      <Link to="/baja">Dar de baja</Link>
    </nav>
  )
}

function LegalFooter() {
  return (
    <footer className="legal-footer">
      <div className="legal-wrap">
        <LegalLinks />
        <p>
          Bipeo es un servicio de {TITULAR} · <Email />
        </p>
      </div>
    </footer>
  )
}

export function TerminosPage() {
  return (
    <LegalLayout titulo="Términos y condiciones">
      <p>
        Estos términos regulan el uso de Bipeo (bipeo.com.ar), un sistema online de ventas, stock y caja para
        comercios, prestado por {TITULAR} (en adelante, “Bipeo” o “nosotros”). Para cualquier consulta podés
        escribirnos a <Email />.
      </p>
      <p>
        Al crear una cuenta aceptás estos términos y la <Link to="/privacidad">Política de privacidad</Link>. Si no
        estás de acuerdo, no uses el servicio.
      </p>

      <h2>1. Quién puede usar Bipeo</h2>
      <p>
        Para registrarte tenés que ser mayor de 18 años y tener capacidad legal para contratar. Si registrás un
        comercio, declarás que tenés autorización para actuar en su nombre. La persona que registra el comercio es
        su administrador y responde por el uso que se haga de la cuenta, incluido el de los empleados que cree.
      </p>

      <h2>2. Qué es y qué no es Bipeo</h2>
      <p>
        Bipeo es una herramienta de gestión: permite registrar productos, ventas, movimientos de stock, aperturas y
        cierres de caja y usuarios para empleados.
      </p>
      <ul>
        <li>
          <strong>No es un sistema de facturación ni un controlador fiscal.</strong> Los tickets que genera no son
          válidos como factura. Las obligaciones fiscales, impositivas, laborales y comerciales de tu comercio
          (facturar, registrar ventas ante los organismos que correspondan, etc.) son exclusivamente tuyas.
        </li>
        <li>
          Los números que muestra Bipeo (stock, totales de caja, diferencias, ventas) dependen de los datos que
          cargás vos y tus empleados. Te recomendamos controlarlos periódicamente con la realidad de tu comercio.
        </li>
        <li>
          Bipeo no procesa los cobros a tus clientes: registra el medio de pago que indicás, pero el dinero no pasa
          por nosotros.
        </li>
      </ul>

      <h2>3. Tu cuenta</h2>
      <p>
        Sos responsable de mantener la confidencialidad de tu contraseña y la de tus empleados, y de todo lo que se
        haga con esas cuentas. Si sospechás que alguien accedió sin permiso, cambiá la contraseña y escribinos. Los
        datos que cargues tienen que ser verdaderos y tenés que tener derecho a usarlos (por ejemplo, las fotos de
        productos).
      </p>

      <h2>4. Prueba gratis, precio y pagos</h2>
      <ul>
        <li>Cada comercio nuevo tiene un período de prueba gratis, cuya duración se informa en el sitio.</li>
        <li>
          Terminada la prueba, el servicio se paga por mes, por adelantado, a través de Mercado Pago. El precio
          vigente es el que se publica en el sitio al momento de pagar.
        </li>
        <li>
          La renovación no es automática: cada mes elegís si pagás. Te avisamos dentro del sistema cuando se acerca
          el vencimiento. Vencido el mes, hay un día de gracia; después el acceso queda limitado a la pantalla de
          pago hasta que se abone. Tus datos no se borran por eso (ver punto 8).
        </li>
        <li>
          Podemos cambiar el precio avisando con al menos 30 días de anticipación por email o dentro del sistema. El
          cambio aplica a los meses que pagues después de esa fecha, nunca a uno ya pagado.
        </li>
        <li>
          Los meses pagados no se reembolsan, ni total ni parcialmente, salvo en el caso del punto 5 o cuando la ley
          lo exija.
        </li>
        <li>
          Cada plan tiene límites de uso (por ejemplo, cantidad de productos y empleados), que se informan en el
          sitio.
        </li>
      </ul>

      <h2>5. Arrepentimiento</h2>
      <p>
        Podés revocar la contratación dentro de los 10 días corridos desde que pagaste por primera vez, sin
        necesidad de dar explicaciones, y te devolvemos lo pagado por el mismo medio. Los pagos de los meses
        siguientes son renovaciones del mismo servicio y no dan lugar a un nuevo arrepentimiento: para dejar de
        usarlo, ver el punto 6. Para revocar la contratación usá el{' '}
        <Link to="/arrepentimiento">botón de arrepentimiento</Link>.
      </p>

      <h2>6. Baja</h2>
      <p>
        Podés dejar de usar Bipeo cuando quieras: alcanza con no pagar el mes siguiente. Si además querés que
        eliminemos tu cuenta y tus datos, usá la opción <Link to="/baja">Dar de baja</Link>.
      </p>

      <h2>7. Uso aceptable</h2>
      <p>No está permitido:</p>
      <ul>
        <li>usar Bipeo para actividades ilegales o para registrar operaciones ilícitas;</li>
        <li>intentar acceder a cuentas o datos de otros comercios, o vulnerar la seguridad del sistema;</li>
        <li>sobrecargar el servicio de forma intencional, o automatizar su uso por medios no previstos;</li>
        <li>revender, sublicenciar o copiar el servicio;</li>
        <li>cargar contenido que infrinja derechos de terceros.</li>
      </ul>
      <p>
        Si detectamos un uso así, podemos suspender o cerrar la cuenta. Salvo que sea urgente (por ejemplo, para
        proteger el sistema o a otros usuarios), te avisamos antes por email.
      </p>

      <h2>8. Tus datos</h2>
      <p>
        Los datos que cargás en Bipeo (productos, ventas, stock, caja, empleados) son de tu comercio. Nosotros los
        guardamos y procesamos solo para prestarte el servicio, según la{' '}
        <Link to="/privacidad">Política de privacidad</Link>.
      </p>
      <p>
        Si la suscripción queda vencida, conservamos los datos por al menos 12 meses para que puedas volver. Pasado
        ese plazo podemos eliminarlos, avisándote antes por email. Te recomendamos exportar periódicamente la
        información que te resulte importante con las herramientas de exportación disponibles.
      </p>

      <h2>9. Disponibilidad del servicio</h2>
      <p>
        Hacemos lo posible para que Bipeo funcione bien y sin interrupciones, pero no podemos garantizarlo. El
        servicio depende de internet y de proveedores externos (hosting, Mercado Pago, almacenamiento de imágenes),
        y puede tener interrupciones por mantenimiento, fallas o causas ajenas a nosotros. Bipeo se ofrece “tal cual
        está” y puede cambiar: podemos agregar, modificar o quitar funciones.
      </p>

      <h2>10. Responsabilidad</h2>
      <p>En la máxima medida permitida por la ley aplicable:</p>
      <ul>
        <li>
          no somos responsables por lucro cesante, pérdida de ventas, de clientes o de oportunidades de negocio, ni
          por daños indirectos derivados del uso o de la imposibilidad de usar Bipeo;
        </li>
        <li>
          no somos responsables por errores en stock, caja, precios o ventas originados en datos cargados por vos o
          por tus empleados, ni por decisiones tomadas en base a esa información;
        </li>
        <li>
          no somos responsables por el uso que hagan los empleados que crees, ni por accesos con credenciales que no
          hayas protegido;
        </li>
        <li>
          en cualquier caso, nuestra responsabilidad total frente a vos se limita al monto que hayas pagado por el
          servicio en los 3 meses anteriores al hecho que dio origen al reclamo.
        </li>
      </ul>
      <p>
        Nada de lo anterior limita los derechos que te correspondan como consumidor según la Ley 24.240 de Defensa
        del Consumidor, si te resulta aplicable.
      </p>

      <h2>11. Propiedad intelectual</h2>
      <p>
        El software, el diseño, la marca Bipeo y los contenidos del sitio nos pertenecen. Te damos una licencia de
        uso personal, no exclusiva e intransferible, mientras tengas una cuenta activa. Los datos que cargás siguen
        siendo tuyos.
      </p>

      <h2>12. Cambios en estos términos</h2>
      <p>
        Podemos actualizar estos términos. Si el cambio es importante, te avisamos por email o dentro del sistema
        con al menos 15 días de anticipación. Si seguís usando Bipeo después de esa fecha, se entiende que aceptás
        la nueva versión; si no estás de acuerdo, podés darte de baja.
      </p>

      <h2>13. Ley aplicable y reclamos</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Antes de iniciar cualquier reclamo, te
        pedimos que nos escribas a <Email /> para intentar resolverlo. Cualquier controversia se someterá a los
        tribunales ordinarios competentes según la ley argentina.
      </p>
    </LegalLayout>
  )
}

export function PrivacidadPage() {
  return (
    <LegalLayout titulo="Política de privacidad">
      <p>
        En esta política explicamos qué datos personales tratamos en Bipeo (bipeo.com.ar), para qué y qué derechos
        tenés, de acuerdo con la Ley 25.326 de Protección de Datos Personales.
      </p>

      <h2>1. Responsable</h2>
      <p>
        El responsable de los datos es {TITULAR}. Para cualquier consulta o para ejercer tus derechos escribinos a{' '}
        <Email />.
      </p>

      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>De la cuenta:</strong> nombre y email del administrador, nombre del comercio y contraseña (que se
          guarda cifrada: nadie, ni siquiera nosotros, puede verla).
        </li>
        <li>
          <strong>De los empleados:</strong> nombre, email o usuario y contraseña cifrada, que carga el
          administrador del comercio.
        </li>
        <li>
          <strong>De la operación del comercio:</strong> productos, precios, fotos, ventas, movimientos de stock y de
          caja, y qué usuario hizo cada operación.
        </li>
        <li>
          <strong>De los pagos de la suscripción:</strong> los procesa Mercado Pago. Nosotros solo recibimos el
          número de operación, el monto, la fecha y el estado del pago. Nunca vemos ni guardamos datos de tarjetas.
        </li>
        <li>
          <strong>Técnicos:</strong> la dirección IP desde la que se usa el sistema, en forma temporal, para
          proteger las cuentas (por ejemplo, para bloquear intentos repetidos de adivinar contraseñas), y los
          registros técnicos que genera el servidor.
        </li>
      </ul>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Prestar el servicio: que puedas ingresar, registrar ventas, controlar stock y caja.</li>
        <li>Mandarte emails necesarios: confirmación de cuenta, recuperación de contraseña y avisos del servicio.</li>
        <li>Cobrar la suscripción y llevar el registro de los pagos.</li>
        <li>Mantener la seguridad del sistema y prevenir usos indebidos.</li>
      </ul>
      <p>
        No vendemos ni alquilamos tus datos, no los usamos para publicidad y no los compartimos con nadie fuera de lo
        que se detalla en el punto 5.
      </p>

      <h2>4. Datos que carga tu comercio</h2>
      <p>
        Sobre los datos que el comercio carga en el sistema (por ejemplo, los de sus empleados), el comercio es el
        responsable y Bipeo actúa como encargado del tratamiento: los procesa solo para prestar el servicio,
        siguiendo las instrucciones del comercio, y no los usa para ningún otro fin. El administrador del comercio
        es quien debe informar a sus empleados y contar con su consentimiento cuando corresponda.
      </p>

      <h2>5. Con quién los compartimos</h2>
      <p>Usamos proveedores que tratan datos por cuenta nuestra, solo en lo necesario para su función:</p>
      <ul>
        <li>
          <strong>Hostinger:</strong> alojamiento del sitio, de la base de datos y del correo electrónico.
        </li>
        <li>
          <strong>Mercado Pago:</strong> procesamiento de los pagos de la suscripción, bajo sus propios términos y
          políticas.
        </li>
        <li>
          <strong>Cloudinary:</strong> almacenamiento de las fotos de productos.
        </li>
        <li>
          <strong>Google Fonts:</strong> tipografías del sitio. Al cargar la página, tu navegador se conecta a
          servidores de Google, que reciben tu dirección IP.
        </li>
      </ul>
      <p>
        Algunos de estos proveedores tienen servidores fuera de la Argentina (por ejemplo, en Estados Unidos), por lo
        que los datos pueden transferirse a otros países. Al usar Bipeo prestás tu consentimiento para esa
        transferencia. También podemos revelar datos si una autoridad competente lo requiere conforme a la ley.
      </p>

      <h2>6. Cookies y almacenamiento en el navegador</h2>
      <p>
        No usamos cookies de publicidad ni de seguimiento. Guardamos en tu navegador solo lo necesario para que el
        sistema funcione: la sesión iniciada y la venta en curso. La sesión se borra al cerrarla.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas razonables para proteger los datos: conexión cifrada (HTTPS), contraseñas cifradas,
        separación de los datos de cada comercio y límites a los intentos de acceso. Ningún sistema es
        completamente infalible; si detectamos un incidente que afecte tus datos, te vamos a avisar.
      </p>

      <h2>8. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras tengas una cuenta, y hasta 12 meses después de que la suscripción quede vencida (ver los{' '}
        <Link to="/terminos">Términos</Link>), salvo que pidas antes la eliminación. Los registros de pagos pueden
        conservarse por más tiempo si la ley lo exige.
      </p>

      <h2>9. Tus derechos</h2>
      <p>
        Podés pedir acceder a tus datos, rectificarlos, actualizarlos o eliminarlos escribiendo a <Email /> desde el
        email de tu cuenta. Respondemos los pedidos de acceso dentro de los 10 días corridos y los de rectificación o
        eliminación dentro de los 5 días hábiles.
      </p>
      <p className="legal-content__aviso">
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
        gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto
        conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326. La Agencia de Acceso a la
        Información Pública, en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de atender
        las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las
        normas vigentes en materia de protección de datos personales.
      </p>

      <h2>10. Menores</h2>
      <p>Bipeo está pensado para comercios y no está dirigido a menores de 18 años.</p>

      <h2>11. Cambios en esta política</h2>
      <p>
        Si cambiamos esta política de forma importante, te avisamos por email o dentro del sistema antes de que el
        cambio entre en vigencia.
      </p>
    </LegalLayout>
  )
}

export function ArrepentimientoPage() {
  return (
    <LegalLayout titulo="Botón de arrepentimiento">
      <p>
        Podés revocar la contratación de Bipeo dentro de los <strong>10 días corridos</strong> desde tu primer pago,
        sin dar explicaciones y sin ningún costo. Te devolvemos el total pagado por el mismo medio de pago.
      </p>
      <p>
        Los pagos de los meses siguientes son renovaciones del mismo servicio y no están alcanzados. Si ya no
        querés seguir, alcanza con no renovar: ver <Link to="/baja">Dar de baja</Link>.
      </p>
      <p>
        Para hacerlo, tocá el botón y mandanos el email (con los datos ya completos) desde el email de tu cuenta, o
        escribinos a <Email />. Te respondemos dentro de las 24 horas con un número de trámite.
      </p>
      <a
        className="legal-boton"
        href={mailto(
          'Arrepentimiento de la contratación',
          'Hola, quiero revocar la contratación de Bipeo.\n\nNombre del comercio:\nEmail de la cuenta:\n'
        )}
      >
        Quiero arrepentirme
      </a>
      <p className="legal-content__nota">
        Derecho previsto en el artículo 34 de la Ley 24.240 de Defensa del Consumidor y en la Resolución 424/2020 de
        la Secretaría de Comercio Interior.
      </p>
    </LegalLayout>
  )
}

export function BajaPage() {
  return (
    <LegalLayout titulo="Dar de baja">
      <p>
        La suscripción a Bipeo <strong>no se renueva sola</strong>: si no querés seguir, alcanza con no pagar el mes
        siguiente. No te vamos a cobrar nada más.
      </p>
      <p>
        Si además querés que demos de baja tu cuenta y eliminemos los datos de tu comercio, tocá el botón y mandanos
        el email desde el email de tu cuenta, o escribinos a <Email />. Te confirmamos la baja por email. Antes de
        pedirla, exportá la información que quieras conservar: una vez eliminada no se puede recuperar.
      </p>
      <a
        className="legal-boton"
        href={mailto(
          'Baja de la cuenta',
          'Hola, quiero dar de baja mi cuenta de Bipeo y que se eliminen los datos de mi comercio.\n\nNombre del comercio:\nEmail de la cuenta:\n'
        )}
      >
        Pedir la baja
      </a>
      <p className="legal-content__nota">
        Si pagaste por primera vez hace menos de 10 días, también podés usar el{' '}
        <Link to="/arrepentimiento">botón de arrepentimiento</Link> y te devolvemos lo pagado.
      </p>
    </LegalLayout>
  )
}
