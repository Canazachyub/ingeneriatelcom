import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaLightbulb, FaUsers, FaRocket } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import Card from '../common/Card'

const features = [
  {
    icon: <FaLightbulb className="text-3xl text-accent-electric" />,
    title: 'Software y Tecnologia',
    description: 'Desarrollamos software y soluciones tecnologicas a medida para empresas estatales y del sector privado, optimizando procesos y mejorando la eficiencia operativa.',
  },
  {
    icon: <FaUsers className="text-3xl text-accent-electric" />,
    title: 'Ingenieria Electrica',
    description: 'Ejecutamos proyectos de ingenieria electrica con los mas altos estandares de calidad, desde diseno hasta supervision y puesta en marcha.',
  },
  {
    icon: <FaRocket className="text-3xl text-accent-electric" />,
    title: 'Mineria e Ingenieria',
    description: 'Brindamos soluciones integrales para el sector minero y proyectos de ingenieria multidisciplinaria, con enfoque en innovacion y seguridad.',
  },
]

export default function AboutSection() {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <SectionWrapper id="quienes-somos" dark>
      <div ref={ref}>
        {/* Header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-1 bg-accent-electric/10 text-accent-electric text-sm font-medium rounded-full mb-4"
          >
            Quienes Somos
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-title"
          >
            Conoce Nuestra Empresa
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-subtitle mx-auto"
          >
            Ingenieria Telcom EIRL es una empresa peruana fundada en 2017, especializada en desarrollo de software, proyectos de ingenieria electrica y soluciones para el sector minero. Brindamos servicios tecnologicos integrales a empresas estatales y del sector privado.
          </motion.p>
        </div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-gradient-to-r from-primary-800/30 to-primary-900/30 backdrop-blur-sm rounded-2xl p-8 border border-primary-700/50 mb-12"
        >
          <p className="text-primary-200 text-lg leading-relaxed">
            Con 9 anos de experiencia en el mercado, nos enorgullecemos de ser aliados estrategicos de las principales empresas del sector electrico, minero y gubernamental del Peru. Nuestro enfoque combina innovacion tecnologica con solida experiencia en ingenieria, ofreciendo software personalizado, consultoria tecnica y ejecucion de proyectos que impulsan el desarrollo del pais.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
            >
              <Card className="h-full text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-800 rounded-xl flex items-center justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-display font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-primary-300">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
