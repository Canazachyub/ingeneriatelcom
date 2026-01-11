import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FaSearch, FaMapMarkerAlt, FaBriefcase, FaClock, FaArrowLeft, FaSpinner, FaExclamationTriangle, FaMoneyBillWave } from 'react-icons/fa'
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

const categories: Record<string, string> = {
  'Ingenieria': 'Ingenieria',
  'Tecnico': 'Tecnico',
  'TI': 'Tecnologia / TI',
  'Administracion': 'Administracion',
  'Finanzas': 'Finanzas',
  'RRHH': 'Recursos Humanos',
  'Operaciones': 'Operaciones',
  'Otros': 'Otros',
}

const modalities: Record<string, string> = {
  'Presencial': 'Presencial',
  'Remoto': 'Remoto',
  'Hibrido': 'Hibrido',
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modalityFilter, setModalityFilter] = useState('')

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
        // Solo mostrar trabajos activos
        const activeJobs = mappedJobs.filter(job => job.estado === 'activo')
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

  return (
    <div className="min-h-screen bg-primary-950 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary-400 hover:text-accent-electric transition-colors mb-4"
          >
            <FaArrowLeft />
            Volver al Inicio
          </Link>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
            Bolsa de Trabajo
          </h1>
          <p className="text-primary-300">
            Encuentra tu proxima oportunidad laboral con nosotros
          </p>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-700/50 p-6 mb-8"
        >
          <div className="grid md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" />
              <input
                type="text"
                placeholder="Buscar puesto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric transition-colors"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric transition-colors"
            >
              <option value="">Todas las categorias</option>
              {Object.entries(categories).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Modality Filter */}
            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
              className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric transition-colors"
            >
              <option value="">Todas las modalidades</option>
              {Object.entries(modalities).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <FaSpinner className="animate-spin text-4xl text-accent-electric mb-4" />
            <p className="text-primary-400">Cargando convocatorias...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadJobs}
              className="px-4 py-2 bg-accent-electric text-white rounded-lg hover:bg-accent-electric/90 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && (
          <>
            {/* Results Count */}
            <p className="text-primary-400 mb-6">
              {filteredJobs.length} {filteredJobs.length === 1 ? 'puesto encontrado' : 'puestos encontrados'}
            </p>

            {/* Jobs Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className={`bg-gradient-to-b from-primary-800/50 to-primary-900/50 backdrop-blur-sm rounded-xl border p-6 h-full flex flex-col hover:border-accent-electric/50 transition-all duration-300 ${
                    job.prioridad === 'alta' ? 'border-red-500/50' : 'border-primary-700/50'
                  }`}>
                    {/* Priority Badge */}
                    {job.prioridad === 'alta' && (
                      <span className="inline-flex items-center self-start gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full mb-3">
                        <FaExclamationTriangle className="text-xs" />
                        URGENTE
                      </span>
                    )}

                    {/* Category */}
                    <span className="text-xs text-accent-electric font-medium mb-2">
                      {categories[job.categoria] || job.categoria}
                    </span>

                    {/* Title */}
                    <h3 className="text-lg font-display font-semibold text-white mb-3">
                      {job.titulo}
                    </h3>

                    {/* Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-primary-300">
                        <FaMapMarkerAlt className="text-accent-electric" />
                        <span>{job.ubicacion}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-primary-300">
                        <FaBriefcase className="text-accent-electric" />
                        <span>{modalities[job.modalidad] || job.modalidad}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-accent-energy font-semibold">
                        <FaMoneyBillWave className="text-green-400" />
                        <span>{formatSalary(job.salario_min, job.salario_max)}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-primary-400 mb-4 flex-grow line-clamp-3">
                      {job.descripcion}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-primary-700/50">
                      <div className="flex items-center gap-2 text-xs text-primary-400">
                        <FaClock />
                        <span>{job.postulantes_count || 0} postulantes</span>
                      </div>
                      <Link
                        to={`/bolsa-trabajo/${job.id}`}
                        className="px-4 py-2 border-2 border-accent-electric text-accent-electric text-sm font-semibold rounded-lg hover:bg-accent-electric hover:text-primary-950 transition-all duration-300"
                      >
                        Ver Detalles
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Empty State */}
            {filteredJobs.length === 0 && (
              <div className="text-center py-12">
                <FaBriefcase className="text-5xl text-primary-600 mx-auto mb-4" />
                <p className="text-primary-400 text-lg mb-2">
                  No hay convocatorias disponibles en este momento.
                </p>
                <p className="text-primary-500 text-sm">
                  Vuelve pronto para ver nuevas oportunidades laborales.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
