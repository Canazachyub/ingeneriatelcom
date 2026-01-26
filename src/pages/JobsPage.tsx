import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  FaSearch,
  FaMapMarkerAlt,
  FaBriefcase,
  FaArrowLeft,
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
  FaIdCard
} from 'react-icons/fa'
import { api } from '../api/appScriptApi'

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
}

const categories: Record<string, { label: string; color: string; bgColor: string; icon: JSX.Element }> = {
  'Ingenieria': { label: 'Ingenieria', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: <FaBuilding /> },
  'Tecnico': { label: 'Tecnico', color: 'text-orange-400', bgColor: 'bg-orange-500/20', icon: <FaBriefcase /> },
  'TI': { label: 'Tecnologia / TI', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: <FaRocket /> },
  'Administracion': { label: 'Administracion', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: <FaClipboardCheck /> },
  'Finanzas': { label: 'Finanzas', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: <FaMoneyBillWave /> },
  'RRHH': { label: 'Recursos Humanos', color: 'text-pink-400', bgColor: 'bg-pink-500/20', icon: <FaUsers /> },
  'Operaciones': { label: 'Operaciones', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: <FaBriefcase /> },
  'Otros': { label: 'Otros', color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: <FaStar /> },
}

const modalities: Record<string, { label: string; color: string }> = {
  'Presencial': { label: 'Presencial', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'Remoto': { label: 'Remoto', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'Hibrido': { label: 'Hibrido', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
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
    <div className="min-h-screen bg-gradient-to-b from-primary-950 via-primary-900 to-primary-950">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-accent-electric via-blue-600 to-purple-600 pt-24 pb-16">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6 group"
            >
              <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
              Volver al Inicio
            </Link>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4 drop-shadow-lg">
                  Bolsa de Trabajo
                </h1>
                <p className="text-xl text-white/90 max-w-2xl">
                  Encuentra tu proxima oportunidad laboral en Ingenieria Telcom.
                  Unete a nuestro equipo de profesionales.
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white">{jobs.length}</div>
                  <div className="text-white/70 text-sm">Vacantes Activas</div>
                </div>
                {urgentCount > 0 && (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-red-300">{urgentCount}</div>
                    <div className="text-white/70 text-sm">Urgentes</div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-primary-900/80 border-b border-primary-700/50 sticky top-16 z-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 gap-4">
            {/* Search - Always visible */}
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" />
              <input
                type="text"
                placeholder="Buscar puesto, ubicacion..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-primary-800/50 border border-primary-700 rounded-xl text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric transition-all"
              />
            </div>

            {/* Filter Toggle & Consult Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  showFilters || hasActiveFilters
                    ? 'bg-accent-electric/20 border-accent-electric text-accent-electric'
                    : 'bg-primary-800/50 border-primary-700 text-primary-300 hover:border-primary-600'
                }`}
              >
                <FaFilter className="text-sm" />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveFilters && (
                  <span className="w-5 h-5 bg-accent-electric text-white text-xs rounded-full flex items-center justify-center">
                    {[searchTerm, categoryFilter, modalityFilter].filter(Boolean).length}
                  </span>
                )}
              </button>

              <Link
                to="/mi-postulacion"
                className="flex items-center gap-2 px-4 py-2.5 bg-accent-energy/20 border border-accent-energy/50 text-accent-energy rounded-xl hover:bg-accent-energy/30 transition-all"
              >
                <FaIdCard />
                <span className="hidden sm:inline">Consultar Postulacion</span>
              </Link>
            </div>
          </div>

          {/* Expandable Filters */}
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
                    className="px-4 py-2.5 bg-primary-800/50 border border-primary-700 rounded-xl text-white focus:outline-none focus:border-accent-electric transition-all cursor-pointer"
                  >
                    <option value="">Todas las categorias</option>
                    {Object.entries(categories).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  <select
                    value={modalityFilter}
                    onChange={(e) => setModalityFilter(e.target.value)}
                    className="px-4 py-2.5 bg-primary-800/50 border border-primary-700 rounded-xl text-white focus:outline-none focus:border-accent-electric transition-all cursor-pointer"
                  >
                    <option value="">Todas las modalidades</option>
                    {Object.entries(modalities).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-accent-electric/20 rounded-full" />
              <div className="w-20 h-20 border-4 border-accent-electric border-t-transparent rounded-full animate-spin absolute inset-0" />
            </div>
            <p className="text-primary-400 mt-6 text-lg">Cargando convocatorias...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaExclamationTriangle className="text-4xl text-red-400" />
            </div>
            <h3 className="text-xl text-white font-semibold mb-2">Error al cargar</h3>
            <p className="text-red-400 mb-6">{error}</p>
            <button
              onClick={loadJobs}
              className="px-6 py-3 bg-accent-electric text-white rounded-xl hover:bg-accent-electric/90 transition-colors font-medium"
            >
              Reintentar
            </button>
          </motion.div>
        )}

        {/* Results */}
        {!isLoading && !error && (
          <>
            {/* Results Count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-primary-400">
                <span className="text-white font-semibold">{filteredJobs.length}</span> {filteredJobs.length === 1 ? 'puesto encontrado' : 'puestos encontrados'}
              </p>
            </div>

            {/* Jobs Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job, index) => {
                const categoryInfo = categories[job.categoria] || categories['Otros']
                const modalityInfo = modalities[job.modalidad] || modalities['Presencial']
                const daysRemaining = getDaysRemaining(job.fecha_cierre)

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link to={`/bolsa-trabajo/${job.id}`} className="block h-full">
                      <div className={`relative bg-gradient-to-b from-primary-800/50 to-primary-900/50 backdrop-blur-sm rounded-2xl border p-6 h-full flex flex-col transition-all duration-300 group hover:scale-[1.02] hover:shadow-xl hover:shadow-accent-electric/10 ${
                        job.prioridad === 'alta'
                          ? 'border-red-500/50 hover:border-red-500'
                          : 'border-primary-700/50 hover:border-accent-electric/50'
                      }`}>
                        {/* Urgent Badge */}
                        {job.prioridad === 'alta' && (
                          <div className="absolute -top-3 -right-3">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                              <FaExclamationTriangle className="text-xs" />
                              URGENTE
                            </span>
                          </div>
                        )}

                        {/* Category & Modality */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${categoryInfo.bgColor} ${categoryInfo.color}`}>
                            {categoryInfo.icon}
                            {categoryInfo.label}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg border ${modalityInfo.color}`}>
                            {modalityInfo.label}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-display font-bold text-white mb-3 group-hover:text-accent-electric transition-colors">
                          {job.titulo}
                        </h3>

                        {/* Details */}
                        <div className="space-y-2.5 mb-4">
                          <div className="flex items-center gap-2 text-sm text-primary-300">
                            <FaMapMarkerAlt className="text-primary-500 flex-shrink-0" />
                            <span>{job.ubicacion}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <FaMoneyBillWave className="text-green-400 flex-shrink-0" />
                            <span className="text-green-400">{formatSalary(job.salario_min, job.salario_max)}</span>
                          </div>
                          {daysRemaining !== null && daysRemaining > 0 && (
                            <div className={`flex items-center gap-2 text-sm ${daysRemaining <= 3 ? 'text-red-400' : 'text-primary-400'}`}>
                              <FaCalendarAlt className={daysRemaining <= 3 ? 'text-red-400' : 'text-primary-500'} />
                              <span>{daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'} restantes</span>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-primary-400 mb-4 flex-grow line-clamp-2">
                          {job.descripcion}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-primary-700/50">
                          <div className="flex items-center gap-2 text-sm text-primary-400">
                            <FaUsers className="text-primary-500" />
                            <span>{job.postulantes_count || 0} postulantes</span>
                          </div>
                          <span className="flex items-center gap-1 text-accent-electric font-semibold text-sm group-hover:gap-2 transition-all">
                            Ver mas <FaArrowRight className="text-xs" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>

            {/* Empty State */}
            {filteredJobs.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 bg-primary-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaBriefcase className="text-5xl text-primary-600" />
                </div>
                <h3 className="text-xl font-display font-semibold text-white mb-2">
                  {hasActiveFilters ? 'No se encontraron resultados' : 'No hay vacantes disponibles'}
                </h3>
                <p className="text-primary-400 mb-6 max-w-md mx-auto">
                  {hasActiveFilters
                    ? 'Intenta con otros filtros o terminos de busqueda.'
                    : 'Vuelve pronto para ver nuevas oportunidades laborales.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 bg-accent-electric text-white rounded-xl hover:bg-accent-electric/90 transition-colors font-medium"
                  >
                    Limpiar filtros
                  </button>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
