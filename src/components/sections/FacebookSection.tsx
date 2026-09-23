import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FaFacebookF, FaExternalLinkAlt, FaHardHat, FaNewspaper, FaBriefcase, FaGraduationCap,
  FaThumbsUp, FaComment, FaShare,
} from 'react-icons/fa'
import SectionHeader from '../common/SectionHeader'
import HudFrame from '../effects/HudFrame'
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
  { icon: <FaHardHat />, titulo: 'Avances de proyectos', detalle: 'Obras y servicios en campo' },
  { icon: <FaNewspaper />, titulo: 'Noticias del sector', detalle: 'Energía, TIC y minería' },
  { icon: <FaBriefcase />, titulo: 'Oportunidades laborales', detalle: 'Convocatorias abiertas' },
  { icon: <FaGraduationCap />, titulo: 'Eventos y capacitaciones', detalle: 'Formación del equipo' },
]

export default function FacebookSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const pluginContainerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    // Calculate scale to fill container
    const updateScale = () => {
      if (pluginContainerRef.current) {
        const containerWidth = pluginContainerRef.current.offsetWidth
        // Facebook plugin max width is 500px, so we scale to fill container
        const newScale = Math.min(containerWidth / 500, 1.5) // Max scale 1.5x
        setScale(newScale)
      }
    }

    updateScale()
    window.addEventListener('resize', updateScale)

    // Load Facebook SDK if not already loaded
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/es_LA/sdk.js#xfbml=1&version=v18.0'
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      document.body.appendChild(script)
    }

    // Parse XFBML when SDK is ready
    const checkFB = setInterval(() => {
      if (window.FB && containerRef.current) {
        window.FB.XFBML.parse(containerRef.current)
        setTimeout(() => {
          setIsLoaded(true)
          updateScale()
        }, 1500)
        clearInterval(checkFB)
      }
    }, 100)

    // Fallback timeout
    const timeout = setTimeout(() => {
      setIsLoaded(true)
      clearInterval(checkFB)
    }, 8000)

    return () => {
      clearInterval(checkFB)
      clearTimeout(timeout)
      window.removeEventListener('resize', updateScale)
    }
  }, [])

  const scaledHeight = 500 * scale

  return (
    <section id="facebook" className="py-16 md:py-24 bg-primary-900/50 relative overflow-hidden">
      {/* Resplandores de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-electric/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <SectionHeader
          id="facebook"
          eyebrow="Novedades"
          title={<>Síguenos en <span className="text-gradient">Facebook</span></>}
          subtitle="Mantente al día con nuestras últimas noticias, proyectos y actividades."
        />

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna lateral: qué compartimos + CTA */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-1 flex flex-col gap-4 order-2 lg:order-1"
          >
            <div className="panel-hud p-5">
              <p className="font-mono text-[11px] tracking-[0.25em] text-accent-electric/80 mb-4">
                CANALES DE TRANSMISIÓN
              </p>
              <ul className="space-y-3">
                {CANALES.map((c) => (
                  <li key={c.titulo} className="group flex items-center gap-3">
                    <span className="w-10 h-10 shrink-0 flex items-center justify-center border border-accent-electric/30 bg-accent-electric/10 text-accent-electric group-hover:bg-accent-electric group-hover:text-primary-950 transition-colors duration-300">
                      {c.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{c.titulo}</span>
                      <span className="block text-xs text-primary-400">{c.detalle}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel-hud p-5">
              <p className="font-mono text-[11px] tracking-[0.25em] text-accent-electric/80 mb-4">
                INTERACTÚA
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: <FaThumbsUp />, label: 'Me gusta' },
                  { icon: <FaComment />, label: 'Comenta' },
                  { icon: <FaShare />, label: 'Comparte' },
                ].map((a) => (
                  <div key={a.label} className="py-3 border border-primary-700/50 bg-primary-950/40">
                    <span className="block text-lg text-blue-400 mb-1 mx-auto w-fit">{a.icon}</span>
                    <span className="text-xs text-primary-200">{a.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <a
              href={config.companyInfo.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hud flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-accent-electric text-white font-semibold hover:shadow-lg hover:shadow-accent-electric/30 transition-all"
            >
              <FaFacebookF className="text-lg" />
              Visitar página
              <FaExternalLinkAlt className="text-xs" />
            </a>
          </motion.div>

          {/* Monitor con el feed */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2 order-1 lg:order-2"
          >
            <HudFrame color="border-accent-electric/50" size="w-6 h-6">
              <div ref={containerRef} className="m-1.5 bg-primary-950/80 border border-primary-700/50 p-3 md:p-4">
                {/* Barra del monitor */}
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-primary-700/50">
                  <span className="relative flex w-2.5 h-2.5">
                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
                    <span className="relative w-2.5 h-2.5 rounded-full bg-red-500" />
                  </span>
                  <span className="font-mono text-[11px] tracking-[0.25em] text-primary-300">FEED EN VIVO</span>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                      <p className="text-white font-semibold text-sm leading-tight">Ingeniería Telcom EIRL</p>
                      <p className="text-primary-400 text-xs">@telcom.peru</p>
                    </div>
                    <a
                      href={config.companyInfo.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                    >
                      Seguir
                    </a>
                  </div>
                </div>

                {/* Facebook Plugin Container */}
                <div
                  ref={pluginContainerRef}
                  className="relative bg-white overflow-hidden"
                  style={{ height: `${scaledHeight}px` }}
                >
                  {/* Loading State */}
                  {!isLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary-950 z-10">
                      <div className="w-12 h-12 rounded-full border-4 border-accent-electric/20 border-t-accent-electric animate-spin mb-4" />
                      <p className="font-mono text-xs tracking-[0.2em] text-primary-300">SINTONIZANDO PUBLICACIONES…</p>
                    </div>
                  )}

                  {/* Facebook Page Plugin - Scaled */}
                  <div
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                      width: '500px',
                    }}
                  >
                    <div
                      className="fb-page"
                      data-href={config.companyInfo.facebook}
                      data-tabs="timeline"
                      data-width="500"
                      data-height="500"
                      data-small-header="false"
                      data-adapt-container-width="false"
                      data-hide-cover="false"
                      data-show-facepile="true"
                    >
                      <blockquote
                        cite={config.companyInfo.facebook}
                        className="fb-xfbml-parse-ignore"
                      >
                        <a href={config.companyInfo.facebook}>Ingeniería Telcom EIRL</a>
                      </blockquote>
                    </div>
                  </div>
                </div>
              </div>
            </HudFrame>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
