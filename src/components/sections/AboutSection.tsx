import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaMapMarkedAlt } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import TiltCard from '../common/TiltCard'
import IconoArea, { Area } from '../common/IconoArea'
import HudFrame from '../effects/HudFrame'
import SectionHeader from '../common/SectionHeader'
import { ANIO_FUNDACION, aniosExperiencia } from '../../data/empresa'

// Ícono de línea propio por área (ver IconoArea). Reemplazan a los genéricos
// originales (foco, personas, cohete) y a los 3D holográficos intermedios.
const features: { icon: Area; title: string; description: string }[] = [
  {
    icon: 'software',
    title: 'Software y Tecnología',
    description: 'Desarrollamos software y soluciones tecnológicas a medida para empresas estatales y del sector privado, optimizando procesos y mejorando la eficiencia operativa.',
  },
  {
    icon: 'electrica',
    title: 'Ingeniería Eléctrica',
    description: 'Ejecutamos proyectos de ingeniería eléctrica con los más altos estándares de calidad, desde diseño hasta supervisión y puesta en marcha.',
  },
  {
    icon: 'mineria',
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
        <SectionHeader
          id="quienes-somos"
          eyebrow="Quiénes somos"
          title="Conoce Nuestra Empresa"
          subtitle={`Ingeniería Telcom EIRL es una empresa peruana fundada en ${ANIO_FUNDACION}, especializada en desarrollo de software, ingeniería eléctrica y soluciones para el sector minero, al servicio de empresas estatales y privadas.`}
        />

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
              Con {aniosExperiencia()} años de experiencia en el mercado, nos enorgullecemos de ser aliados estratégicos de las principales empresas del sector eléctrico, minero y gubernamental del Perú. Nuestro enfoque combina innovación tecnológica con sólida experiencia en ingeniería, ofreciendo software personalizado, consultoría técnica y ejecución de proyectos que impulsan el desarrollo del país.
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
              <TiltCard>
                <HudFrame className="group h-full" color="border-accent-electric/30">
                  <div className="h-full text-center px-6 pb-7 pt-4 bg-gradient-to-b from-primary-800/40 to-primary-950/60 backdrop-blur-sm border border-primary-700/40 group-hover:border-accent-electric/40 transition-colors duration-300">
                    <IconoArea area={feature.icon} className="mt-4 mb-5" />
                    <h3 className="text-xl font-display font-semibold text-white mb-3 group-hover:text-accent-electric transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-primary-300">
                      {feature.description}
                    </p>
                  </div>
                </HudFrame>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* El equipo: oficina y campo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-12 grid md:grid-cols-2 gap-6"
        >
          <div className="relative rounded-2xl overflow-hidden border border-primary-700/50 group">
            <img
              src="/assets/images/operaciones/Q1.webp"
              alt="Equipo administrativo de Ingeniería Telcom colaborando en oficina"
              loading="lazy"
              className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-950/90 to-transparent p-4 pt-10">
              <p className="text-white font-medium text-sm">Gestión y análisis en oficina</p>
            </div>
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-primary-700/50 group">
            <img
              src="/assets/images/operaciones/Q2.webp"
              alt="Ingeniero de campo y coordinador de oficina de Ingeniería Telcom"
              loading="lazy"
              className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-950/90 to-transparent p-4 pt-10">
              <p className="text-white font-medium text-sm">Un solo equipo: oficina y campo</p>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
