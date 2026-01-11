import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaBolt, FaHome } from 'react-icons/fa'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-primary-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-accent-electric to-primary-500 rounded-full flex items-center justify-center">
            <FaBolt className="text-4xl text-white" />
          </div>
        </div>

        <h1 className="text-6xl md:text-8xl font-display font-bold text-white mb-4">
          404
        </h1>

        <h2 className="text-2xl md:text-3xl font-display font-semibold text-primary-200 mb-4">
          Pagina no encontrada
        </h2>

        <p className="text-primary-400 max-w-md mx-auto mb-8">
          Lo sentimos, la pagina que buscas no existe o ha sido movida.
        </p>

        <Link
          to="/"
          className="btn-primary inline-flex items-center gap-2"
        >
          <FaHome />
          Volver al Inicio
        </Link>
      </motion.div>
    </div>
  )
}
