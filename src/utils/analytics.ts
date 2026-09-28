// ============================================================
// Google Analytics 4 — carga diferida y solo en producción
//
// · Se activa con VITE_GA_ID (ej. G-XXXXXXXXXX) en .env. Sin esa variable,
//   o en `npm run dev`, no se carga nada.
// · La web es una SPA (React Router). Las vistas de página las cuenta la
//   "Medición mejorada" del flujo de GA4 (cambios de página según el
//   historial del navegador), activada en el flujo "TELCOM". Por eso aquí NO
//   se envían page_view a mano: se contarían doble. App.tsx llama a
//   registrarVista() solo para cargar gtag en la primera ruta pública.
// · NO se mide ni se carga en el kiosko de asistencia, el panel admin ni las
//   evaluaciones: son pantallas internas y el kiosko debe quedar liviano
//   (ver docs/KIOSKO_ASISTENCIA.md).
// Detalle en docs/ANALYTICS_SEO.md
// ============================================================

const GA_ID = (import.meta.env.VITE_GA_ID || '').trim()
const RUTAS_INTERNAS = /^\/(admin|asistencia|evaluacion)(\/|$)/

type Gtag = (...args: unknown[]) => void
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

let cargado = false

function activo(): boolean {
  return import.meta.env.PROD && /^G-[A-Z0-9]+$/i.test(GA_ID)
}

function cargar() {
  if (cargado) return
  cargado = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // gtag.js exige recibir el objeto `arguments`, no un arreglo
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  // La primera vista la envía config; las siguientes, la medición mejorada
  window.gtag('config', GA_ID)

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`
  document.head.appendChild(script)

  escucharEnlacesDeContacto()
}

/** Carga GA en la primera ruta pública (llamar en cada cambio de ruta). */
export function registrarVista(ruta: string) {
  if (!activo() || RUTAS_INTERNAS.test(ruta)) return
  cargar()
}

/** Evento personalizado (formularios, clics importantes). Nunca enviar datos personales. */
export function registrarEvento(nombre: string, parametros: Record<string, string | number> = {}) {
  if (!activo() || !cargado || RUTAS_INTERNAS.test(window.location.pathname)) return
  window.gtag!('event', nombre, parametros)
}

// Clics a WhatsApp, teléfono y correo en cualquier parte de la web pública
function escucharEnlacesDeContacto() {
  document.addEventListener('click', (e) => {
    const enlace = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!enlace) return
    const href = enlace.getAttribute('href') || ''
    let canal = ''
    if (/wa\.me|api\.whatsapp\.com|whatsapp:/i.test(href)) canal = 'whatsapp'
    else if (href.startsWith('tel:')) canal = 'telefono'
    else if (href.startsWith('mailto:')) canal = 'correo'
    if (canal) registrarEvento('clic_contacto', { canal })
  }, { capture: true })
}
