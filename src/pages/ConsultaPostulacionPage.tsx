import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import HudFrame from '../components/effects/HudFrame'
import {
  FaSearch,
  FaSpinner,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBriefcase,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaLink,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaClipboardList
} from 'react-icons/fa'
import { api } from '../api/appScriptApi'
import {
  ConsultaPostulacionResponse,
  EtapaCronograma,
  ESTADO_CONFIG,
  EstadoPostulacion
} from '../types/postulacion.types'

export default function ConsultaPostulacionPage() {
  const [dni, setDni] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ConsultaPostulacionResponse | null>(null)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const handleDniChange = (value: string) => {
    // Solo permitir números y máximo 8 dígitos
    const cleaned = value.replace(/\D/g, '').slice(0, 8)
    setDni(cleaned)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (dni.length !== 8) {
      setError('El DNI debe tener 8 dígitos')
      return
    }

    setIsLoading(true)
    setError('')
    setHasSearched(true)

    try {
      const response = await api.consultarPostulacion(dni)

      if (response.success && response.data) {
        setResult(response.data)
      } else {
        // Si no hay datos en la API, simular respuesta para demo
        setResult({
          encontrado: false,
          mensaje: 'No se encontró ninguna postulación con este DNI'
        })
      }
    } catch {
      setError('Error al consultar. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setDni('')
    setResult(null)
    setHasSearched(false)
    setError('')
  }

  return (
    <div className="min-h-screen bg-primary-950 pb-16">
      <PageHeader
        eyebrow="Seguimiento de postulación"
        title="Consulta tu Postulación"
        subtitle="Ingresa tu DNI para ver el estado de tu postulación."
        migas={[{ label: 'Inicio', to: '/' }, { label: 'Bolsa de trabajo', to: '/bolsa-trabajo' }, { label: 'Consultar postulación' }]}
        accent="energy"
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">

        {/* Formulario de búsqueda */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <HudFrame color="border-accent-energy/50">
          <div className="panel-hud p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="dni" className="block font-mono text-[11px] tracking-[0.2em] uppercase text-primary-300 mb-2">
                Número de DNI
              </label>
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" />
                <input
                  type="text"
                  id="dni"
                  value={dni}
                  onChange={(e) => handleDniChange(e.target.value)}
                  placeholder="Ingresa tu DNI (8 dígitos)"
                  className="w-full pl-12 pr-16 py-4 bg-primary-950/70 border border-primary-700/70 text-white text-lg font-mono tracking-[0.2em] placeholder:tracking-normal placeholder:font-sans placeholder-primary-500 focus:outline-none focus:border-accent-electric focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] transition-all"
                  maxLength={8}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-400 font-mono text-xs">
                  {dni.length}/8
                </span>
              </div>
              {error && (
                <p className="mt-2 text-red-400 text-sm flex items-center gap-2">
                  <FaExclamationCircle />
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isLoading || dni.length !== 8}
                className="btn-energy btn-hud flex-1 py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 gap-2"
              >
                {isLoading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <FaSearch />
                    Consultar
                  </>
                )}
              </button>
              {hasSearched && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-secondary btn-hud px-6 py-4"
                >
                  Nueva consulta
                </button>
              )}
            </div>
          </form>
          </div>
          </HudFrame>
        </motion.div>

        {/* Resultados */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {result.encontrado && result.postulacion ? (
                <div className="space-y-6">
                  {/* Tarjeta de información del postulante */}
                  <div className="panel-hud p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 shrink-0 bg-accent-electric/10 border border-accent-electric/40 flex items-center justify-center" style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}>
                        <FaUser className="text-2xl text-accent-electric" />
                      </div>
                      <div className="flex-1">
                        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent-electric mb-1">Postulante</p>
                        <h2 className="text-xl font-display font-semibold text-white mb-1">
                          {result.postulacion.nombre}
                        </h2>
                        <div className="space-y-1 text-sm text-primary-300">
                          <p className="flex items-center gap-2">
                            <FaEnvelope className="text-primary-500" />
                            {result.postulacion.email}
                          </p>
                          <p className="flex items-center gap-2">
                            <FaPhone className="text-primary-500" />
                            {result.postulacion.telefono}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-primary-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mb-1">Puesto</p>
                          <p className="text-white font-medium flex items-center gap-2">
                            <FaBriefcase className="text-accent-electric" />
                            {result.postulacion.puesto}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mb-1">Fecha de postulación</p>
                          <p className="text-white font-medium flex items-center gap-2">
                            <FaCalendarAlt className="text-accent-electric" />
                            {new Date(result.postulacion.fechaPostulacion).toLocaleDateString('es-PE', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Estado actual */}
                  <div className="panel-hud p-6">
                    <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                      <FaClipboardList className="text-accent-electric" />
                      Estado actual
                    </h3>
                    <EstadoBadge estado={result.postulacion.estado} large />
                  </div>

                  {/* Cronograma */}
                  {result.cronograma && result.cronograma.length > 0 && (
                    <div className="panel-hud p-6">
                      <h3 className="text-lg font-display font-semibold text-white mb-6 flex items-center gap-2">
                        <FaClock className="text-accent-electric" />
                        Cronograma del proceso
                      </h3>
                      <TimelinePostulacion etapas={result.cronograma} />
                    </div>
                  )}

                  {/* Tarjeta de entrevista */}
                  {result.entrevista && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="panel-hud !border-accent-electric/40 p-6"
                    >
                      <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                        <FaCalendarAlt className="text-accent-electric" />
                        Entrevista programada
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent-electric/80 mb-1">Fecha</p>
                          <p className="text-white font-medium">
                            {new Date(result.entrevista.fecha).toLocaleDateString('es-PE', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent-electric/80 mb-1">Hora</p>
                          <p className="text-white font-medium">{result.entrevista.hora}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent-electric/80 mb-1">Lugar</p>
                          <p className="text-white font-medium flex items-center gap-2">
                            <FaMapMarkerAlt className="text-accent-electric" />
                            {result.entrevista.lugar}
                          </p>
                        </div>
                        {result.entrevista.linkVirtual && (
                          <div className="md:col-span-2">
                            <a
                              href={result.entrevista.linkVirtual}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 min-h-[44px] text-accent-electric hover:text-white transition-colors"
                            >
                              <FaLink />
                              Enlace de videollamada
                            </a>
                          </div>
                        )}
                        {result.entrevista.indicaciones && (
                          <div className="md:col-span-2 bg-primary-950/60 border border-primary-700/50 p-4 mt-2">
                            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent-electric/80 mb-2">Indicaciones</p>
                            <p className="text-white text-sm whitespace-pre-line">
                              {result.entrevista.indicaciones}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Tarjeta de evaluación */}
                  {result.evaluacion && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="panel-hud !border-accent-energy/40 p-6"
                    >
                      <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                        <FaClipboardList className="text-accent-energy" />
                        Evaluación Técnica
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent-energy/80 mb-1">Disponible desde</p>
                          <p className="text-white font-medium">
                            {new Date(result.evaluacion.fechaDisponibleDesde).toLocaleDateString('es-PE')}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent-energy/80 mb-1">Disponible hasta</p>
                          <p className="text-white font-medium">
                            {new Date(result.evaluacion.fechaDisponibleHasta).toLocaleDateString('es-PE')}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent-energy/80 mb-1">Duración</p>
                          <p className="text-white font-medium">{result.evaluacion.duracion} minutos</p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent-energy/80 mb-1">Temas</p>
                          <p className="text-white font-medium">{result.evaluacion.temas}</p>
                        </div>
                        {result.evaluacion.enlace && (
                          <div className="md:col-span-2 mt-2">
                            <a
                              href={result.evaluacion.enlace}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-energy btn-hud gap-2"
                            >
                              <FaLink />
                              Iniciar evaluación
                            </a>
                          </div>
                        )}
                        {result.evaluacion.fechaRendida && (
                          <div className="md:col-span-2 bg-primary-950/60 border border-accent-energy/30 p-4 mt-2">
                            <p className="text-accent-energy text-sm">
                              Evaluación rendida el{' '}
                              {new Date(result.evaluacion.fechaRendida).toLocaleDateString('es-PE')}
                            </p>
                            {result.evaluacion.puntaje !== undefined && (
                              <p className="text-white font-medium mt-1">
                                Puntaje: {result.evaluacion.puntaje}
                                {result.evaluacion.aprobado !== undefined && (
                                  <span
                                    className={`ml-2 ${
                                      result.evaluacion.aprobado ? 'text-green-400' : 'text-red-400'
                                    }`}
                                  >
                                    ({result.evaluacion.aprobado ? 'Aprobado' : 'No aprobado'})
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                /* No encontrado */
                <div className="panel-hud p-8 text-center">
                  <div className="w-20 h-20 bg-red-500/10 border border-red-500/40 flex items-center justify-center mx-auto mb-4" style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}>
                    <FaTimesCircle className="text-3xl text-red-400" />
                  </div>
                  <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-red-400 mb-2">Sin registro</p>
                  <h2 className="text-xl font-display font-semibold text-white mb-2">No encontrado</h2>
                  <p className="text-primary-300 mb-6">
                    {result.mensaje || 'No se encontró ninguna postulación con el DNI ingresado.'}
                  </p>
                  <Link
                    to="/bolsa-trabajo"
                    className="btn-primary btn-hud gap-2"
                  >
                    <FaBriefcase />
                    Ver ofertas de trabajo
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Información adicional */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="border border-primary-800 bg-primary-900/30 p-6 text-center"
          >
            <p className="text-primary-400 text-sm">
              ¿Aún no has postulado?{' '}
              <Link to="/bolsa-trabajo" className="text-accent-electric hover:underline">
                Ver ofertas de trabajo disponibles
              </Link>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Componente de badge de estado
function EstadoBadge({ estado, large = false }: { estado: EstadoPostulacion; large?: boolean }) {
  const config = ESTADO_CONFIG[estado] || ESTADO_CONFIG.recibido

  const getIcon = () => {
    switch (estado) {
      case 'aprobado':
        return <FaCheckCircle />
      case 'no_seleccionado':
        return <FaTimesCircle />
      default:
        return <FaClock />
    }
  }

  return (
    <div
      className={`btn-hud inline-flex items-center gap-2 ${config.bgColor} ${config.color} font-mono uppercase tracking-[0.15em] font-semibold ${
        large ? 'px-6 py-3 text-sm md:text-base' : 'px-3 py-1 text-xs'
      }`}
    >
      {getIcon()}
      {config.label}
    </div>
  )
}

// Componente de Timeline
function TimelinePostulacion({ etapas }: { etapas: EtapaCronograma[] }) {
  const sortedEtapas = [...etapas].sort((a, b) => a.orden - b.orden)

  return (
    <div className="relative">
      {/* Línea vertical */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-accent-electric/30" />

      <div className="space-y-6">
        {sortedEtapas.map((etapa, index) => {
          const isActive = etapa.activa
          const isCompleted = etapa.completada

          return (
            <motion.div
              key={etapa.etapa}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative pl-12"
            >
              {/* Punto en la línea */}
              <div
                style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}
                className={`absolute left-0 w-8 h-8 flex items-center justify-center ${
                  isCompleted
                    ? 'bg-accent-success'
                    : isActive
                    ? 'bg-accent-electric animate-pulse'
                    : 'bg-primary-800 border border-primary-600'
                }`}
              >
                {isCompleted ? (
                  <FaCheckCircle className="text-primary-950 text-sm" />
                ) : isActive ? (
                  <div className="w-2.5 h-2.5 bg-primary-950" />
                ) : (
                  <div className="w-1.5 h-1.5 bg-primary-500" />
                )}
              </div>

              {/* Contenido */}
              <div
                className={`p-4 border ${
                  isActive
                    ? 'bg-accent-electric/10 border-accent-electric/40'
                    : isCompleted
                    ? 'bg-accent-success/10 border-accent-success/30'
                    : 'bg-primary-900/50 border-primary-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4
                    className={`font-medium ${
                      isActive ? 'text-accent-electric' : isCompleted ? 'text-accent-success' : 'text-white'
                    }`}
                  >
                    {etapa.nombre}
                  </h4>
                  {isActive && (
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase bg-accent-electric text-primary-950 px-2 py-0.5 font-bold">
                      Actual
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs text-primary-400">
                  {new Date(etapa.fechaInicio).toLocaleDateString('es-PE', {
                    day: 'numeric',
                    month: 'short'
                  })}{' '}
                  -{' '}
                  {new Date(etapa.fechaFin).toLocaleDateString('es-PE', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
                {etapa.descripcion && (
                  <p className="text-sm text-primary-300 mt-2">{etapa.descripcion}</p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
