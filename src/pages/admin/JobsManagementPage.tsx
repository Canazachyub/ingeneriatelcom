import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaCheck,
  FaEye,
  FaEyeSlash,
  FaBriefcase,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaUsers,
  FaExclamationTriangle,
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'

interface JobData {
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

const categories = [
  { value: 'Ingenieria', label: 'Ingenieria' },
  { value: 'Tecnico', label: 'Tecnico' },
  { value: 'TI', label: 'Tecnologia / TI' },
  { value: 'Administracion', label: 'Administracion' },
  { value: 'Finanzas', label: 'Finanzas' },
  { value: 'RRHH', label: 'Recursos Humanos' },
  { value: 'Operaciones', label: 'Operaciones' },
  { value: 'Otros', label: 'Otros' },
]

const cities = ['Tacna', 'Puno', 'Juliaca', 'Arequipa', 'Moquegua', 'Lima', 'Cusco', 'Ilo']

const modalities = [
  { value: 'Presencial', label: 'Presencial' },
  { value: 'Remoto', label: 'Remoto' },
  { value: 'Hibrido', label: 'Hibrido' },
]

const priorities = [
  { value: 'alta', label: 'Alta (Urgente)', color: 'text-red-400 bg-red-500/20' },
  { value: 'media', label: 'Media', color: 'text-yellow-400 bg-yellow-500/20' },
  { value: 'baja', label: 'Baja', color: 'text-green-400 bg-green-500/20' },
]

export default function JobsManagementPage() {
  const [jobs, setJobs] = useState<JobData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState<JobData | null>(null)
  const [formData, setFormData] = useState({
    titulo: '',
    categoria: 'Ingenieria',
    descripcion: '',
    requisitos: '',
    beneficios: '',
    ubicacion: 'Tacna',
    modalidad: 'Presencial',
    salario_min: '',
    salario_max: '',
    prioridad: 'media',
    fecha_cierre: '',
    estado: 'activo',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    setIsLoading(true)
    const result = await api.getJobsAdmin()
    setIsLoading(false)

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
      setJobs(mappedJobs)
    } else {
      setJobs([])
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || job.estado === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleOpenModal = (job?: JobData) => {
    if (job) {
      setEditingJob(job)
      setFormData({
        titulo: job.titulo,
        categoria: job.categoria,
        descripcion: job.descripcion,
        requisitos: job.requisitos,
        beneficios: job.beneficios,
        ubicacion: job.ubicacion,
        modalidad: job.modalidad,
        salario_min: job.salario_min ? String(job.salario_min) : '',
        salario_max: job.salario_max ? String(job.salario_max) : '',
        prioridad: job.prioridad,
        fecha_cierre: job.fecha_cierre ? job.fecha_cierre.split('T')[0] : '',
        estado: job.estado,
      })
    } else {
      setEditingJob(null)
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      setFormData({
        titulo: '',
        categoria: 'Ingenieria',
        descripcion: '',
        requisitos: '',
        beneficios: '',
        ubicacion: 'Tacna',
        modalidad: 'Presencial',
        salario_min: '',
        salario_max: '',
        prioridad: 'media',
        fecha_cierre: nextMonth.toISOString().split('T')[0],
        estado: 'activo',
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage({ type: '', text: '' })

    const jobData = {
      titulo: formData.titulo,
      categoria: formData.categoria,
      descripcion: formData.descripcion,
      requisitos: formData.requisitos,
      beneficios: formData.beneficios,
      ubicacion: formData.ubicacion,
      modalidad: formData.modalidad,
      salario_min: formData.salario_min ? Number(formData.salario_min) : 0,
      salario_max: formData.salario_max ? Number(formData.salario_max) : 0,
      prioridad: formData.prioridad,
      fecha_cierre: formData.fecha_cierre,
      estado: formData.estado,
    }

    let result
    if (editingJob) {
      result = await api.updateJobAdmin(editingJob.id, jobData)
    } else {
      result = await api.createJobAdmin(jobData)
    }

    setIsSaving(false)

    if (result.success) {
      setMessage({ type: 'success', text: editingJob ? 'Convocatoria actualizada exitosamente' : 'Convocatoria creada exitosamente' })
      setShowModal(false)
      loadJobs()
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al guardar la convocatoria' })
    }
  }

  const handleDelete = async (job: JobData) => {
    if (!confirm(`¿Eliminar la convocatoria "${job.titulo}"?\n\nEsta accion no se puede deshacer.`)) return

    const result = await api.deleteJobAdmin(job.id)
    if (result.success) {
      setMessage({ type: 'success', text: 'Convocatoria eliminada' })
      loadJobs()
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al eliminar' })
    }
  }

  const handleToggleStatus = async (job: JobData) => {
    const newStatus = job.estado === 'activo' ? 'inactivo' : 'activo'
    const result = await api.updateJobAdmin(job.id, { estado: newStatus })
    if (result.success) {
      loadJobs()
      setMessage({ type: 'success', text: `Convocatoria ${newStatus === 'activo' ? 'activada' : 'desactivada'}` })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const getStatusBadge = (status: string) => {
    const isActive = status === 'activo'
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
        {isActive ? 'Activa' : 'Inactiva'}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const p = priorities.find((pr) => pr.value === priority) || priorities[1]
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.color}`}>
        {priority === 'alta' && <FaExclamationTriangle className="inline mr-1" />}
        {p.label}
      </span>
    )
  }

  const formatSalary = (min: number, max: number) => {
    if (!min && !max) return 'A convenir'
    if (min && max) return `S/${min.toLocaleString()} - S/${max.toLocaleString()}`
    if (min) return `Desde S/${min.toLocaleString()}`
    return `Hasta S/${max.toLocaleString()}`
  }

  const activeCount = jobs.filter((j) => j.estado === 'activo').length
  const totalApplications = jobs.reduce((sum, j) => sum + (j.postulantes_count || 0), 0)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <FaBriefcase className="text-accent-electric" />
              Bolsa de Trabajo
            </h1>
            <p className="text-primary-400">Gestiona las convocatorias de empleo</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-accent-electric text-white rounded-lg hover:bg-accent-electric/90 transition-colors"
          >
            <FaPlus />
            Nueva Convocatoria
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-4">
            <p className="text-primary-400 text-sm">Total</p>
            <p className="text-2xl font-bold text-white">{jobs.length}</p>
          </div>
          <div className="bg-green-500/10 backdrop-blur-sm rounded-xl border border-green-500/30 p-4">
            <p className="text-green-400 text-sm">Activas</p>
            <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          </div>
          <div className="bg-red-500/10 backdrop-blur-sm rounded-xl border border-red-500/30 p-4">
            <p className="text-red-400 text-sm">Urgentes</p>
            <p className="text-2xl font-bold text-red-400">{jobs.filter((j) => j.prioridad === 'alta').length}</p>
          </div>
          <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl border border-blue-500/30 p-4">
            <p className="text-blue-400 text-sm">Postulaciones</p>
            <p className="text-2xl font-bold text-blue-400">{totalApplications}</p>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por titulo, ciudad o categoria..."
              className="w-full pl-10 pr-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activas</option>
            <option value="inactivo">Inactivas</option>
          </select>
        </div>

        {/* Jobs List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-3xl text-accent-electric" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <FaBriefcase className="text-5xl text-primary-600 mx-auto mb-4" />
            <p className="text-primary-400">No se encontraron convocatorias</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 text-accent-electric hover:underline"
            >
              Crear la primera convocatoria
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-primary-900/50 backdrop-blur-sm rounded-xl border p-5 ${
                  job.prioridad === 'alta' ? 'border-red-500/50' : 'border-primary-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {job.prioridad === 'alta' && getPriorityBadge(job.prioridad)}
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent-electric/20 text-accent-electric">
                        {job.categoria}
                      </span>
                      {getStatusBadge(job.estado)}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{job.titulo}</h3>
                    <p className="text-primary-300 text-sm mb-3 line-clamp-2">{job.descripcion}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-primary-400">
                      <span className="flex items-center gap-1">
                        <FaMapMarkerAlt className="text-accent-electric" />
                        {job.ubicacion}
                      </span>
                      <span>{job.modalidad}</span>
                      <span className="flex items-center gap-1">
                        <FaMoneyBillWave className="text-green-400" />
                        {formatSalary(job.salario_min, job.salario_max)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaUsers className="text-blue-400" />
                        {job.postulantes_count || 0} postulantes
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(job)}
                      className={`p-2 rounded-lg transition-colors ${
                        job.estado === 'activo'
                          ? 'text-green-400 hover:bg-green-500/20'
                          : 'text-red-400 hover:bg-red-500/20'
                      }`}
                      title={job.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    >
                      {job.estado === 'activo' ? <FaEye /> : <FaEyeSlash />}
                    </button>
                    <button
                      onClick={() => handleOpenModal(job)}
                      className="p-2 text-primary-400 hover:text-accent-electric hover:bg-primary-800 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(job)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Job Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-primary-900 rounded-xl border border-primary-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-primary-800 sticky top-0 bg-primary-900 z-10">
                  <h2 className="text-xl font-display font-semibold text-white">
                    {editingJob ? 'Editar Convocatoria' : 'Nueva Convocatoria'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-primary-400 hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Titulo y Categoria */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Titulo del Puesto *
                      </label>
                      <input
                        type="text"
                        value={formData.titulo}
                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        required
                        placeholder="Ej: Ingeniero Electricista Senior"
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Categoria *
                      </label>
                      <select
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Descripcion */}
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1">
                      Descripcion del Puesto *
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      required
                      rows={4}
                      placeholder="Describe las responsabilidades y funciones del puesto..."
                      className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric resize-none"
                    />
                  </div>

                  {/* Requisitos */}
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1">
                      Requisitos *
                    </label>
                    <textarea
                      value={formData.requisitos}
                      onChange={(e) => setFormData({ ...formData, requisitos: e.target.value })}
                      required
                      rows={3}
                      placeholder="Separar cada requisito con | (Ej: Titulo universitario|3 anos de experiencia|Licencia de conducir)"
                      className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric resize-none"
                    />
                    <p className="text-xs text-primary-500 mt-1">Usa | para separar requisitos</p>
                  </div>

                  {/* Beneficios */}
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1">
                      Beneficios
                    </label>
                    <textarea
                      value={formData.beneficios}
                      onChange={(e) => setFormData({ ...formData, beneficios: e.target.value })}
                      rows={2}
                      placeholder="Ej: Sueldo competitivo|Seguro de salud|Capacitaciones"
                      className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric resize-none"
                    />
                    <p className="text-xs text-primary-500 mt-1">Usa | para separar beneficios</p>
                  </div>

                  {/* Ubicacion y Modalidad */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Ciudad *
                      </label>
                      <select
                        value={formData.ubicacion}
                        onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                        required
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        {cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Modalidad
                      </label>
                      <select
                        value={formData.modalidad}
                        onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        {modalities.map((mod) => (
                          <option key={mod.value} value={mod.value}>
                            {mod.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Salario */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Salario Minimo (S/)
                      </label>
                      <input
                        type="number"
                        value={formData.salario_min}
                        onChange={(e) => setFormData({ ...formData, salario_min: e.target.value })}
                        placeholder="Ej: 3000"
                        min="0"
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Salario Maximo (S/)
                      </label>
                      <input
                        type="number"
                        value={formData.salario_max}
                        onChange={(e) => setFormData({ ...formData, salario_max: e.target.value })}
                        placeholder="Ej: 5000"
                        min="0"
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                  </div>

                  {/* Prioridad, Fecha Cierre, Estado */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Prioridad
                      </label>
                      <select
                        value={formData.prioridad}
                        onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        {priorities.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Fecha de Cierre
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_cierre}
                        onChange={(e) => setFormData({ ...formData, fecha_cierre: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Estado
                      </label>
                      <select
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        <option value="activo">Activa (visible)</option>
                        <option value="inactivo">Inactiva (oculta)</option>
                      </select>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-primary-800">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-primary-300 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-2 bg-accent-electric text-white rounded-lg hover:bg-accent-electric/90 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                      {editingJob ? 'Actualizar' : 'Crear Convocatoria'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}
