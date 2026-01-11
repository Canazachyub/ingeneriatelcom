import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FaFacebookF, FaThumbsUp, FaComment, FaShare, FaExternalLinkAlt } from 'react-icons/fa'
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
    <section id="facebook" className="py-16 md:py-24 bg-gradient-to-b from-primary-900 via-primary-950 to-primary-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-electric/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, type: "spring" }}
            className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-600/30 mb-5"
          >
            <FaFacebookF className="text-2xl md:text-3xl text-white" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white mb-3">
            Siguenos en <span className="text-blue-500">Facebook</span>
          </h2>
          <p className="text-primary-300 max-w-xl mx-auto text-sm md:text-base">
            Mantente al dia con nuestras ultimas noticias, proyectos y actividades
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-1 space-y-4"
            >
              {/* What we share */}
              <div className="bg-gradient-to-br from-primary-800/50 to-primary-900/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 p-5">
                <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <FaFacebookF className="text-blue-500 text-sm" />
                  </span>
                  Que compartimos
                </h3>
                <ul className="space-y-3">
                  {[
                    { icon: '🚀', text: 'Avances de proyectos' },
                    { icon: '📰', text: 'Noticias del sector' },
                    { icon: '💼', text: 'Oportunidades laborales' },
                    { icon: '🎓', text: 'Eventos y capacitaciones' },
                  ].map((item, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 text-primary-200 text-sm"
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Engagement */}
              <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-5">
                <h3 className="text-lg font-display font-bold text-white mb-4">
                  Interactua con nosotros
                </h3>
                <div className="flex justify-around">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-2">
                      <FaThumbsUp className="text-blue-500 text-lg" />
                    </div>
                    <p className="text-white font-semibold text-xs">Me gusta</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-2">
                      <FaComment className="text-blue-500 text-lg" />
                    </div>
                    <p className="text-white font-semibold text-xs">Comenta</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-2">
                      <FaShare className="text-blue-500 text-lg" />
                    </div>
                    <p className="text-white font-semibold text-xs">Comparte</p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <a
                href={config.companyInfo.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 font-medium"
              >
                <FaFacebookF className="text-lg" />
                Visitar pagina
                <FaExternalLinkAlt className="text-xs" />
              </a>
            </motion.div>

            {/* Right Column - Facebook Embed */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <div
                ref={containerRef}
                className="bg-gradient-to-br from-primary-800/30 to-primary-900/30 backdrop-blur-sm rounded-2xl border border-primary-700/50 p-4"
              >
                {/* Facebook Header */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-primary-700/50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                    <FaFacebookF className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">Ingenieria Telcom EIRL</h4>
                    <p className="text-primary-400 text-xs">@telcom.peru</p>
                  </div>
                  <a
                    href={config.companyInfo.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Seguir
                  </a>
                </div>

                {/* Facebook Plugin Container */}
                <div
                  ref={pluginContainerRef}
                  className="relative bg-white rounded-xl overflow-hidden"
                  style={{ height: `${scaledHeight}px` }}
                >
                  {/* Loading State */}
                  {!isLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10">
                      <div className="w-12 h-12 rounded-full border-4 border-blue-600/30 border-t-blue-600 animate-spin mb-4" />
                      <p className="text-gray-600 text-sm">Cargando publicaciones...</p>
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
                        <a href={config.companyInfo.facebook}>Ingenieria Telcom EIRL</a>
                      </blockquote>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
