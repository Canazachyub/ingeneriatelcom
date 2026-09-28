import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  FaSearch,
  FaMapMarkerAlt,
  FaBriefcase,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaUsers,
  FaBuilding,
  FaRocket,
  FaStar,
  FaClipboardCheck,
  FaFilter,
  FaTimes,
  FaCalendarAlt,
  FaArrowRight,
  FaIdCard,
  FaEnvelope
} from 'react-icons/fa'
import { api } from '../api/appScriptApi'
import PageHeader from '../components/common/PageHeader'
import HudFrame from '../components/effects/HudFrame'
import TiltCard from '../components/common/TiltCard'

// Estilo de campos coherente con el formulario de Contacto (terminal)
const inputHud =
  'w-full px-4 py-2.5 min-h-[44px] bg-primary-950/70 border border-primary-700/70 text-white placeholder-primary-500 ' +
  'focus:outline-none focus:border-accent-electric focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] transition-all'

// Chip HUD de datos de la oferta (igual que en la landing)
function Chip({ icon, children, tono = 'neutro' }: { icon: React.ReactNode; children: React.ReactNode; tono?: 'neutro' | 'energia' | 'alerta' }) {
  const estilos = {
    neutro: 'border-primary-600/50 bg-primary-900/60 text-primary-200',
    energia: 'border-accent-energy/40 bg-accent-energy/10 text-accent-energy',
    alerta: 'border-red-500/40 bg-red-500/10 text-red-300',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[11px] tracking-wide border ${estilos[tono]}`}>
      {icon}
      {children}
    </span>
  )
}

interface Job {
  id: string
  titulo: string
  categoria: string
  descripcion: string
  requisitos: string
  beneficios: string
  ubicacion: string
  modalidad: string
  salario_min: number
  salario_max: number
  estado: string
  prioridad: string
  fecha_publicacion: string
  fecha_cierre: string
  postulantes_count: number
  imagen?: string
}

const categories: Record<string, { label: string; color: string; bgColor: string; icon: JSX.Element }> = {
  'Ingenieria': { label: 'Ingeniería', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: <FaBuilding /> },
  'Tecnico': { label: 'Técnico', color: 'text-orange-400', bgColor: 'bg-orange-500/20', icon: <FaBriefcase /> },
  'TI': { label: 'Tecnología / TI', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: <FaRocket /> },
  'Administracion': { label: 'Administración', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: <FaClipboardCheck /> },
  'Finanzas': { label: 'Finanzas', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: <FaMoneyBillWave /> },
  'RRHH': { label: 'Recursos Humanos', color: 'text-pink-400', bgColor: 'bg-pink-500/20', icon: <FaUsers /> },
  'Operaciones': { label: 'Operaciones', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: <FaBriefcase /> },
  'Otros': { label: 'Otros', color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: <FaStar /> },
}

const modalities: Record<string, { label: string; color: string }> = {
  'Presencial': { label: 'Presencial', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'Remoto': { label: 'Remoto', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'Hibrido': { label: 'Híbrido', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modalityFilter, setModalityFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadJobs()
  }, [])

  useEffect(() => {
    document.title = 'Bolsa de Trabajo | Ingeniería Telcom EIRL — Empleos en Ingeniería, Software y TIC'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Bolsa de trabajo de Ingeniería Telcom EIRL. Encuentra empleos en ingeniería eléctrica, construcción, minería y software en Tacna, Cusco, Puno y el sur del Perú. Postula en línea.')
    }
    return () => {
      document.title = 'Ingeniería Telcom EIRL | Ingeniería eléctrica, construcción, minería y software'
      if (metaDesc) {
        metaDesc.setAttribute('content', 'Ingeniería Telcom EIRL — Software, Ingeniería Eléctrica, Minería y Soluciones TIC para el Perú. Bolsa de trabajo activa: empleos en ingeniería, tecnología y construcción.')
      }
    }
  }, [])

  const loadJobs = async () => {
    setIsLoading(true)
    setError('')

    try {
      const result = await api.getJobs()

      if (result.success && result.data) {
        const mappedJobs = (result.data as unknown[]).map((job: unknown) => {
          const j = job as Record<string, unknown>
          return {
            id: String(j.id || ''),
            titulo: String(j.titulo || j.title || ''),
            categoria: String(j.categoria || j.category || 'Otros'),
            descripcion: String(j.descripcion || j.description || ''),
            requisitos: String(j.requisitos || j.requirements || ''),
            beneficios: String(j.beneficios || j.benefits || ''),
            ubicacion: String(j.ubicacion || j.location || ''),
            modalidad: String(j.modalidad || j.modality || 'Presencial'),
            salario_min: Number(j.salario_min || j.salaryMin || 0),
            salario_max: Number(j.salario_max || j.salaryMax || 0),
            estado: String(j.estado || j.status || 'activo'),
            prioridad: String(j.prioridad || j.priority || 'media'),
            fecha_publicacion: String(j.fecha_publicacion || j.publishedAt || ''),
            fecha_cierre: String(j.fecha_cierre || j.closingDate || ''),
            postulantes_count: Number(j.postulantes_count || j.applicationsCount || 0),
            imagen: String(j.imagen || j.image || ''),
          }
        })
        const activeJobs = mappedJobs.filter(job => job.estado === 'activo')
        // Ordenar: urgentes primero
        activeJobs.sort((a, b) => {
          if (a.prioridad === 'alta' && b.prioridad !== 'alta') return -1
          if (b.prioridad === 'alta' && a.prioridad !== 'alta') return 1
          return 0
        })
        setJobs(activeJobs)
      } else {
        setJobs([])
      }
    } catch (err) {
      console.error('Error loading jobs:', err)
      setError('Error al cargar las convocatorias')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.ubicacion.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || job.categoria === categoryFilter
    const matchesModality = !modalityFilter || job.modalidad === modalityFilter
    return matchesSearch && matchesCategory && matchesModality
  })

  const formatSalary = (min: number, max: number) => {
    if (!min && !max) return 'A convenir'
    if (min && max) return `S/${min.toLocaleString()} - S/${max.toLocaleString()}`
    if (min) return `Desde S/${min.toLocaleString()}`
    return `Hasta S/${max.toLocaleString()}`
  }

  const getDaysRemaining = (dateStr: string) => {
    if (!dateStr) return null
    try {
      const closeDate = new Date(dateStr)
      const today = new Date()
      const diffTime = closeDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays > 0 ? diffDays : 0
    } catch {
      return null
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setCategoryFilter('')
    setModalityFilter('')
  }

  const hasActiveFilters = searchTerm || categoryFilter || modalityFilter

  const urgentCount = jobs.filter(j => j.prioridad === 'alta').length

  return (
    <div className="min-h-screen bg-primary-950">
      <PageHeader
        eyebrow="Únete al equipo"
        title="Bolsa de trabajo"
        subtitle="Encuentra tu próxima oportunidad laboral en Ingeniería Telcom. Únete a nuestro equipo de profesionales."
        migas={[{ label: 'Inicio', to: '/' }, { label: 'Bolsa de trabajo' }]}
        accent="energy"
        metrica={
          <>
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-white tabular-nums">{jobs.length}</div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mt-1">Vacantes activas</div>
            </div>
            {urgentCount > 0 && (
              <div className="text-center pl-6 border-l border-primary-700/60">
                <div className="text-4xl font-display font-bold text-accent-energy tabular-nums">{urgentCount}</div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mt-1">Urgentes</div>
              </div>
            )}
          </>
        }
      />

      {/* Barra de búsqueda y filtros */}
      <div className="bg-primary-950/90 border-b border-primary-800/70 sticky top-20 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 gap-3">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" />
              <input
                type="text"
                placeholder="Buscar puesto, ubicación..."
                aria-label="Buscar puesto o ubicación"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${inputHud} pl-11`}
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
                className={`btn-hud flex items-center gap-2 min-h-[44px] px-4 py-2.5 border font-mono text-xs tracking-[0.15em] uppercase transition-all ${
                  showFilters || hasActiveFilters
                    ? 'bg-accent-electric/15 border-accent-electric text-accent-electric'
                    : 'bg-primary-900/60 border-primary-700 text-primary-300 hover:border-accent-electric/50'
                }`}
              >
                <FaFilter className="text-sm" />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveFilters && (
                  <span className="w-5 h-5 bg-accent-electric text-primary-950 text-[11px] font-bold flex items-center justify-center">
                    {[searchTerm, categoryFilter, modalityFilter].filter(Boolean).length}
                  </span>
                )}
              </button>

              <Link
                to="/mi-postulacion"
                title="¿Ya postulaste? Consulta el estado de tu postulación aquí"
                className="btn-hud flex items-center gap-2 min-h-[44px] px-4 py-2.5 bg-accent-energy/10 border border-accent-energy/50 text-accent-energy font-mono text-xs tracking-[0.15em] uppercase hover:bg-accent-energy/20 transition-all"
              >
                <FaIdCard />
                <span className="hidden sm:inline">Consultar postulación</span>
              </Link>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pb-4 flex flex-wrap gap-3">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Filtrar por categoría"
                    className={`${inputHud} w-auto cursor-pointer`}
                  >
                    <option value="">Todas las categorías</option>
                    {Object.entries(categories).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  <select
                    value={modalityFilter}
                    onChange={(e) => setModalityFilter(e.target.value)}
                    aria-label="Filtrar por modalidad"
                    className={`${inputHud} w-auto cursor-pointer`}
                  >
                    <option value="">Todas las modalidades</option>
                    {Object.entries(modalities).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 font-mono text-xs tracking-[0.15em] uppercase text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <FaTimes />
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Cargando: esqueletos con la forma de las tarjetas */}
        {isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Cargando convocatorias">
            {[0, 1, 2].map((i) => (
              <div key={i} className="panel-hud h-80 p-5 animate-pulse">
                <div className="h-28 bg-primary-800/50 mb-4" />
                <div className="h-3 w-24 bg-primary-700/60 mb-3" />
                <div className="h-5 w-3/4 bg-primary-700/60 mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-primary-800/70" />
                  <div className="h-6 w-24 bg-primary-800/70" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
            <HudFrame color="border-red-500/50">
              <div className="panel-hud text-center px-6 py-10">
                <div className="w-16 h-16 mx-auto mb-5 flex items-center justify-center border border-red-500/40 bg-red-500/10">
                  <FaExclamationTriangle className="text-3xl text-red-400" />
                </div>
                <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-red-400 mb-2">Error de enlace</p>
                <h3 className="text-xl font-display text-white font-semibold mb-2">No pudimos cargar las convocatorias</h3>
                <p className="text-primary-300 mb-6">{error}</p>
                <button onClick={loadJobs} className="btn-primary btn-hud">
                  Reintentar
                </button>
              </div>
            </HudFrame>
          </motion.div>
        )}

        {!isLoading && !error && (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-primary-400">
                <span className="text-accent-energy font-bold">{String(filteredJobs.length).padStart(2, '0')}</span>{' '}
                {filteredJobs.length === 1 ? 'puesto encontrado' : 'puestos encontrados'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job, index) => {
                const categoryInfo = categories[job.categoria] || categories['Otros']
                const modalityInfo = modalities[job.modalidad] || modalities['Presencial']
                const daysRemaining = getDaysRemaining(job.fecha_cierre)
                const urgente = job.prioridad === 'alta'

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <TiltCard>
                      <Link
                        to={`/bolsa-trabajo/${job.id}`}
                        className={`panel-hud group h-full flex flex-col overflow-hidden ${urgente ? '!border-accent-energy/50' : ''}`}
                      >
                        {/* Cabecera: imagen o banda de categoría */}
                        <div className="relative h-36 overflow-hidden">
                          {job.imagen ? (
                            <img
                              src={job.imagen}
                              alt={job.titulo}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-full h-full bg-[radial-gradient(circle_at_30%_40%,rgba(0,212,255,0.25),transparent_60%),linear-gradient(135deg,#0f2847,#0a1628)] flex items-center justify-center">
                              <span className="text-5xl text-accent-electric/25">{categoryInfo.icon}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-primary-950 via-primary-950/30 to-transparent" />
                          <div className="absolute top-3 left-3 flex items-center gap-2">
                            <span className="font-mono text-[10px] tracking-[0.25em] px-2 py-1 bg-primary-950/80 border border-accent-electric/40 text-accent-electric">
                              MISIÓN {String(index + 1).padStart(2, '0')}
                            </span>
                            {urgente && (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.2em] px-2 py-1 bg-accent-energy text-primary-950 font-bold">
                                <FaExclamationTriangle /> URGENTE
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-5 pt-3 flex-1 flex flex-col">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] uppercase text-accent-electric/80 mb-1.5">
                            {categoryInfo.icon}
                            {categoryInfo.label}
                          </span>
                          <h3 className="text-lg font-display font-semibold text-white mb-3 leading-snug group-hover:text-accent-electric transition-colors duration-300">
                            {job.titulo}
                          </h3>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {job.ubicacion && (
                              <Chip icon={<FaMapMarkerAlt className="text-accent-electric" />}>{job.ubicacion}</Chip>
                            )}
                            <Chip icon={<FaBriefcase className="text-accent-electric" />}>{modalityInfo.label}</Chip>
                            <Chip icon={<FaMoneyBillWave />} tono="energia">
                              {formatSalary(job.salario_min, job.salario_max)}
                            </Chip>
                            {daysRemaining !== null && daysRemaining > 0 && (
                              <Chip
                                icon={<FaCalendarAlt className={daysRemaining <= 3 ? 'text-red-400' : 'text-accent-electric'} />}
                                tono={daysRemaining <= 3 ? 'alerta' : 'neutro'}
                              >
                                {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} restantes
                              </Chip>
                            )}
                          </div>

                          <p className="text-sm text-primary-300 mb-5 flex-grow line-clamp-2">
                            {job.descripcion}
                          </p>

                          <span className="mt-auto inline-flex items-center justify-between pt-4 border-t border-primary-700/50 text-sm font-semibold text-accent-energy">
                            Ver detalle y postular
                            <FaArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
                          </span>
                        </div>
                      </Link>
                    </TiltCard>
                  </motion.div>
                )
              })}
            </div>

            {/* Estados vacíos */}
            {filteredJobs.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
                {jobs.length === 0 ? (
                  /* Sin ninguna vacante publicada */
                  <HudFrame color="border-accent-energy/50">
                    <div className="panel-hud relative overflow-hidden text-center px-6 py-12 md:px-12">
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 opacity-[0.05] pointer-events-none"
                        style={{
                          backgroundImage:
                            'linear-gradient(rgba(251,191,36,1) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,1) 1px, transparent 1px)',
                          backgroundSize: '32px 32px',
                        }}
                      />
                      <div className="relative">
                        <div className="w-16 h-16 mx-auto mb-5 flex items-center justify-center border border-accent-energy/40 bg-accent-energy/10 text-accent-energy text-3xl" style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}>
                          <FaBriefcase />
                        </div>
                        <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent-energy mb-3">
                          Estado · sin misiones activas
                        </p>
                        <h3 className="text-2xl font-display font-semibold text-white mb-3">
                          Próximamente nuevas oportunidades
                        </h3>
                        <p className="text-primary-300 mb-8 max-w-md mx-auto leading-relaxed">
                          En este momento no tenemos vacantes publicadas, pero constantemente buscamos talento.
                          Déjanos tu información y te contactaremos cuando surja una oportunidad.
                        </p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                          <a
                            href="mailto:energysupervision13@gmail.com?subject=Postulación Espontánea&body=Hola, me interesa formar parte del equipo de Ingeniería Telcom EIRL. Adjunto mi CV."
                            className="btn-energy btn-hud gap-2"
                          >
                            <FaEnvelope className="text-lg" />
                            Enviar CV espontáneo
                          </a>
                          <Link to="/mi-postulacion" className="btn-secondary btn-hud gap-2">
                            <FaIdCard />
                            Consultar postulación
                          </Link>
                        </div>
                      </div>
                    </div>
                  </HudFrame>
                ) : (
                  /* Hay vacantes pero el filtro no devuelve ninguna */
                  <div className="panel-hud text-center px-6 py-12">
                    <div className="w-16 h-16 mx-auto mb-5 flex items-center justify-center border border-primary-600/60 bg-primary-900/60">
                      <FaSearch className="text-3xl text-primary-400" />
                    </div>
                    <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-primary-400 mb-3">Sin coincidencias</p>
                    <h3 className="text-xl font-display font-semibold text-white mb-3">
                      No encontramos resultados para tu búsqueda
                    </h3>
                    <p className="text-primary-400 mb-6 max-w-md mx-auto">
                      Intenta con otros filtros o términos de búsqueda.
                    </p>
                    <button onClick={clearFilters} className="btn-secondary btn-hud">
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
