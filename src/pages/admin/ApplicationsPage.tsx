import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaSearch,
  FaSpinner,
  FaTimes,
  FaDownload,
  FaEnvelope,
  FaPhone,
  FaIdCard,
  FaLinkedin,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaClock,
  FaBriefcase,
  FaList,
  FaColumns,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaUserTie,
  FaSave,
  FaEye,
} from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { api } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'
import ErrorCarga from '../../components/admin/ErrorCarga'
import FileViewerModal from '../../components/admin/FileViewerModal'

// ─── Types ────────────────────────────────────────────────────────────────────

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

type ViewMode = 'list' | 'kanban'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  {
    value: 'pending',
    label: 'Pendiente',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    pillColor: 'bg-amber-500',
    columnBg: 'bg-amber-500/5 border-amber-500/20',
    headerColor: 'text-amber-400',
    icon: FaClock,
  },
  {
    value: 'reviewing',
    label: 'En Revisión',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    pillColor: 'bg-blue-500',
    columnBg: 'bg-blue-500/5 border-blue-500/20',
    headerColor: 'text-blue-400',
    icon: FaSearch,
  },
  {
    value: 'interview',
    label: 'Entrevista',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    pillColor: 'bg-purple-500',
    columnBg: 'bg-purple-500/5 border-purple-500/20',
    headerColor: 'text-purple-400',
    icon: FaUserTie,
  },
  {
    value: 'accepted',
    label: 'Aceptado',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    pillColor: 'bg-green-500',
    columnBg: 'bg-green-500/5 border-green-500/20',
    headerColor: 'text-green-400',
    icon: FaCheckCircle,
  },
  {
    value: 'rejected',
    label: 'Rechazado',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    pillColor: 'bg-red-500',
    columnBg: 'bg-red-500/5 border-red-500/20',
    headerColor: 'text-red-400',
    icon: FaTimesCircle,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mapStatus = (status: string): string => {
  const map: Record<string, string> = {
    pendiente: 'pending',
    pending: 'pending',
    en_revision: 'reviewing',
    revision: 'reviewing',
    revisado: 'reviewing',
    reviewing: 'reviewing',
    entrevista: 'interview',
    interview: 'interview',
    rechazado: 'rejected',
    rejected: 'rejected',
    contratado: 'accepted',
    aceptado: 'accepted',
    accepted: 'accepted',
  }
  return map[status.toLowerCase()] || 'pending'
}

const formatApiDate = (date: unknown): string => {
  if (!date) return new Date().toISOString()
  if (typeof date === 'string') return date
  if (date instanceof Date) return date.toISOString()
  return String(date)
}

const formatDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const formatDateLong = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const getStatusOption = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]

const statusToApi: Record<string, string> = {
  pending: 'pendiente',
  reviewing: 'en_revision',
  interview: 'entrevista',
  accepted: 'contratado',
  rejected: 'rechazado',
}

