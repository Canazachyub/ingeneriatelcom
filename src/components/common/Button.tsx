import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'energy'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  isLoading?: boolean
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
  form?: string
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading,
  className = '',
  disabled,
  type,
  onClick,
  form,
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-gradient-to-r from-primary-600 to-accent-electric text-white hover:shadow-lg hover:shadow-accent-electric/25 hover:-translate-y-0.5',
    secondary: 'border-2 border-accent-electric text-accent-electric hover:bg-accent-electric hover:text-primary-950',
    energy: 'bg-accent-energy text-primary-950 hover:bg-yellow-400 hover:-translate-y-0.5',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      type={type}
      onClick={onClick}
      form={form}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Cargando...
        </span>
      ) : (
        children
      )}
    </motion.button>
  )
}
