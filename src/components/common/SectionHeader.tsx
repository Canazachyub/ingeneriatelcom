import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { numeroSeccion } from '../../data/empresa'

// Encabezado común de TODAS las secciones de la landing (coherencia visual):
//   ── 04 // OPERACIONES ──
//   Título grande
//   Subtítulo
// El número sale del orden de SECCIONES, así la numeración nunca se desfasa.
export default function SectionHeader({
  id,
  eyebrow,
  title,
  subtitle,
  align = 'center',
  accent = 'electric',
}: {
  id: string
  eyebrow: string
  title: ReactNode
  subtitle?: ReactNode
  align?: 'center' | 'left'
  accent?: 'electric' | 'energy'
}) {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true })
  const numero = numeroSeccion(id)
  const color = accent === 'energy' ? 'text-accent-energy' : 'text-accent-electric'
  const linea = accent === 'energy' ? 'from-accent-energy/0 to-accent-energy/70' : 'from-accent-electric/0 to-accent-electric/70'
  const centrado = align === 'center'

  return (
    <div ref={ref} className={`mb-12 md:mb-14 ${centrado ? 'text-center' : ''}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className={`flex items-center gap-3 mb-4 font-mono text-xs tracking-[0.3em] uppercase ${color} ${centrado ? 'justify-center' : ''}`}
      >
        <motion.span
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`h-px w-10 md:w-16 bg-gradient-to-r ${linea} origin-right`}
        />
        {numero && <span className="opacity-60">{numero} //</span>}
        <span>{eyebrow}</span>
        {centrado && (
          <motion.span
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`h-px w-10 md:w-16 bg-gradient-to-l ${linea} origin-left`}
          />
        )}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
        animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="section-title"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`section-subtitle ${centrado ? 'mx-auto' : ''}`}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  )
}
