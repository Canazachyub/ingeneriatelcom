import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaCode, FaNetworkWired, FaBolt, FaHardHat } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import { services } from '../../data/services'

const iconMap: Record<string, React.ReactNode> = {
  'clipboard-check': <FaCode className="text-2xl text-accent-electric" />,
  'chart-bar': <FaNetworkWired className="text-2xl text-accent-electric" />,
  'cog': <FaBolt className="text-2xl text-accent-electric" />,
  'paint-brush': <FaHardHat className="text-2xl text-accent-electric" />,
}

// Foto de operaciones para cada servicio (por id del servicio)
const serviceImages: Record<string, string> = {
  '1': '/assets/images/operaciones/S4.webp', // Software → equipo de gestión en oficina
  '2': '/assets/images/operaciones/S2.webp', // TIC → antena sobre las nubes
  '3': '/assets/images/operaciones/S1.webp', // Eléctrica → sala de tableros
  '4': '/assets/images/operaciones/S3.webp', // Minería y Construcción → supervisión de obra
}

// Tarjeta con tilt 3D al mover el mouse (CSS puro, sin librerías).
// En táctil o prefers-reduced-motion simplemente no se activa el listener de mouse.
function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateY(${(px * 6).toFixed(2)}deg) rotateX(${(-py * 6).toFixed(2)}deg) translateY(-2px)`
  }
  const onMouseLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="h-full transition-transform duration-200 ease-out will-change-transform"
    >
      {children}
    </div>
  )
}

export default function ServicesSection() {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <SectionWrapper id="servicios">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-1 bg-accent-electric/10 text-accent-electric text-sm font-medium rounded-full mb-4"
          >
            Nuestros Servicios
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-title"
          >
            Soluciones Integrales
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-subtitle mx-auto"
          >
            Ofrecemos soluciones integrales en software, tecnología, ingeniería y construcción.
          </motion.p>
        </div>

        {/* Services Grid — tarjetas con foto de operaciones y tilt 3D */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              <TiltCard>
                <div className="h-full group bg-primary-900/60 rounded-2xl border border-primary-800 overflow-hidden hover:border-accent-electric/40 transition-colors duration-300">
                  {serviceImages[service.id] && (
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={serviceImages[service.id]}
                        alt={service.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary-900 via-primary-900/20 to-transparent" />
                      <div className="absolute bottom-3 left-4 w-11 h-11 bg-primary-950/80 backdrop-blur-sm rounded-xl flex items-center justify-center border border-primary-700/60">
                        {iconMap[service.icon]}
                      </div>
                    </div>
                  )}
                  <div className="p-6 pt-4">
                    <h3 className="text-xl font-display font-semibold text-white mb-2 group-hover:text-accent-electric transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-primary-300">
                      {service.description}
                    </p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="bg-gradient-to-r from-accent-electric/10 to-primary-800/30 rounded-2xl p-8 border border-accent-electric/20"
        >
          <h3 className="text-2xl font-display font-semibold text-white mb-4">
            Experiencia Comprobada
          </h3>
          <p className="text-primary-200 leading-relaxed">
            Con 24 proyectos ejecutados exitosamente, hemos brindado soluciones de software, soporte TIC e ingeniería a empresas estatales como Electrosur, Electro Puno, Electro Sur Este y la Universidad Nacional del Altiplano. Nuestro compromiso es entregar resultados de calidad en los plazos establecidos.
          </p>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
