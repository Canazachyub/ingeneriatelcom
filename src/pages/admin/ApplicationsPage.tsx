import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaSearch,
  FaSpinner,
  FaTimes,
  FaCheck,
  FaTimesCircle,
  FaClock,
  FaEye,
  FaDownload,
  FaEnvelope,
  FaPhone,
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'

// Interface local para las postulaciones (estructura nueva)
interface ApplicationData {
  id: string
  jobId: string
  jobTitle: string
  fullName: string
  dni: string
  email: string
  phone: string
  linkedIn: string
  coverLetter: string
  expectedSalary: string
  availability: string
  cvUrl: string
  status: string
  notes: string
  createdAt: string
  updatedAt: string
}

const statusOptions = [
  { value: 'pending', label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'reviewing', label: 'En Revision', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'interview', label: 'Entrevista', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'accepted', label: 'Aceptado', color: 'bg-green-500/20 text-green-400' },
  { value: 'rejected', label: 'Rechazado', color: 'bg-red-500/20 text-red-400' },
]

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<ApplicationData | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    setIsLoading(true)
    const result = await api.getApplicationsAdmin()
    setIsLoading(false)

    if (result.success && result.data) {
      // Mapear campos de la API a la estructura del componente
      // Soporta estructura nueva (jobId, fullName, phone, status) y antigua (convocatoria_id, nombre_completo, telefono, estado)
      const mappedApplications = (result.data as unknown[]).map((app: unknown) => {
        const a = app as Record<string, unknown>
        return {
          id: String(a.id || ''),
          jobId: String(a.jobId || a.convocatoria_id || ''),
          jobTitle: String(a.jobTitle || a.titulo_convocatoria || 'Sin puesto'),
          fullName: String(a.fullName || a.nombre_completo || ''),
          dni: String(a.dni || ''),
          email: String(a.email || ''),
          phone: String(a.phone || a.telefono || ''),
          linkedIn: String(a.linkedIn || a.linkedin || ''),
          coverLetter: String(a.coverLetter || a.carta_presentacion || ''),
          expectedSalary: String(a.expectedSalary || a.pretension_salarial || ''),
          availability: String(a.availability || a.disponibilidad || ''),
          cvUrl: String(a.cvUrl || a.cv_url || ''),
          status: mapStatus(String(a.status || a.estado || 'pending')),
          notes: String(a.notes || a.observaciones || ''),
          createdAt: formatApiDate(a.createdAt || a.fecha_postulacion),
          updatedAt: formatApiDate(a.updatedAt || a.createdAt || a.fecha_postulacion),
        }
      })
      setApplications(mappedApplications)
    } else {
      setApplications([])
    }
  }

  // Mapear estados en español a los valores del componente
  const mapStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pendiente': 'pending',
      'pending': 'pending',
      'en_revision': 'reviewing',
      'revision': 'reviewing',
      'revisado': 'reviewing',
      'reviewing': 'reviewing',
      'entrevista': 'interview',
      'interview': 'interview',
      'rechazado': 'rejected',
      'rejected': 'rejected',
      'contratado': 'accepted',
      'aceptado': 'accepted',
      'accepted': 'accepted',
    }
    return statusMap[status.toLowerCase()] || status
  }

  // Formatear fecha de la API
  const formatApiDate = (date: unknown): string => {
    if (!date) return new Date().toISOString()
    if (typeof date === 'string') return date
    if (date instanceof Date) return date.toISOString()
    return String(date)
  }

  const filteredApplications = applications.filter((app) => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      !searchTerm ||
      (app.fullName?.toLowerCase() || '').includes(search) ||
      (app.email?.toLowerCase() || '').includes(search) ||
      (app.jobTitle?.toLowerCase() || '').includes(search)
    const matchesStatus = !filterStatus || app.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleViewDetail = (application: ApplicationData) => {
    setSelectedApplication(application)
    setShowDetailModal(true)
  }

  const handleUpdateStatus = async (applicationId: string, newStatus: string, notes?: string) => {
    setIsSaving(true)
    // Mapear estado del frontend al formato de la API (español)
    const statusToApi: Record<string, string> = {
      'pending': 'pendiente',
      'reviewing': 'en_revision',
      'interview': 'entrevista',
      'accepted': 'contratado',
      'rejected': 'rechazado',
    }
    const apiStatus = statusToApi[newStatus] || newStatus

    const result = await api.updateApplicationStatus(applicationId, apiStatus, notes)
    setIsSaving(false)

    if (result.success) {
      setMessage({ type: 'success', text: 'Estado actualizado' })
      loadApplications()
      if (selectedApplication && selectedApplication.id === applicationId) {
        setSelectedApplication({ ...selectedApplication, status: newStatus })
      }
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al actualizar' })
    }
  }

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find((s) => s.value === status)
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${option?.color || 'bg-gray-500/20 text-gray-400'}`}>
        {option?.label || status}
      </span>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <FaCheck className="text-green-400" />
      case 'rejected':
        return <FaTimesCircle className="text-red-400" />
      case 'interview':
        return <FaClock className="text-purple-400" />
      default:
        return <FaClock className="text-yellow-400" />
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Postulaciones</h1>
          <p className="text-primary-400">Gestiona las postulaciones recibidas</p>
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
              placeholder="Buscar por nombre, email o puesto..."
              className="w-full pl-10 pr-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
          >
            <option value="">Todos los estados</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statusOptions.map((status) => {
            const count = applications.filter((a) => a.status === status.value).length
            return (
              <button
                key={status.value}
                onClick={() => setFilterStatus(filterStatus === status.value ? '' : status.value)}
                className={`p-4 rounded-xl border transition-all ${
                  filterStatus === status.value
                    ? 'bg-accent-electric/20 border-accent-electric'
                    : 'bg-primary-900/50 border-primary-800 hover:border-primary-700'
                }`}
              >
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-sm text-primary-400">{status.label}</p>
              </button>
            )
          })}
        </div>

        {/* Applications List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-3xl text-accent-electric" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <motion.div
                key={application.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{application.fullName}</h3>
                      {getStatusBadge(application.status)}
                    </div>
                    <p className="text-accent-electric text-sm mb-2">{application.jobTitle}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-primary-400">
                      <span className="flex items-center gap-1">
                        <FaEnvelope className="text-xs" />
                        {application.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaPhone className="text-xs" />
                        {application.phone}
                      </span>
                      <span>{new Date(application.createdAt).toLocaleDateString('es-PE')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewDetail(application)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-800 hover:bg-primary-700 rounded-lg text-primary-200 hover:text-white transition-colors"
                    >
                      <FaEye />
                      Ver Detalle
                    </button>
                    {application.cvUrl && (
                      <a
                        href={application.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-accent-electric hover:bg-accent-electric/20 rounded-lg transition-colors"
                        title="Descargar CV"
                      >
                        <FaDownload />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredApplications.length === 0 && !isLoading && (
          <div className="text-center py-12 text-primary-400">
            No se encontraron postulaciones
          </div>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {showDetailModal && selectedApplication && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowDetailModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-primary-900 rounded-xl border border-primary-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-primary-800">
                  <div>
                    <h2 className="text-xl font-display font-semibold text-white">
                      {selectedApplication.fullName}
                    </h2>
                    <p className="text-accent-electric text-sm">{selectedApplication.jobTitle}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-primary-400 hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-primary-300 mb-2">
                      Estado Actual
                    </label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedApplication.status)}
                      {getStatusBadge(selectedApplication.status)}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-300 mb-1">
                        Email
                      </label>
                      <p className="text-white">{selectedApplication.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-300 mb-1">
                        Telefono
                      </label>
                      <p className="text-white">{selectedApplication.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-300 mb-1">
                        DNI
                      </label>
                      <p className="text-white">{selectedApplication.dni}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-300 mb-1">
                        Fecha de Postulacion
                      </label>
                      <p className="text-white">
                        {new Date(selectedApplication.createdAt).toLocaleDateString('es-PE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    {selectedApplication.linkedIn && (
                      <div>
                        <label className="block text-sm font-medium text-primary-300 mb-1">
                          LinkedIn
                        </label>
                        <a
                          href={selectedApplication.linkedIn.startsWith('http') ? selectedApplication.linkedIn : `https://${selectedApplication.linkedIn}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-electric hover:underline"
                        >
                          {selectedApplication.linkedIn}
                        </a>
                      </div>
                    )}
                    {selectedApplication.availability && (
                      <div>
                        <label className="block text-sm font-medium text-primary-300 mb-1">
                          Disponibilidad
                        </label>
                        <p className="text-white">{selectedApplication.availability}</p>
                      </div>
                    )}
                  </div>

                  {/* Expected Salary */}
                  {selectedApplication.expectedSalary && (
                    <div>
                      <label className="block text-sm font-medium text-primary-300 mb-1">
                        Pretension Salarial
                      </label>
                      <p className="text-white">S/ {selectedApplication.expectedSalary}</p>
                    </div>
                  )}

                  {/* Cover Letter */}
                  {selectedApplication.coverLetter && (
                    <div>
                      <label className="block text-sm font-medium text-primary-300 mb-1">
                        Carta de Presentacion
                      </label>
                      <p className="text-white whitespace-pre-wrap bg-primary-800/50 p-4 rounded-lg">
                        {selectedApplication.coverLetter}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedApplication.notes && (
                    <div>
                      <label className="block text-sm font-medium text-primary-300 mb-1">
                        Notas
                      </label>
                      <p className="text-yellow-400 bg-yellow-500/10 p-3 rounded-lg">
                        {selectedApplication.notes}
                      </p>
                    </div>
                  )}

                  {/* CV */}
                  {selectedApplication.cvUrl && (
                    <div>
                      <label className="block text-sm font-medium text-primary-300 mb-2">
                        Curriculum Vitae
                      </label>
                      <a
                        href={selectedApplication.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent-electric/20 text-accent-electric rounded-lg hover:bg-accent-electric/30 transition-colors"
                      >
                        <FaDownload />
                        Descargar CV
                      </a>
                    </div>
                  )}

                  {/* Update Status */}
                  <div className="pt-4 border-t border-primary-800">
                    <label className="block text-sm font-medium text-primary-300 mb-3">
                      Cambiar Estado
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => handleUpdateStatus(selectedApplication.id, status.value)}
                          disabled={isSaving || selectedApplication.status === status.value}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedApplication.status === status.value
                              ? `${status.color} cursor-default`
                              : 'bg-primary-800 text-primary-300 hover:bg-primary-700 hover:text-white'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}
