import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FaTiktok,
  FaFacebookF, FaExternalLinkAlt, FaHardHat, FaNewspaper, FaBriefcase, FaGraduationCap, FaBell,
} from 'react-icons/fa'
import SectionHeader from '../common/SectionHeader'
import { config } from '../../config/env'

declare global {
  interface Window {
    FB?: {
      XFBML: {
        parse: (element?: HTMLElement) => void
      }
    }
  }
}

const CANALES = [
  { icon: <FaHardHat />, titulo: 'Trabajo en campo', detalle: 'Nuestros equipos en acción' },
  { icon: <FaBriefcase />, titulo: 'Empleos', detalle: 'Convocatorias en el sur del Perú' },
  { icon: <FaNewspaper />, titulo: 'Novedades', detalle: 'Energía, construcción y minería' },
  { icon: <FaGraduationCap />, titulo: 'Capacitaciones', detalle: 'Formación de nuestro personal' },
]

// Ancho del plugin dentro del "celular". Facebook acepta 180–500 px; se
// ajusta al ancho real de la pantalla del celular (en móviles es más angosto).
const ANCHO_MAX = 340
const ALTO_FEED = 560

export default function FacebookSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const pantallaRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [ancho, setAncho] = useState(ANCHO_MAX)

  useEffect(() => {
    if (pantallaRef.current) {
      setAncho(Math.max(180, Math.min(ANCHO_MAX, Math.floor(pantallaRef.current.offsetWidth))))
    }

    // Cargar el SDK de Facebook una sola vez
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/es_LA/sdk.js#xfbml=1&version=v18.0'
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      document.body.appendChild(script)
    }

    const checkFB = setInterval(() => {
      if (window.FB && containerRef.current) {
        window.FB.XFBML.parse(containerRef.current)
        setTimeout(() => setIsLoaded(true), 1500)
        clearInterval(checkFB)
      }
    }, 100)

    // Si Facebook no responde (bloqueadores), se quita el indicador de carga
    const timeout = setTimeout(() => {
      setIsLoaded(true)
      clearInterval(checkFB)
    }, 8000)

    return () => {
      clearInterval(checkFB)
      clearTimeout(timeout)
    }
  }, [])

  return (
    <section id="facebook" className="py-16 md:py-24 bg-primary-900/50 relative overflow-hidden">
      {/* Resplandores de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-[8%] w-[28rem] h-[28rem] bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-electric/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <SectionHeader
          id="facebook"
          eyebrow="Novedades"
          title={<>Síguenos en <span className="text-gradient">Facebook</span></>}
          subtitle="Trabajos en campo, convocatorias laborales y novedades de la empresa, primero en nuestras redes: Facebook y TikTok."
        />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          {/* ── Mensaje + canales + botón ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="order-2 lg:order-1"
          >
            <p className="font-mono text-[11px] tracking-[0.3em] text-accent-energy mb-3">◆ NUESTRA PÁGINA OFICIAL</p>
            <h3 className="text-3xl md:text-4xl font-display font-bold text-white leading-tight mb-4">
              Lo que pasa en campo, <span className="text-gradient">lo contamos primero</span>
            </h3>
            <p className="text-primary-200 leading-relaxed mb-8">
              Publicamos ahí nuestras convocatorias antes que en cualquier otro lado. Si buscas trabajo
              en el sur del Perú o quieres ver cómo trabajamos, síguenos y activa las notificaciones.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {CANALES.map((c) => (
                <div
                  key={c.titulo}
                  className="panel-hud group flex items-start gap-3 p-4"
                >
                  <span className="w-10 h-10 shrink-0 flex items-center justify-center border border-accent-electric/30 bg-accent-electric/10 text-accent-electric group-hover:bg-accent-electric group-hover:text-primary-950 transition-colors duration-300">
                    {c.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{c.titulo}</span>
                    <span className="block text-xs text-primary-400 leading-snug">{c.detalle}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-start gap-3">
              <a
                href={config.companyInfo.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hud inline-flex items-center justify-center gap-3 whitespace-nowrap px-7 py-4 bg-gradient-to-r from-blue-600 to-accent-electric text-white font-semibold hover:shadow-lg hover:shadow-accent-electric/30 transition-all"
              >
                <FaFacebookF className="text-lg" />
                Seguir a Ingeniería Telcom
                <FaExternalLinkAlt className="text-xs" />
              </a>
              <a
                href={config.companyInfo.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="placa-acero inline-flex items-center justify-center gap-3 whitespace-nowrap px-6 py-3.5 text-white font-semibold hover:text-accent-energy transition-colors"
              >
                <FaTiktok className="text-lg" />
                Videos en TikTok · @ingeneriatelcom
              </a>
              <span className="inline-flex items-center gap-2 text-xs text-primary-400">
                <FaBell className="text-accent-energy" />
                Activa “Notificaciones” para no perderte las convocatorias
              </span>
            </div>
          </motion.div>

          {/* ── Celular con el feed ── */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: 2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="order-1 lg:order-2 flex justify-center"
          >
            <div className="relative w-full max-w-[380px]">
              {/* Halo */}
              <div aria-hidden="true" className="absolute -inset-6 bg-accent-electric/10 blur-2xl rounded-[3rem]" />

              {/* Cuerpo del celular */}
              <div className="relative rounded-[2.6rem] p-3 bg-gradient-to-b from-primary-700 to-primary-900 border border-accent-electric/40 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),0_0_40px_rgba(0,212,255,0.15)]">
                <div ref={containerRef} className="relative rounded-[2rem] overflow-hidden bg-primary-950">
                  {/* Barra de estado */}
                  <div className="relative flex items-center justify-between px-6 pt-3 pb-2 text-[11px] font-semibold text-white bg-primary-950">
                    <span>9:41</span>
                    <span aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 top-2 w-24 h-6 rounded-full bg-black" />
                    <span className="flex items-center gap-1">
                      <span className="w-3.5 h-2 border border-white/80 rounded-sm" />
                    </span>
                  </div>

                  {/* Cabecera de la app */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1877F2] text-white">
                    <FaFacebookF />
                    <span className="text-sm font-semibold truncate">Ingeniería Telcom EIRL</span>
                    <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      EN VIVO
                    </span>
                  </div>

                  {/* Feed */}
                  <div ref={pantallaRef} className="relative bg-white" style={{ height: `${ALTO_FEED}px` }}>
                    {!isLoaded && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary-950 z-10">
                        <div className="w-12 h-12 rounded-full border-4 border-accent-electric/20 border-t-accent-electric animate-spin mb-4" />
                        <p className="font-mono text-xs tracking-[0.2em] text-primary-300">CARGANDO PUBLICACIONES…</p>
                      </div>
                    )}
                    <div
                      className="fb-page"
                      data-href={config.companyInfo.facebook}
                      data-tabs="timeline"
                      data-width={ancho}
                      data-height={ALTO_FEED}
                      data-small-header="true"
                      data-adapt-container-width="true"
                      data-hide-cover="false"
                      data-show-facepile="false"
                    >
                      <blockquote cite={config.companyInfo.facebook} className="fb-xfbml-parse-ignore">
                        <a href={config.companyInfo.facebook}>Ingeniería Telcom EIRL</a>
                      </blockquote>
                    </div>
                  </div>

                  {/* Barra inferior */}
                  <div className="flex justify-center py-2 bg-primary-950">
                    <span className="w-28 h-1 rounded-full bg-white/40" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
