import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import SectionWrapper from '../common/SectionWrapper'
import { clients } from '../../data/clients'

export default function ClientsSection() {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <SectionWrapper id="clientes">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-1 bg-accent-electric/10 text-accent-electric text-sm font-medium rounded-full mb-4"
          >
            Empresas que Confian en Nosotros
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-title"
          >
            Nuestros Clientes
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-subtitle mx-auto"
          >
            Nos enorgullecemos de trabajar con renombradas empresas del sector electrico.
          </motion.p>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {clients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              className="group"
            >
              <div className="bg-white rounded-xl p-6 h-full flex flex-col items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-accent-electric/20 hover:-translate-y-2">
                <div className="h-20 flex items-center justify-center mb-4">
                  <img
                    src={client.logo}
                    alt={client.name}
                    className="max-h-16 max-w-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                  />
                </div>
                <h4 className="text-sm font-semibold text-primary-950 text-center mb-2">
                  {client.name}
                </h4>
                <p className="text-xs text-primary-700 text-center">
                  {client.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