// Los CV subidos quedan en Drive: se abren con el visor seguro (getArchivo,
// nivel auth) en lugar de un enlace directo. Otros enlaces se abren tal cual.
const esUrlDrive = (url: string) => /drive\.google\.com|docs\.google\.com/.test(url)

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const opt = getStatusOption(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${opt.color}`}
    >
      <opt.icon className="text-[10px]" />
      {opt.label}
    </span>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  application: ApplicationData
  isSaving: boolean
  onClose: () => void
  onStatusChange: (id: string, newStatus: string, notificar: boolean) => void
  onSaveNotes: (id: string, notes: string) => void
  onViewCv: (url: string, nombre: string) => void
}

function DetailModal({ application, isSaving, onClose, onStatusChange, onSaveNotes, onViewCv }: DetailModalProps) {
  // Aviso por correo al postulante: desmarcado por defecto (es un envío real)
  const [notificar, setNotificar] = useState(false)
  const [notas, setNotas] = useState(application.notes)
  const notasCambiaron = notas.trim() !== application.notes.trim()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Contratado: marcar el estado NO crea al trabajador; se avisa y se da el atajo */}
        {application.status === 'accepted' && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/40 text-sm text-green-100 flex flex-wrap items-center gap-3">
            <FaUserTie className="text-green-300" />
            <span className="flex-1">Marcado como <b>contratado</b>. Para que pueda marcar asistencia y entrar en planilla, créalo como trabajador en <b>Personal</b> (DNI {application.dni || '—'}).</span>
            <Link
              to={`/admin/empleados?nuevo=1&dni=${encodeURIComponent(application.dni)}&nombre=${encodeURIComponent(application.fullName)}`}
              className="px-3 py-1.5 rounded-lg bg-green-500 text-gray-900 font-semibold whitespace-nowrap"
            >
              Crear trabajador en Personal
            </Link>
          </div>
        )}
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10 rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-white truncate">{application.fullName}</h2>
              <StatusBadge status={application.status} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <FaBriefcase className="text-indigo-400 text-xs flex-shrink-0" />
              <p className="text-indigo-400 text-sm font-medium">{application.jobTitle || 'Sin puesto'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {application.cvUrl && (
              esUrlDrive(application.cvUrl) ? (
                <button
                  onClick={() => onViewCv(application.cvUrl, application.fullName)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <FaEye className="text-xs" />
                  Ver CV
                </button>
              ) : (
                <a
                  href={application.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <FaDownload className="text-xs" />
                  Abrir CV
                </a>
              )
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Two-column info grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Personal data */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Datos del Candidato
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FaIdCard className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">DNI</p>
                    <p className="text-white text-sm">{application.dni || '—'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FaEnvelope className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Email</p>
                    <a
                      href={`mailto:${application.email}`}
                      className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
                    >
                      {application.email || '—'}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FaPhone className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Teléfono</p>
                    <p className="text-white text-sm">{application.phone || '—'}</p>
                  </div>
                </div>

                {application.linkedIn && (
                  <div className="flex items-start gap-3">
                    <FaLinkedin className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">LinkedIn</p>
                      <a
                        href={
                          application.linkedIn.startsWith('http')
                            ? application.linkedIn
                            : `https://${application.linkedIn}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1 transition-colors"
                      >
                        Ver perfil
                        <FaExternalLinkAlt className="text-[10px]" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Job data */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Datos de la Postulación
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FaCalendarAlt className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Fecha de Postulación</p>
                    <p className="text-white text-sm">{formatDateLong(application.createdAt)}</p>
                  </div>
                </div>

                {application.expectedSalary && (
                  <div className="flex items-start gap-3">
                    <FaMoneyBillWave className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Pretensión Salarial</p>
                      <p className="text-white text-sm">S/ {application.expectedSalary}</p>
                    </div>
                  </div>
                )}

                {application.availability && (
                  <div className="flex items-start gap-3">
                    <FaClock className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Disponibilidad</p>
                      <p className="text-white text-sm">{application.availability}</p>
                    </div>
                  </div>
                )}

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <label htmlFor="notas-internas" className="block text-xs text-amber-400 font-medium mb-1.5">
                    Notas internas (no las ve el postulante)
                  </label>
                  <textarea
                    id="notas-internas"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={3}
                    placeholder="Ej.: buena experiencia en campo, coordinar entrevista el lunes…"
                    className="w-full bg-gray-900/60 border border-amber-500/20 rounded-lg p-2.5 text-amber-100 text-sm placeholder-amber-200/30 resize-y focus:outline-none focus:border-amber-400/60"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => onSaveNotes(application.id, notas.trim())}
                      disabled={isSaving || !notasCambiaron}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-gray-900 hover:bg-amber-400 disabled:opacity-40 transition-colors"
                    >
                      {isSaving ? <FaSpinner className="animate-spin text-[10px]" /> : <FaSave className="text-[10px]" />}
                      Guardar notas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cover Letter */}
          {application.coverLetter && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Carta de Presentación
              </h3>
              <textarea
                readOnly
                value={application.coverLetter}
                rows={6}
                className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-gray-200 text-sm leading-relaxed resize-none focus:outline-none"
              />
            </div>
          )}

          {/* Status pipeline */}
          <div className="pt-4 border-t border-gray-800">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Cambiar Estado
            </h3>
            <label className="flex items-center gap-2 mb-3 text-sm text-gray-300 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={notificar}
                onChange={(e) => setNotificar(e.target.checked)}
                className="w-4 h-4 accent-indigo-500"
              />
              Avisar al postulante por correo
              {application.email ? (
                <span className="text-gray-500 text-xs">({application.email})</span>
              ) : (
                <span className="text-amber-400 text-xs">(no tiene correo registrado)</span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => {
                const isActive = application.status === s.value
                return (
                  <button
                    key={s.value}
                    onClick={() => !isActive && onStatusChange(application.id, s.value, notificar)}
                    disabled={isSaving || isActive}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isActive
                        ? `${s.color} ring-2 ring-offset-2 ring-offset-gray-900 cursor-default`
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-700'
                    } ${isSaving ? 'opacity-50' : ''}`}
                  >
                    {isSaving && isActive ? (
                      <FaSpinner className="animate-spin text-[10px]" />
                    ) : (
                      <s.icon className="text-[10px]" />
                    )}
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({
  application,
  onOpen,
}: {
  application: ApplicationData
  onOpen: (a: ApplicationData) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      onClick={() => onOpen(application)}
      className="bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl p-4 cursor-pointer transition-colors group shadow-sm"
    >
      <p className="font-semibold text-white text-sm group-hover:text-indigo-300 transition-colors leading-tight mb-1">
        {application.fullName}
      </p>
      <p className="text-xs text-indigo-400 font-medium truncate mb-3">{application.jobTitle || 'Sin puesto'}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <FaCalendarAlt className="text-[9px]" />
          {formatDate(application.createdAt)}
        </span>
        {application.cvUrl && (
          <span className="text-xs text-indigo-500 flex items-center gap-1">
            <FaDownload className="text-[9px]" />
            CV
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  applications,
  onOpen,
}: {
  status: (typeof STATUS_OPTIONS)[0]
  applications: ApplicationData[]
  onOpen: (a: ApplicationData) => void
}) {
  return (
    <div className={`flex flex-col rounded-xl border ${status.columnBg} min-h-[400px]`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <status.icon className={`text-sm ${status.headerColor}`} />
          <span className={`text-sm font-semibold ${status.headerColor}`}>{status.label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status.pillColor} text-white`}>
          {applications.length}
        </span>
      </div>
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)]">
        <AnimatePresence>
          {applications.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-8">Sin postulaciones</p>
          ) : (
            applications.map((app) => (
              <KanbanCard key={app.id} application={app} onOpen={onOpen} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Falló la carga ≠ no hay datos (ver ErrorCarga)
  const [errorCarga, setErrorCarga] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterJob, setFilterJob] = useState('')
  const [selectedApplication, setSelectedApplication] = useState<ApplicationData | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [cvAbierto, setCvAbierto] = useState<{ url: string; nombre: string } | null>(null)

  useEffect(() => {
    loadApplications()
  }, [])

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  // silencioso: refresca tras guardar sin tapar la lista con el esqueleto
  const loadApplications = async (silencioso = false) => {
    if (!silencioso) {
      setIsLoading(true)
      setErrorCarga('')
    }
    const result = await api.getApplicationsAdmin()
    setIsLoading(false)
    if (silencioso && !result.success) return // se conserva lo que ya se ve

    if (result.success && result.data) {
      const mapped = (result.data as unknown[]).map((app: unknown) => {
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
        } as ApplicationData
      })
      setApplications(mapped)
      setSelectedApplication((prev) => (prev ? mapped.find((m) => m.id === prev.id) ?? prev : prev))
    } else {
      setApplications([])
      setErrorCarga(result.error || 'Error desconocido')
    }
  }

  const handleUpdateStatus = async (applicationId: string, newStatus: string, notificar = false) => {
    setIsSaving(true)
    const result = await api.updateApplicationStatus(
      applicationId,
      statusToApi[newStatus] ?? newStatus,
      undefined,
      notificar
    )
    setIsSaving(false)

    if (result.success) {
      showToast('success', newStatus === 'accepted'
        ? 'Marcado como contratado. Falta crearlo como trabajador en Personal (botón verde en su ficha).'
        : notificar ? 'Estado actualizado y aviso enviado al postulante' : 'Estado actualizado correctamente')
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a))
      )
      if (selectedApplication?.id === applicationId) {
        setSelectedApplication((prev) => prev ? { ...prev, status: newStatus } : prev)
      }
      loadApplications(true)
    } else {
      showToast('error', `No se pudo actualizar el estado: ${result.error || 'error desconocido'}`)
    }
  }

  const handleSaveNotes = async (applicationId: string, notes: string) => {
    const actual = applications.find((a) => a.id === applicationId)
    if (!actual) return
    setIsSaving(true)
    // El backend exige un estado válido: se reenvía el actual junto con las notas
    const result = await api.updateApplicationStatus(applicationId, statusToApi[actual.status] ?? 'pendiente', notes)
    setIsSaving(false)
    if (result.success) {
      showToast('success', 'Notas guardadas')
      setApplications((prev) => prev.map((a) => (a.id === applicationId ? { ...a, notes } : a)))
      setSelectedApplication((prev) => (prev && prev.id === applicationId ? { ...prev, notes } : prev))
      loadApplications(true)
    } else {
      showToast('error', `No se pudieron guardar las notas: ${result.error || 'error desconocido'}`)
    }
  }

  // Unique job titles for filter
  const jobOptions = useMemo(() => {
    const set = new Set(applications.map((a) => a.jobTitle).filter(Boolean))
    return Array.from(set).sort()
  }, [applications])

  const filteredApplications = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return applications.filter((app) => {
      const matchesSearch =
        !search ||
        app.fullName.toLowerCase().includes(search) ||
        app.email.toLowerCase().includes(search) ||
        app.jobTitle.toLowerCase().includes(search)
      const matchesStatus = !filterStatus || app.status === filterStatus
      const matchesJob = !filterJob || app.jobTitle === filterJob
      return matchesSearch && matchesStatus && matchesJob
    })
  }, [applications, searchTerm, filterStatus, filterJob])

  const applicationsByStatus = useMemo(() => {
    const map: Record<string, ApplicationData[]> = {}
    STATUS_OPTIONS.forEach((s) => {
      map[s.value] = filteredApplications.filter((a) => a.status === s.value)
    })
    return map
  }, [filteredApplications])

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Postulaciones</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Gestiona el pipeline de candidatos
            </p>
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg p-1 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FaList className="text-xs" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'kanban'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FaColumns className="text-xs" />
              Kanban
            </button>
          </div>
        </div>

        {/* ── Toast ── */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                toast.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {toast.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Pipeline stats bar ── */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
              !filterStatus
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            <span className="text-xs">Total</span>
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                !filterStatus ? 'bg-white/20' : 'bg-gray-700'
              }`}
            >
              {applications.length}
            </span>
          </button>
          {STATUS_OPTIONS.map((s) => {
            const count = applications.filter((a) => a.status === s.value).length
            const isActive = filterStatus === s.value
            return (
              <button
                key={s.value}
                onClick={() => setFilterStatus(isActive ? '' : s.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  isActive
                    ? `${s.color} ring-2 ring-offset-2 ring-offset-gray-900`
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                }`}
              >
                <s.icon className="text-xs" />
                <span>{s.label}</span>
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email o puesto..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <select
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors min-w-[180px]"
          >
            <option value="">Todos los puestos</option>
            {jobOptions.map((job) => (
              <option key={job} value={job}>
                {job}
              </option>
            ))}
          </select>
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <FaSpinner className="animate-spin text-3xl text-indigo-400" />
          </div>
        )}

        {!isLoading && errorCarga && (
          <ErrorCarga que="las postulaciones" error={errorCarga} onReintentar={() => loadApplications()} />
        )}

        {/* ── Empty state ── */}
        {!isLoading && !errorCarga && filteredApplications.length === 0 && (
          <div className="text-center py-20">
            <FaBriefcase className="text-4xl text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No se encontraron postulaciones</p>
            <p className="text-gray-400 text-sm mt-1">Prueba ajustando los filtros</p>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {!isLoading && viewMode === 'list' && filteredApplications.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-900/50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Candidato
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">
                      DNI
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                      Email
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                      Fecha
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {filteredApplications.map((app) => (
                    <motion.tr
                      key={app.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-700/30 transition-colors group"
                    >
                      {/* Candidato */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          {app.fullName}
                        </p>
                        <p className="text-xs text-indigo-400 mt-0.5">{app.jobTitle}</p>
                      </td>

                      {/* DNI */}
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-gray-300 font-mono text-xs">{app.dni || '—'}</span>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-gray-400 text-xs truncate max-w-[180px] block">
                          {app.email}
                        </span>
                      </td>

                      {/* Estado — inline select */}
                      <td className="px-4 py-4">
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                          disabled={isSaving}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border bg-transparent cursor-pointer focus:outline-none transition-colors ${
                            getStatusOption(app.status).color
                          } disabled:opacity-50`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option
                              key={s.value}
                              value={s.value}
                              className="bg-gray-900 text-white"
                            >
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-gray-500 text-xs">{formatDate(app.createdAt)}</span>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedApplication(app)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-indigo-600 border border-gray-600 hover:border-indigo-500 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-all"
                          >
                            Ver
                          </button>
                          {app.cvUrl && (
                            esUrlDrive(app.cvUrl) ? (
                              <button
                                onClick={() => setCvAbierto({ url: app.cvUrl, nombre: app.fullName })}
                                title="Ver CV"
                                aria-label={`Ver CV de ${app.fullName}`}
                                className="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-600/30 rounded-lg transition-colors"
                              >
                                <FaEye className="text-xs" />
                              </button>
                            ) : (
                              <a
                                href={app.cvUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Abrir CV"
                                className="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-600/30 rounded-lg transition-colors"
                              >
                                <FaDownload className="text-xs" />
                              </a>
                            )
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── KANBAN VIEW ── */}
        {!isLoading && viewMode === 'kanban' && filteredApplications.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {STATUS_OPTIONS.map((status) => (
              <KanbanColumn
                key={status.value}
                status={status}
                applications={applicationsByStatus[status.value] ?? []}
                onOpen={setSelectedApplication}
              />
            ))}
          </div>
        )}

        {/* ── Detail Modal ── */}
        <AnimatePresence>
          {selectedApplication && (
            <DetailModal
              key={selectedApplication.id}
              application={selectedApplication}
              isSaving={isSaving}
              onClose={() => setSelectedApplication(null)}
              onStatusChange={handleUpdateStatus}
              onSaveNotes={handleSaveNotes}
              onViewCv={(url, nombre) => setCvAbierto({ url, nombre })}
            />
          )}
        </AnimatePresence>

        {/* ── Visor seguro del CV (getArchivo) ── */}
        {cvAbierto && (
          <FileViewerModal
            fileUrl={cvAbierto.url}
            title={`CV — ${cvAbierto.nombre}`}
            onClose={() => setCvAbierto(null)}
          />
        )}
      </div>
    </AdminLayout>
  )
}
