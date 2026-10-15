import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { obtenerPlan } from '../api/plan'
import { BoxIcon, CartIcon, CashIcon, CheckIcon, PeopleIcon, PhoneIcon, ScanIcon } from '../components/icons'
import './LandingPage.css'

// Valores por defecto mientras carga (o si falla) /suscripcion/plan; los
// reales salen del backend, que es el mismo lugar que cobra y controla.
const PLAN_INICIAL = { precio: null, dias_prueba: 10, limite_productos: 1000, limite_empleados: 3 }

const FUNCIONES = [
  { Icono: CartIcon, titulo: 'Ventas', texto: 'Efectivo, MercadoPago o tarjeta. Todo queda registrado.' },
  { Icono: BoxIcon, titulo: 'Stock al día', texto: 'Cada venta descuenta sola. Anotá lo que entra y lo que se rompe.' },
  { Icono: CashIcon, titulo: 'Caja', texto: 'Abrís con un monto, cerrás y ves la diferencia al instante.' },
  { Icono: PeopleIcon, titulo: 'Empleados', texto: 'Cada uno con su usuario. Vos ves todo, ellos solo lo que necesitan.' },
  { Icono: ScanIcon, titulo: 'Consulta de precios', texto: 'Escaneás y ves el precio. Ideal para el mostrador.' },
  { Icono: PhoneIcon, titulo: 'Desde cualquier lado', texto: 'Funciona en el celular, la tablet o la compu, sin instalar nada.' },
]

const RUBROS = ['Kioscos', 'Almacenes', 'Despensas', 'Librerías', 'Ferreterías', 'Dietéticas', 'Perfumerías', 'Bazares']

