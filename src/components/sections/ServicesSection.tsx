import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaCode, FaNetworkWired, FaBolt, FaHardHat } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import Card from '../common/Card'
import { services } from '../../data/services'

const iconMap: Record<string, React.ReactNode> = {
  'clipboard-check': <FaCode className="text-3xl text-accent-electric" />,
  'chart-bar': <FaNetworkWired className="text-3xl text-accent-electric" />,
  'cog': <FaBolt className="text-3xl text-accent-electric" />,
  'paint-brush': <FaHardHat className="text-3xl text-accent-electric" />,
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
            Ofrecemos soluciones integrales en software, tecnologia, ingenieria y construccion.
          </motion.p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              <Card className="h-full group">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 flex-shrink-0 bg-primary-800 rounded-xl flex items-center justify-center group-hover:bg-accent-electric/20 transition-colors duration-300">
                    {iconMap[service.icon]}
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-semibold text-white mb-2 group-hover:text-accent-electric transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-primary-300">
                      {service.description}
                    </p>
                  </div>
                </div>
              </Card>
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
            Con 24 proyectos ejecutados exitosamente, hemos brindado soluciones de software, soporte TIC e ingenieria a empresas estatales como Electrosur, Electro Puno, Electro Sur Este y la Universidad Nacional del Altiplano. Nuestro compromiso es entregar resultados de calidad en los plazos establecidos.
          </p>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
