import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export default function Card({ children, className = '', hover = true }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -5 } : undefined}
      className={`bg-gradient-to-b from-primary-800/50 to-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-700/50 p-6 transition-all duration-300 ${
        hover ? 'hover:border-accent-electric/50 hover:shadow-lg hover:shadow-accent-electric/10' : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  )
}