function formatearMonto(valor) {
  return `$${Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}

// Portada pública de "/" cuando no hay sesión (ver App.jsx).
export default function LandingPage() {
  const [plan, setPlan] = useState(PLAN_INICIAL)

  useEffect(() => {
    obtenerPlan()
      .then(setPlan)
      .catch(() => {})
  }, [])

  const faq = [
    {
      pregunta: '¿Necesito un lector de códigos?',
      respuesta: 'No, alcanza con la cámara del celular. Si tenés un lector, también funciona.',
    },
    {
      pregunta: `¿Qué pasa cuando terminan los ${plan.dias_prueba} días?`,
      respuesta: 'Pagás el mes con MercadoPago y seguís usando todo como venías. Tus datos no se pierden.',
    },
    {
      pregunta: '¿Puedo cargar mis productos desde Excel?',
      respuesta: 'Sí, importás tu lista completa en un paso.',
    },
    { pregunta: '¿Necesito internet?', respuesta: 'Sí, Bipeo funciona online.' },
  ]

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-wrap landing-nav__inner">
          <Link className="landing-logo" to="/">
            <span className="landing-logo__mark">
              <span />
            </span>
            Bipeo
          </Link>
          <div className="landing-nav__actions">
            <Link className="landing-btn landing-btn--ghost" to="/login">
              <span className="landing-largo">Iniciar sesión</span>
              <span className="landing-corto">Ingresar</span>
            </Link>
            <Link className="landing-btn landing-btn--primary" to="/registro">
              <span className="landing-largo">Probalo gratis</span>
              <span className="landing-corto">Probar gratis</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <div className="landing-wrap landing-hero">
          <div>
            <p className="landing-hero__eyebrow">Para comercios que venden por mostrador</p>
            <h1 className="landing-hero__title">
              Bipeo, ventas y stock <em>para tu negocio</em>
            </h1>
            <p className="landing-hero__lead">
              Escaneás el código, cobrás y listo. Tu caja y tu stock se actualizan solos.
            </p>
            <div className="landing-hero__cta">
              <Link className="landing-btn landing-btn--primary landing-btn--lg" to="/registro">
                Probalo gratis {plan.dias_prueba} días
              </Link>
              <span className="landing-hero__note">Sin tarjeta. Desde el celular o la compu.</span>
            </div>
          </div>

          <div className="landing-phone" role="img" aria-label="Ejemplo de una venta en Bipeo">
            <div className="landing-phone__screen">
              <div className="landing-phone__bar">
                <span>Vender</span>
                <span>Caja abierta</span>
              </div>
              <div className="landing-scan">
                <div className="landing-scan__code">
                  <div className="landing-barcode" />
                  <span className="landing-scan__digits">7790895000997</span>
                </div>
                <div className="landing-scan__line" />
              </div>
              <span className="landing-bip">Bip · Agregado al carrito</span>
              <div className="landing-ticket">
                <div className="landing-ticket__row">
                  <span>Yerba 1 kg</span>
                  <span>$4.850</span>
                </div>
                <div className="landing-ticket__row">
                  <span>Alfajor triple ×2</span>
                  <span>$2.400</span>
                </div>
                <div className="landing-ticket__row landing-ticket__row--nuevo">
                  <span>Gaseosa 1,5 L</span>
                  <span>$2.300</span>
                </div>
                <div className="landing-ticket__row landing-ticket__total">
                  <span>Total</span>
                  <span>$9.550</span>
                </div>
              </div>
              <div className="landing-phone__btn">Cobrar en efectivo</div>
            </div>
          </div>
        </div>

        <section className="landing-block" aria-labelledby="landing-como">
          <div className="landing-wrap">
            <div className="landing-block__head">
              <p className="landing-block__eyebrow">Cómo funciona</p>
              <h2 id="landing-como">Empezás a vender el mismo día</h2>
            </div>
            <ol className="landing-steps">
              <li className="landing-step">
                <h3>Cargá tus productos</h3>
                <p>Uno por uno, o todos juntos desde un Excel.</p>
              </li>
              <li className="landing-step">
                <h3>Escaneá y vendé</h3>
                <p>Con la cámara del celular o un lector de códigos.</p>
              </li>
              <li className="landing-step">
                <h3>Cerrá la caja</h3>
                <p>Bipeo te dice cuánto tiene que haber y si te falta o te sobra.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="landing-block" aria-labelledby="landing-funciones">
          <div className="landing-wrap">
            <div className="landing-block__head">
              <p className="landing-block__eyebrow">Funciones</p>
              <h2 id="landing-funciones">Todo lo que pasa en el mostrador, en un solo lugar</h2>
            </div>
            <div className="landing-features">
              {FUNCIONES.map(({ Icono, titulo, texto }) => (
                <div className="landing-feature" key={titulo}>
                  <div className="landing-feature__icon">
                    <Icono />
                  </div>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-block" aria-labelledby="landing-quien">
          <div className="landing-wrap">
            <div className="landing-block__head">
              <p className="landing-block__eyebrow">Para quién es</p>
              <h2 id="landing-quien">Pensado para el comercio de barrio</h2>
              <p className="landing-block__sub">Y para cualquier negocio que venda por mostrador.</p>
            </div>
            <div className="landing-rubros">
              {RUBROS.map((rubro) => (
                <span className="landing-rubro" key={rubro}>
                  {rubro}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-block" aria-labelledby="landing-precio">
          <div className="landing-wrap">
            <div className="landing-block__head">
              <p className="landing-block__eyebrow">Precio</p>
              <h2 id="landing-precio">Un solo plan, sin sorpresas</h2>
            </div>
            <div className="landing-price">
              <p className="landing-price__name">Plan único</p>
              <p className="landing-price__amount">
                <strong>{plan.precio ? formatearMonto(plan.precio) : '—'}</strong>
                <span>/ mes</span>
              </p>
              <ul>
                <li>
                  <CheckIcon />
                  Todas las funciones
                </li>
                <li>
                  <CheckIcon />
                  Hasta {plan.limite_productos} productos y {plan.limite_empleados} empleados
                </li>
                <li>
                  <CheckIcon />
                  {plan.dias_prueba} días gratis para probar
                </li>
              </ul>
              <p className="landing-price__note">
                Pagás mes a mes con MercadoPago. Sin débito automático: pagás solo si querés seguir.
              </p>
              <Link className="landing-btn landing-btn--primary landing-btn--lg" to="/registro">
                Empezá tu prueba gratis
              </Link>
            </div>
          </div>
        </section>

        <section className="landing-block" aria-labelledby="landing-faq">
          <div className="landing-wrap">
            <div className="landing-block__head">
              <p className="landing-block__eyebrow">Preguntas frecuentes</p>
              <h2 id="landing-faq">Lo que más nos preguntan</h2>
            </div>
            <div className="landing-faq">
              {faq.map(({ pregunta, respuesta }) => (
                <details key={pregunta}>
                  <summary>{pregunta}</summary>
                  <p>{respuesta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-block">
          <div className="landing-wrap landing-closing">
            <h2>Empezá a vender con Bipeo hoy</h2>
            <Link className="landing-btn landing-btn--primary landing-btn--lg" to="/registro">
              Probalo gratis
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap landing-footer__inner">
          <span>
            Bipeo es un producto de <strong>Pavía</strong>
          </span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  )
}
