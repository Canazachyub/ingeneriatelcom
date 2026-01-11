import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaShieldAlt, FaHeart, FaHandshake, FaUsers, FaLock, FaBriefcase } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import Card from '../common/Card'
import { ethicsValues } from '../../data/organization'

const iconMap: Record<string, React.ReactNode> = {
  'shield-check': <FaShieldAlt className="text-2xl text-accent-electric" />,
  'heart': <FaHeart className="text-2xl text-accent-electric" />,
  'handshake': <FaHandshake className="text-2xl text-accent-electric" />,
  'users': <FaUsers className="text-2xl text-accent-electric" />,
  'lock': <FaLock className="text-2xl text-accent-electric" />,
  'briefcase': <FaBriefcase className="text-2xl text-accent-electric" />,
}

export default function EthicsSection() {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <SectionWrapper id="codigo-etica">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-1 bg-accent-electric/10 text-accent-electric text-sm font-medium rounded-full mb-4"
          >
            Nuestros Principios
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-title"
          >
            Codigo de Etica
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-subtitle mx-auto"
          >
            En Ingenieria Telcom EIRL nos comprometemos a cumplir con los mas altos estandares eticos en todas nuestras actividades.
          </motion.p>
        </div>

        {/* Ethics Values Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {ethicsValues.map((value, index) => (
            <motion.div
              key={value.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              <Card className="h-full">
                <div className="w-12 h-12 bg-primary-800 rounded-xl flex items-center justify-center mb-4">
                  {iconMap[value.icon]}
                </div>
                <h3 className="text-xl font-display font-semibold text-white mb-2">
                  {value.title}
                </h3>
                <p className="text-primary-300 text-sm">
                  {value.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="grid md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <Card className="h-full bg-primary-800/30">
              <h4 className="text-lg font-semibold text-white mb-2">
                Ambito de Aplicacion
              </h4>
              <p className="text-primary-300 text-sm">
                Este codigo establece pautas basicas de comportamiento etico, complementando las disposiciones legales y reglamentarias vigentes.
              </p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 1 }}
          >
            <Card className="h-full bg-primary-800/30">
              <h4 className="text-lg font-semibold text-white mb-2">
                Pautas de Comportamiento
              </h4>
              <p className="text-primary-300 text-sm">
                Esperamos que nuestros empleados actuen conforme a los valores de la empresa, evitando conflictos de interes y actuando con lealtad.
              </p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 1.1 }}
          >
            <Card className="h-full bg-primary-800/30">
              <h4 className="text-lg font-semibold text-white mb-2">
                Medidas Disciplinarias
              </h4>
              <p className="text-primary-300 text-sm">
                Frente a cualquier acto que viole este Codigo, el area de RRHH tomara las medidas disciplinarias correspondientes.
              </p>
            </Card>
          </motion.div>
        </div>
      </div>
    </SectionWrapper>
  )
}
