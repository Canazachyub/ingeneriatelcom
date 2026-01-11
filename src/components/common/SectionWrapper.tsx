import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

interface SectionWrapperProps {
  id: string
  children: ReactNode
  className?: string
  dark?: boolean
}

export default function SectionWrapper({
  id,
  children,
  className = '',
  dark = false,
}: SectionWrapperProps) {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <section
      id={id}
      ref={ref}
      className={`py-16 md:py-24 ${
        dark ? 'bg-primary-950' : 'bg-primary-900/50'
      } ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        {children}
      </motion.div>
    </section>
  )
}
