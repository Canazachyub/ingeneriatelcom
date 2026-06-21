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
  FaRedo,
  FaWifi,
  FaArrowLeft,
} from 'react-icons/fa'
import { Link } from 'react-router-dom'
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

  useEffect(() => {
    getLocation()
  }, [getLocation])

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
      if (dni.length === 8) handleVerificarEmpleado()
    } else if (dni.length < 8) {
      setDni((prev) => prev + key)
    }
  }

  const handleVerificarEmpleado = async () => {
    if (dni.length !== 8) return
    setIsLoading(true)
    try {
      const response = await api.verificarEmpleado(dni)

      if (response.success && response.data) {
        // Apps Script devuelve: { id, dni, nombre, cargo, foto, asistenciaHoy }
        const raw = response.data as unknown as {
          id: string
          dni: string
          nombre: string
          cargo: string
          asistenciaHoy: { fecha: string; entrada: string | null; salida: string | null } | null
        }
        const tieneEntrada = raw.asistenciaHoy?.entrada
        const tieneSalida = raw.asistenciaHoy?.salida
        const sugerencia: 'entrada' | 'salida' = tieneEntrada && !tieneSalida ? 'salida' : 'entrada'

        setEmpleado({
          encontrado: true,
          empleado: {
            dni: raw.dni || dni,
            nombre: raw.nombre || 'Sin nombre',
            puesto: raw.cargo || 'Sin cargo',
            activo: true,
          },
          sugerencia,
          ultimoRegistroHoy: tieneEntrada
            ? { id: '', dni, fecha: raw.asistenciaHoy?.fecha || '',
                tipo: tieneEntrada && !tieneSalida ? 'entrada' : 'salida',
                hora: tieneSalida || tieneEntrada || '', lat: 0, lng: 0, accuracy: 0 }
            : undefined,
        })
        setTipoRegistro(sugerencia)
        setViewState('confirm')
      } else {
        setMensaje(response.error || 'DNI no encontrado en el sistema')
        setViewState('error')
      }
    } catch {
      setMensaje('Error de conexión. Intenta de nuevo.')
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
        setMensaje(response.error || `Error al registrar ${tipo}`)
        setViewState('error')
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
    <div
      className="flex flex-col bg-[#060d1f]"
      style={{ minHeight: '100dvh' }}
    >
      {/* Fondo decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-blue-800/10 blur-3xl" />
      </div>

      {/* Header compacto */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <FaArrowLeft className="text-xs" />
          </Link>
          <div>
            <p className="text-[10px] font-mono text-cyan-400/70 tracking-widest uppercase">Ingeniería Telcom</p>
            <h1 className="text-base font-display font-bold text-white leading-tight">Control de Asistencia</h1>
          </div>
        </div>
        <GpsIndicator loading={geoLoading} location={location} error={geoError} />
      </header>

      {/* Contenido principal */}
      <main className="relative z-10 flex-1 flex flex-col px-4 pb-4">
        <AnimatePresence mode="wait">

          {/* ── Vista: Ingreso de DNI ── */}
          {viewState === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col flex-1"
            >
              <RelojTiempoReal />

              {/* Display DNI */}
              <div className="mb-5">
                <p className="text-center text-xs text-primary-400 mb-3 tracking-widest uppercase">
                  Ingresa tu DNI
                </p>
                <div className="flex justify-center gap-2.5">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const char = dni[i]
                    const isActive = i === dni.length
                    return (
                      <motion.div
                        key={i}
                        animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className={`w-9 h-11 rounded-lg flex items-center justify-center text-lg font-bold font-mono transition-all duration-200 ${
                          char
                            ? 'bg-blue-600/30 border border-blue-500/60 text-white'
                            : isActive
                            ? 'bg-cyan-500/10 border-2 border-cyan-400/70 text-transparent'
                            : 'bg-white/5 border border-white/10 text-transparent'
                        }`}
                      >
                        {char || (isActive ? (
                          <span className="w-0.5 h-5 bg-cyan-400 rounded-full animate-pulse" />
                        ) : null)}
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* Teclado */}
              <TecladoNumerico
                onKeyPress={handleKeyPress}
                onSubmit={handleVerificarEmpleado}
                disabled={isLoading || dni.length !== 8}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {/* ── Vista: Confirmación empleado ── */}
          {viewState === 'confirm' && empleado?.empleado && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col flex-1 justify-center"
            >
              {/* Card empleado */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 mb-5">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <FaUser className="text-2xl text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white leading-tight">
                      {empleado.empleado.nombre}
                    </h2>
                    <p className="text-sm text-primary-400">{empleado.empleado.puesto}</p>
                    {empleado.empleado.departamento && (
                      <p className="text-xs text-primary-500">{empleado.empleado.departamento}</p>
                    )}
                  </div>
                </div>

                {empleado.ultimoRegistroHoy && (
                  <div className="rounded-xl bg-white/5 px-4 py-2.5 text-sm text-center">
                    <span className="text-primary-400">Último registro: </span>
                    <span className="text-white font-medium">
                      {empleado.ultimoRegistroHoy.tipo === 'entrada' ? 'Entrada' : 'Salida'} a las {empleado.ultimoRegistroHoy.hora}
                    </span>
                  </div>
                )}
              </div>

              {/* Botones entrada / salida */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => handleMarcarAsistencia('entrada')}
                  disabled={isLoading || !location}
                  className={`relative py-6 rounded-2xl font-bold text-base transition-all flex flex-col items-center gap-2 overflow-hidden ${
                    tipoRegistro === 'entrada'
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-white/5 border border-white/10 text-primary-300 hover:bg-white/10'
                  } disabled:opacity-40`}
                >
                  {tipoRegistro === 'entrada' && (
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                  )}
                  {isLoading && tipoRegistro === 'entrada' ? (
                    <FaSpinner className="text-2xl animate-spin" />
                  ) : (
                    <FaSignInAlt className="text-2xl" />
                  )}
                  <span className="tracking-wider text-sm">ENTRADA</span>
                  {tipoRegistro === 'entrada' && (
                    <span className="text-xs opacity-75 font-normal">Sugerido</span>
                  )}
                </button>

                <button
                  onClick={() => handleMarcarAsistencia('salida')}
                  disabled={isLoading || !location}
                  className={`relative py-6 rounded-2xl font-bold text-base transition-all flex flex-col items-center gap-2 overflow-hidden ${
                    tipoRegistro === 'salida'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                      : 'bg-white/5 border border-white/10 text-primary-300 hover:bg-white/10'
                  } disabled:opacity-40`}
                >
                  {tipoRegistro === 'salida' && (
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                  )}
                  {isLoading && tipoRegistro === 'salida' ? (
                    <FaSpinner className="text-2xl animate-spin" />
                  ) : (
                    <FaSignOutAlt className="text-2xl" />
                  )}
                  <span className="tracking-wider text-sm">SALIDA</span>
                  {tipoRegistro === 'salida' && (
                    <span className="text-xs opacity-75 font-normal">Sugerido</span>
                  )}
                </button>
              </div>

              {/* GPS info */}
              {location && (
                <p className="text-center text-xs text-primary-500 mb-3">
                  <FaMapMarkerAlt className="inline mr-1 text-cyan-500/60" />
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)} · ±{Math.round(location.accuracy)}m
                </p>
              )}
              {!location && (
                <p className="text-center text-xs text-rose-400/80 mb-3">
                  <FaExclamationTriangle className="inline mr-1" />
                  GPS requerido para registrar asistencia
                </p>
              )}

              <button
                onClick={handleReset}
                className="text-center text-sm text-primary-500 hover:text-primary-300 transition-colors py-2"
              >
                Cancelar
              </button>
            </motion.div>
          )}

          {/* ── Vista: Éxito ── */}
          {viewState === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col flex-1 justify-center items-center text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                className="w-28 h-28 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-6"
              >
                <FaCheckCircle className="text-5xl text-emerald-400" />
              </motion.div>

              <span className={`inline-block px-4 py-1 rounded-full text-xs font-bold tracking-widest mb-4 ${
                tipoRegistro === 'entrada'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {tipoRegistro === 'entrada' ? 'ENTRADA' : 'SALIDA'} REGISTRADA
              </span>

              <h2 className="text-xl font-bold text-white mb-1">
                {empleado?.empleado?.nombre}
              </h2>
              <p className="text-4xl font-mono font-bold text-white mb-1">{horaRegistro}</p>
              {location && (
                <p className="text-xs text-primary-500 mb-6">
                  <FaMapMarkerAlt className="inline mr-1" />
                  ±{Math.round(location.accuracy)}m de precisión
                </p>
              )}

              {/* Barra de countdown */}
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-emerald-400 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                />
              </div>
              <p className="text-xs text-primary-500">Reiniciando en {countdown}s...</p>
            </motion.div>
          )}

          {/* ── Vista: Error ── */}
          {viewState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col flex-1 justify-center items-center text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                className="w-28 h-28 rounded-full bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center mb-6"
              >
                <FaTimesCircle className="text-5xl text-rose-400" />
              </motion.div>

              <h2 className="text-xl font-bold text-white mb-2">Error</h2>
              <p className="text-rose-400 text-sm mb-8 max-w-xs">{mensaje}</p>

              <button
                onClick={handleReset}
                className="px-8 py-3 bg-rose-500 text-white font-semibold rounded-2xl hover:bg-rose-600 transition-colors inline-flex items-center gap-2 mb-4"
              >
                <FaRedo /> Intentar de nuevo
              </button>

              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-rose-400 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                />
              </div>
              <p className="text-xs text-primary-500">Reiniciando en {countdown}s...</p>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  )
}

/* ─── GPS Indicator ─── */
function GpsIndicator({
  loading,
  location,
}: {
  loading: boolean
  location: { accuracy: number } | null
  error?: string | null
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
        <FaSpinner className="text-yellow-400 text-xs animate-spin" />
        <span className="text-yellow-400/80 text-xs">GPS...</span>
      </div>
    )
  }
  if (location) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <FaWifi className="text-emerald-400 text-xs" />
        <span className="text-emerald-400 text-xs">±{Math.round(location.accuracy)}m</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
      <FaMapMarkerAlt className="text-rose-400 text-xs" />
      <span className="text-rose-400 text-xs">Sin GPS</span>
    </div>
  )
}

/* ─── Reloj ─── */
function RelojTiempoReal() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hhmm = time.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })
  const ss = time.getSeconds().toString().padStart(2, '0')
  const ampm = hhmm.slice(-4)
  const hoursMinutes = hhmm.slice(0, -5)

  const fecha = time.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="text-center py-4">
      <div className="flex items-end justify-center gap-1">
        <span className="text-5xl font-mono font-bold text-white leading-none tracking-tight">
          {hoursMinutes}
        </span>
        <span className="text-2xl font-mono font-bold text-cyan-400/60 leading-none mb-0.5">
          :{ss}
        </span>
        <span className="text-sm font-mono text-primary-400 leading-none mb-1 ml-1">
          {ampm}
        </span>
      </div>
      <p className="text-xs text-primary-400 mt-2 capitalize">{fecha}</p>
    </div>
  )
}

/* ─── Teclado Numérico ─── */
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
    ['backspace', '0', 'enter'],
  ]

  return (
    <div className="flex-1 flex flex-col justify-end">
      <div className="grid grid-cols-3 gap-2.5">
        {keys.flat().map((key) => {
          const isBackspace = key === 'backspace'
          const isEnter = key === 'enter'

          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.92 }}
              onClick={() => (isEnter ? onSubmit() : onKeyPress(key))}
              disabled={isEnter && disabled}
              className={`
                h-16 rounded-2xl text-xl font-bold transition-all duration-150 relative overflow-hidden
                active:brightness-90
                ${isEnter
                  ? disabled
                    ? 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed'
                    : 'bg-gradient-to-b from-cyan-400 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : isBackspace
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-white/8 border border-white/10 text-white hover:bg-white/14'
                }
              `}
              style={{
                backgroundColor: isEnter && !disabled ? undefined : undefined,
              }}
            >
              {isBackspace ? (
                <FaBackspace className="mx-auto text-lg" />
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
