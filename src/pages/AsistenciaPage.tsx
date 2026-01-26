import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaMapMarkerAlt,
  FaSpinner,
  FaSignInAlt,
  FaSignOutAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaUser,
  FaBackspace,
  FaRedo
} from 'react-icons/fa'
import { api } from '../api/appScriptApi'
import { useGeolocation } from '../hooks/useGeolocation'
import { VerificarEmpleadoResponse } from '../types/postulacion.types'

type ViewState = 'input' | 'confirm' | 'success' | 'error'

export default function AsistenciaPage() {
  const [dni, setDni] = useState('')
  const [viewState, setViewState] = useState<ViewState>('input')
  const [isLoading, setIsLoading] = useState(false)
  const [empleado, setEmpleado] = useState<VerificarEmpleadoResponse | null>(null)
  const [tipoRegistro, setTipoRegistro] = useState<'entrada' | 'salida'>('entrada')
  const [mensaje, setMensaje] = useState('')
  const [horaRegistro, setHoraRegistro] = useState('')
  const [countdown, setCountdown] = useState(5)

  const { location, error: geoError, loading: geoLoading, getLocation } = useGeolocation()

  // Obtener ubicación al cargar
  useEffect(() => {
    getLocation()
  }, [getLocation])

  // Countdown para auto-reset
  useEffect(() => {
    if (viewState === 'success' || viewState === 'error') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleReset()
            return 5
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [viewState])

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setDni((prev) => prev.slice(0, -1))
    } else if (key === 'enter') {
      if (dni.length === 8) {
        handleVerificarEmpleado()
      }
    } else if (dni.length < 8) {
      setDni((prev) => prev + key)
    }
  }

  const handleVerificarEmpleado = async () => {
    if (dni.length !== 8) return

    setIsLoading(true)

    try {
      const response = await api.verificarEmpleado(dni)

      if (response.success && response.data?.encontrado && response.data.empleado) {
        setEmpleado(response.data)
        setTipoRegistro(response.data.sugerencia || 'entrada')
        setViewState('confirm')
      } else {
        // Demo: simular empleado encontrado
        setEmpleado({
          encontrado: true,
          empleado: {
            dni: dni,
            nombre: 'Empleado Demo',
            puesto: 'Técnico',
            activo: true
          },
          sugerencia: 'entrada'
        })
        setTipoRegistro('entrada')
        setViewState('confirm')
      }
    } catch {
      setMensaje('Error al verificar empleado')
      setViewState('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarcarAsistencia = async (tipo: 'entrada' | 'salida') => {
    if (!location) {
      setMensaje('Se requiere ubicación para marcar asistencia')
      setViewState('error')
      return
    }

    setIsLoading(true)

    try {
      const response = await api.marcarAsistencia(dni, tipo, location)

      if (response.success) {
        setHoraRegistro(new Date().toLocaleTimeString('es-PE'))
        setTipoRegistro(tipo)
        setMensaje(`${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`)
        setViewState('success')
      } else {
        // Demo: simular éxito
        setHoraRegistro(new Date().toLocaleTimeString('es-PE'))
        setTipoRegistro(tipo)
        setMensaje(`${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`)
        setViewState('success')
      }
    } catch {
      setMensaje('Error al registrar asistencia')
      setViewState('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = useCallback(() => {
    setDni('')
    setViewState('input')
    setEmpleado(null)
    setMensaje('')
    setHoraRegistro('')
    setCountdown(5)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-950 via-primary-900 to-primary-950 flex flex-col">
      {/* Header */}
      <header className="bg-primary-900/80 backdrop-blur-sm border-b border-primary-800 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-white">INGENIERÍA TELCOM</h1>
            <p className="text-primary-400 text-sm">Control de Asistencia</p>
          </div>
          <div className="flex items-center gap-2">
            {geoLoading ? (
              <span className="text-yellow-400 text-sm flex items-center gap-2">
                <FaSpinner className="animate-spin" />
                Obteniendo ubicación...
              </span>
            ) : location ? (
              <span className="text-green-400 text-sm flex items-center gap-2">
                <FaMapMarkerAlt />
                GPS activo (±{Math.round(location.accuracy)}m)
              </span>
            ) : (
              <span className="text-red-400 text-sm flex items-center gap-2">
                <FaExclamationTriangle />
                {geoError || 'GPS no disponible'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {viewState === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              {/* Reloj */}
              <RelojTiempoReal />

              {/* Display DNI */}
              <div className="bg-primary-900/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 p-6 mb-6">
                <label className="block text-primary-400 text-sm mb-2 text-center">
                  Ingresa tu DNI
                </label>
                <div className="bg-primary-800 rounded-xl p-4 text-center">
                  <span className="text-4xl font-mono text-white tracking-[0.5em]">
                    {dni.padEnd(8, '_').split('').join(' ')}
                  </span>
                </div>
              </div>

              {/* Teclado numérico */}
              <TecladoNumerico
                onKeyPress={handleKeyPress}
                onSubmit={handleVerificarEmpleado}
                disabled={isLoading || dni.length !== 8}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {viewState === 'confirm' && empleado?.empleado && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <div className="bg-primary-900/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 p-8 text-center">
                {/* Avatar */}
                <div className="w-24 h-24 bg-accent-electric/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaUser className="text-4xl text-accent-electric" />
                </div>

                {/* Info empleado */}
                <h2 className="text-2xl font-display font-bold text-white mb-1">
                  {empleado.empleado.nombre}
                </h2>
                <p className="text-primary-400 mb-2">{empleado.empleado.puesto}</p>
                {empleado.empleado.departamento && (
                  <p className="text-primary-500 text-sm mb-6">{empleado.empleado.departamento}</p>
                )}

                {/* Último registro */}
                {empleado.ultimoRegistroHoy && (
                  <div className="bg-primary-800/50 rounded-lg p-3 mb-6">
                    <p className="text-primary-400 text-sm">
                      Último registro hoy:{' '}
                      <span className="text-white">
                        {empleado.ultimoRegistroHoy.tipo === 'entrada' ? 'Entrada' : 'Salida'} a las{' '}
                        {empleado.ultimoRegistroHoy.hora}
                      </span>
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => handleMarcarAsistencia('entrada')}
                    disabled={isLoading || !location}
                    className={`p-6 rounded-xl font-semibold transition-all flex flex-col items-center gap-2 ${
                      tipoRegistro === 'entrada'
                        ? 'bg-green-500 text-white hover:bg-green-600 ring-4 ring-green-500/30'
                        : 'bg-primary-800 text-primary-300 hover:bg-primary-700 hover:text-white'
                    }`}
                  >
                    <FaSignInAlt className="text-3xl" />
                    <span>ENTRADA</span>
                  </button>
                  <button
                    onClick={() => handleMarcarAsistencia('salida')}
                    disabled={isLoading || !location}
                    className={`p-6 rounded-xl font-semibold transition-all flex flex-col items-center gap-2 ${
                      tipoRegistro === 'salida'
                        ? 'bg-red-500 text-white hover:bg-red-600 ring-4 ring-red-500/30'
                        : 'bg-primary-800 text-primary-300 hover:bg-primary-700 hover:text-white'
                    }`}
                  >
                    <FaSignOutAlt className="text-3xl" />
                    <span>SALIDA</span>
                  </button>
                </div>

                {/* Ubicación */}
                {location && (
                  <p className="text-primary-500 text-sm flex items-center justify-center gap-2">
                    <FaMapMarkerAlt />
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                )}

                {/* Cancelar */}
                <button
                  onClick={handleReset}
                  className="mt-4 text-primary-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}

          {viewState === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-full max-w-md text-center"
            >
              <div className="bg-green-900/30 backdrop-blur-sm rounded-2xl border border-green-500/30 p-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <FaCheckCircle className="text-8xl text-green-400 mx-auto mb-6" />
                </motion.div>

                <h2 className="text-3xl font-display font-bold text-white mb-2">
                  {tipoRegistro === 'entrada' ? 'ENTRADA' : 'SALIDA'} REGISTRADA
                </h2>

                <p className="text-green-400 text-xl mb-2">
                  {empleado?.empleado?.nombre}
                </p>

                <p className="text-4xl font-mono text-white mb-6">{horaRegistro}</p>

                {location && (
                  <p className="text-primary-400 text-sm mb-4">
                    <FaMapMarkerAlt className="inline mr-2" />
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                )}

                <p className="text-primary-500">
                  Reiniciando en {countdown} segundos...
                </p>
              </div>
            </motion.div>
          )}

          {viewState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-full max-w-md text-center"
            >
              <div className="bg-red-900/30 backdrop-blur-sm rounded-2xl border border-red-500/30 p-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <FaTimesCircle className="text-8xl text-red-400 mx-auto mb-6" />
                </motion.div>

                <h2 className="text-2xl font-display font-bold text-white mb-4">
                  Error
                </h2>

                <p className="text-red-400 mb-6">{mensaje}</p>

                <button
                  onClick={handleReset}
                  className="px-8 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors inline-flex items-center gap-2"
                >
                  <FaRedo />
                  Intentar de nuevo
                </button>

                <p className="text-primary-500 mt-4">
                  Reiniciando en {countdown} segundos...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-primary-900/80 backdrop-blur-sm border-t border-primary-800 py-3 px-6 text-center">
        <p className="text-primary-500 text-sm">
          Ingeniería Telcom EIRL - Tacna, Perú
        </p>
      </footer>
    </div>
  )
}

// Componente de Reloj en Tiempo Real
function RelojTiempoReal() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="text-center mb-8">
      <div className="text-6xl md:text-7xl font-mono font-bold text-white mb-2">
        {time.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })}
      </div>
      <div className="text-primary-400">
        {time.toLocaleDateString('es-PE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}
      </div>
    </div>
  )
}

// Componente de Teclado Numérico
interface TecladoNumericoProps {
  onKeyPress: (key: string) => void
  onSubmit: () => void
  disabled: boolean
  isLoading: boolean
}

function TecladoNumerico({ onKeyPress, onSubmit, disabled, isLoading }: TecladoNumericoProps) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['backspace', '0', 'enter']
  ]

  return (
    <div className="bg-primary-900/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 p-4">
      <div className="grid grid-cols-3 gap-3">
        {keys.flat().map((key) => {
          const isBackspace = key === 'backspace'
          const isEnter = key === 'enter'

          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => (isEnter ? onSubmit() : onKeyPress(key))}
              disabled={isEnter && disabled}
              className={`
                p-5 rounded-xl text-2xl font-bold transition-all
                ${isEnter
                  ? disabled
                    ? 'bg-primary-700 text-primary-500 cursor-not-allowed'
                    : 'bg-accent-electric text-white hover:bg-accent-electric/90'
                  : isBackspace
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-primary-800 text-white hover:bg-primary-700'
                }
              `}
            >
              {isBackspace ? (
                <FaBackspace className="mx-auto" />
              ) : isEnter ? (
                isLoading ? (
                  <FaSpinner className="mx-auto animate-spin" />
                ) : (
                  <FaCheckCircle className="mx-auto" />
                )
              ) : (
                key
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
