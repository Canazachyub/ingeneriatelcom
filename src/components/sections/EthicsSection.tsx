import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FaShieldAlt, FaHeart, FaHandshake, FaUsers, FaLock, FaBriefcase, FaChevronRight, FaTerminal } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import SectionHeader from '../common/SectionHeader'
import TiltCard from '../common/TiltCard'
import { ethicsValues, ethicsNorms } from '../../data/organization'

const iconMap: Record<string, React.ReactNode> = {
  'shield-check': <FaShieldAlt />,
  'heart': <FaHeart />,
  'handshake': <FaHandshake />,
  'users': <FaUsers />,
  'lock': <FaLock />,
  'briefcase': <FaBriefcase />,
}

export default function EthicsSection() {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })
  // Protocolo: acordeón con una norma abierta a la vez (la primera por defecto)
  const [abierta, setAbierta] = useState(0)

  return (
    <SectionWrapper id="codigo-etica">
      <div ref={ref}>
        <SectionHeader
          id="codigo-etica"
          eyebrow="Nuestros principios"
          title="Código de Ética"
          subtitle="En Ingeniería Telcom EIRL nos comprometemos a cumplir con los más altos estándares éticos en todas nuestras actividades."
        />

        {/* Principios: módulos con índice */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {ethicsValues.map((value, index) => (
            <motion.div
              key={value.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.08 }}
            >
              <TiltCard max={5}>
                <div className="group panel-hud h-full p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 flex items-center justify-center text-xl text-accent-electric bg-accent-electric/10 border border-accent-electric/30 group-hover:bg-accent-electric/20 group-hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-all duration-300"
                      style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}>
                      {iconMap[value.icon]}
                    </div>
                    <span className="font-mono text-xs tracking-[0.25em] text-primary-500 group-hover:text-accent-electric transition-colors">
                      PRINCIPIO {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="text-xl font-display font-semibold text-white mb-2 group-hover:text-accent-electric transition-colors duration-300">
                    {value.title}
                  </h3>
                  <p className="text-primary-300 text-sm leading-relaxed">
                    {value.description}
                  </p>
                  {/* barra de "carga" inferior al hover */}
                  <span aria-hidden="true" className="absolute left-0 bottom-0 h-0.5 w-0 bg-gradient-to-r from-accent-electric to-primary-400 group-hover:w-full transition-all duration-500" />
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* Protocolo: normas del código como consola */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="panel-hud overflow-hidden"
        >
          <div className="flex items-center gap-3 px-5 py-3 border-b border-primary-700/50 bg-primary-950/60 font-mono text-xs tracking-[0.2em] text-accent-electric">
            <FaTerminal />
            <span>PROTOCOLO // APLICACIÓN DEL CÓDIGO</span>
            <span className="ml-auto hidden sm:flex gap-1.5" aria-hidden="true">
              <span className="w-2 h-2 rounded-full bg-accent-success/70" />
              <span className="w-2 h-2 rounded-full bg-accent-energy/70" />
              <span className="w-2 h-2 rounded-full bg-primary-600" />
            </span>
          </div>
          <ol>
            {ethicsNorms.map((norma, i) => {
              const activa = abierta === i
              return (
                <li key={norma.title} className="border-b border-primary-800/60 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setAbierta(activa ? -1 : i)}
                    aria-expanded={activa}
                    className={`w-full flex items-center gap-4 px-5 py-4 min-h-[56px] text-left transition-colors ${activa ? 'bg-accent-electric/5' : 'hover:bg-primary-800/30'}`}
                  >
                    <span className={`font-mono text-sm tabular-nums ${activa ? 'text-accent-electric' : 'text-primary-500'}`}>
                      {`>${String(i + 1).padStart(2, '0')}`}
                    </span>
                    <span className={`flex-1 font-display font-semibold ${activa ? 'text-white' : 'text-primary-200'}`}>
                      {norma.title}
                    </span>
                    <FaChevronRight className={`text-sm transition-transform duration-300 ${activa ? 'rotate-90 text-accent-electric' : 'text-primary-500'}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {activa && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 pl-[4.25rem] text-primary-300 text-sm md:text-base leading-relaxed">
                          {norma.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ol>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
