import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaLightbulb, FaUsers, FaRocket, FaMapMarkedAlt } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import Card from '../common/Card'

const features = [
  {
    icon: <FaLightbulb className="text-3xl text-accent-electric" />,
    title: 'Software y Tecnología',
    description: 'Desarrollamos software y soluciones tecnológicas a medida para empresas estatales y del sector privado, optimizando procesos y mejorando la eficiencia operativa.',
  },
  {
    icon: <FaUsers className="text-3xl text-accent-electric" />,
    title: 'Ingeniería Eléctrica',
    description: 'Ejecutamos proyectos de ingeniería eléctrica con los más altos estándares de calidad, desde diseño hasta supervisión y puesta en marcha.',
  },
  {
    icon: <FaRocket className="text-3xl text-accent-electric" />,
    title: 'Minería e Ingeniería',
    description: 'Brindamos soluciones integrales para el sector minero y proyectos de ingeniería multidisciplinaria, con enfoque en innovación y seguridad.',
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
            Quiénes Somos
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
            Ingeniería Telcom EIRL es una empresa peruana fundada en 2017, especializada en desarrollo de software, proyectos de ingeniería eléctrica y soluciones para el sector minero. Brindamos servicios tecnológicos integrales a empresas estatales y del sector privado.
          </motion.p>
        </div>

        {/* Description + Cobertura Nacional */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid lg:grid-cols-2 gap-8 items-center mb-12"
        >
          {/* Texto */}
          <div className="bg-gradient-to-r from-primary-800/30 to-primary-900/30 backdrop-blur-sm rounded-2xl p-8 border border-primary-700/50 h-full flex items-center">
            <p className="text-primary-200 text-lg leading-relaxed">
              Con 9 años de experiencia en el mercado, nos enorgullecemos de ser aliados estratégicos de las principales empresas del sector eléctrico, minero y gubernamental del Perú. Nuestro enfoque combina innovación tecnológica con sólida experiencia en ingeniería, ofreciendo software personalizado, consultoría técnica y ejecución de proyectos que impulsan el desarrollo del país.
            </p>
          </div>

          {/* Mapa animado — cobertura nacional */}
          <div className="relative rounded-2xl overflow-hidden border border-accent-electric/30 shadow-2xl shadow-accent-electric/10">
            <video
              className="w-full h-full object-cover block"
              autoPlay
              loop
              muted
              playsInline
              poster="/assets/images/red-electrica-poster.jpg"
              aria-label="Mapa del Perú con la red eléctrica y proyectos de Ingeniería Telcom"
            >
              <source src="/assets/images/red-electrica.webm" type="video/webm" />
              <source src="/assets/images/red-electrica.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-primary-950/80 to-transparent pointer-events-none" />
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-950/70 backdrop-blur-sm border border-primary-700/50 text-xs text-primary-100">
              <FaMapMarkedAlt className="text-accent-electric" />
              Presencia y proyectos en todo el Perú
            </span>
          </div>
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
