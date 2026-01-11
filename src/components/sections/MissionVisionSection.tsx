import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaBullseye, FaEye, FaHeart, FaCheckCircle } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import Card from '../common/Card'
import { missionVision } from '../../data/organization'

export default function MissionVisionSection() {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <SectionWrapper id="mision-vision" dark>
      <div ref={ref}>
        {/* Header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-1 bg-accent-electric/10 text-accent-electric text-sm font-medium rounded-full mb-4"
          >
            Nuestra Filosofia
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-title"
          >
            Mision, Vision y Valores
          </motion.h2>
        </div>

        {/* Mission & Vision Cards */}
        <div className="grid lg:grid-cols-2 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-accent-electric/20 rounded-xl flex items-center justify-center">
                  <FaBullseye className="text-2xl text-accent-electric" />
                </div>
                <h3 className="text-2xl font-display font-semibold text-white">
                  Mision
                </h3>
              </div>
              <p className="text-primary-200 leading-relaxed">
                {missionVision.mission}
              </p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-accent-energy/20 rounded-xl flex items-center justify-center">
                  <FaEye className="text-2xl text-accent-energy" />
                </div>
                <h3 className="text-2xl font-display font-semibold text-white">
                  Vision
                </h3>
              </div>
              <p className="text-primary-200 leading-relaxed">
                {missionVision.vision}
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Values */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card hover={false}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-accent-success/20 rounded-xl flex items-center justify-center">
                <FaHeart className="text-2xl text-accent-success" />
              </div>
              <h3 className="text-2xl font-display font-semibold text-white">
                Valores
              </h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {missionVision.values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                  className="flex items-start gap-3 p-4 bg-primary-800/30 rounded-lg"
                >
                  <FaCheckCircle className="text-accent-electric mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">{value.title}</h4>
                    <p className="text-sm text-primary-300">{value.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Quality Policy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8"
        >
          <Card className="bg-gradient-to-r from-primary-800/50 to-accent-electric/10 border-accent-electric/30">
            <h3 className="text-xl font-display font-semibold text-white mb-3">
              Politica de Calidad
            </h3>
            <p className="text-primary-200">
              En Ingenieria Telcom EIRL nos comprometemos a brindar servicios de telecomunicaciones y electricidad de calidad, cumpliendo con los requisitos de nuestros clientes y las normas legales vigentes. Para ello, nos esforzamos por mejorar continuamente nuestros procesos y la eficacia de nuestro sistema de gestion de calidad.
            </p>
          </Card>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
