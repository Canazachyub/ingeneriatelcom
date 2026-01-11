import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaBolt, FaEnvelope, FaLock, FaSpinner } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-primary-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-electric"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await login(email, password)
    setIsLoading(false)

    if (result.success) {
      navigate('/admin')
    } else {
      setError(result.error || 'Error al iniciar sesion')
    }
  }

  return (
    <div className="min-h-screen bg-primary-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-electric/20 rounded-2xl mb-4">
            <FaBolt className="text-3xl text-accent-electric" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">
            Panel de Administracion
          </h1>
          <p className="text-primary-400 mt-2">
            Ingenieria Telcom EIRL
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-primary-900/50 backdrop-blur-sm rounded-2xl border border-primary-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary-200 mb-2">
                Correo Electronico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-primary-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric transition-colors"
                  placeholder="admin@telcom.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary-200 mb-2">
                Contrasena
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-primary-500" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric transition-colors"
                  placeholder="********"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent-electric text-white font-semibold rounded-lg hover:bg-accent-electric/90 focus:outline-none focus:ring-2 focus:ring-accent-electric focus:ring-offset-2 focus:ring-offset-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Iniciando sesion...</span>
                </>
              ) : (
                <span>Iniciar Sesion</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-primary-400 hover:text-accent-electric text-sm transition-colors"
            >
              Volver al sitio web
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-primary-500 text-sm">
          Credenciales por defecto: admin@telcom.com / admin123
        </p>
      </motion.div>
    </div>
  )
}
