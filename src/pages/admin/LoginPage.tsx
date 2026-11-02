import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaEnvelope, FaLock, FaSpinner, FaClock, FaHardHat, FaGavel } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'

const IDEAS = [
  { icono: <FaClock />, texto: 'Asistencia y planilla del día' },
  { icono: <FaHardHat />, texto: 'Personal y proyectos en un solo lugar' },
  { icono: <FaGavel />, texto: 'Licitaciones y propuestas' },
]

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
      setError(result.error || 'Error al iniciar sesión')
    }
  }

  return (
    <div className="min-h-screen bg-primary-950 grid lg:grid-cols-[1fr_480px]">
      {/* Imagen de la operación */}
      <div className="relative hidden lg:block overflow-hidden">
        <img src="/assets/images/admin/login.webp" alt="" className="login-fondo absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-950/80 via-primary-950/30 to-primary-950" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary-950/90 to-transparent" />
        <div className="absolute left-10 bottom-10 right-10">
          <p className="marca-rotulo">Centro de mando</p>
          <h2 className="mt-2 font-body text-3xl font-bold text-white max-w-md leading-tight">Toda la operación de Telcom, en una sola pantalla.</h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {IDEAS.map((i) => (
              <li key={i.texto} className="flex items-center gap-2 rounded-lg border border-primary-700 bg-primary-950/70 px-3 py-1.5 text-xs text-primary-200">
                <span className="text-accent-electric">{i.icono}</span> {i.texto}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Ingreso */}
      <div className="flex items-center justify-center px-6 py-10 border-l border-primary-800 bg-primary-900/60">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <img src="/assets/images/admin/isotipo.webp" alt="" className="h-16 w-16 drop-shadow-[0_6px_18px_rgba(0,212,255,0.3)]" />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-[0.12em] text-white">TELCOM</h1>
          <p className="text-primary-400 text-sm mt-1">Ingresa con tu cuenta para continuar</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary-200 mb-1.5">Correo electrónico</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border text-white placeholder-primary-500"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary-200 mb-1.5">Contraseña</label>
              <div className="relative">
                <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border text-white placeholder-primary-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-[0_6px_18px_rgb(37_99_235/0.35)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? <><FaSpinner className="animate-spin" /> Ingresando…</> : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs">
            <a href="/" className="text-primary-400 hover:text-accent-electric transition-colors">Volver al sitio web</a>
            <span className="text-primary-500">Solo personal autorizado</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
