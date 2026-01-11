import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaBuilding, FaCog, FaCalculator, FaUsers, FaBullhorn, FaDesktop } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import Card from '../common/Card'
import { departments } from '../../data/organization'

const iconMap: Record<string, React.ReactNode> = {
  'building': <FaBuilding className="text-2xl text-accent-electric" />,
  'cog': <FaCog className="text-2xl text-accent-electric" />,
  'calculator': <FaCalculator className="text-2xl text-accent-electric" />,
  'users': <FaUsers className="text-2xl text-accent-electric" />,
  'megaphone': <FaBullhorn className="text-2xl text-accent-electric" />,
  'computer': <FaDesktop className="text-2xl text-accent-electric" />,
}

export default function OrganizationSection() {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <SectionWrapper id="estructura-organizacional" dark>
      <div ref={ref}>
        {/* Header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-1 bg-accent-electric/10 text-accent-electric text-sm font-medium rounded-full mb-4"
          >
            Nuestra Organizacion
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-title"
          >
            Estructura Organizacional
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-subtitle mx-auto"
          >
            La estructura organizacional de Ingenieria Telcom EIRL ha sido disenada para garantizar una gestion eficiente de todos nuestros proyectos y servicios.
          </motion.p>
        </div>

        {/* Departments Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept, index) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              <Card className="h-full group">
                <div className="w-14 h-14 bg-primary-800 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent-electric/20 transition-colors duration-300">
                  {iconMap[dept.icon]}
                </div>
                <h3 className="text-lg font-display font-semibold text-white mb-2 group-hover:text-accent-electric transition-colors duration-300">
                  {dept.name}
                </h3>
                <p className="text-primary-300 text-sm">
                  {dept.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
