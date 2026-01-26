import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  FaArrowLeft,
  FaMapMarkerAlt,
  FaBriefcase,
  FaCheckCircle,
  FaGift,
  FaUpload,
  FaSpinner,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLinkedin,
  FaFileAlt,
  FaClock,
  FaUsers,
  FaBuilding,
  FaRocket,
  FaShare,
  FaStar,
  FaIdCard,
  FaClipboardCheck,
  FaPaperPlane
} from 'react-icons/fa'
import Button from '../components/common/Button'
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

const categories: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  'Ingenieria': { label: 'Ingenieria', color: 'from-blue-500 to-cyan-500', icon: <FaBuilding /> },
  'Tecnico': { label: 'Tecnico', color: 'from-orange-500 to-yellow-500', icon: <FaBriefcase /> },
  'TI': { label: 'Tecnologia / TI', color: 'from-purple-500 to-pink-500', icon: <FaRocket /> },
  'Administracion': { label: 'Administracion', color: 'from-green-500 to-emerald-500', icon: <FaClipboardCheck /> },
  'Finanzas': { label: 'Finanzas', color: 'from-emerald-500 to-teal-500', icon: <FaMoneyBillWave /> },
  'RRHH': { label: 'Recursos Humanos', color: 'from-pink-500 to-rose-500', icon: <FaUsers /> },
  'Operaciones': { label: 'Operaciones', color: 'from-amber-500 to-orange-500', icon: <FaBriefcase /> },
  'Otros': { label: 'Otros', color: 'from-gray-500 to-slate-500', icon: <FaStar /> },
}

const modalities: Record<string, { label: string; color: string }> = {
  'Presencial': { label: 'Presencial', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'Remoto': { label: 'Remoto', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'Hibrido': { label: 'Hibrido', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
}

const applicationSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  dni: z.string().length(8, 'El DNI debe tener 8 digitos'),
  email: z.string().email('Ingresa un email valido'),
  phone: z.string().min(9, 'Ingresa un telefono valido'),
  linkedIn: z.string().url('Ingresa una URL valida').optional().or(z.literal('')),
  coverLetter: z.string().optional(),
  expectedSalary: z.string().optional(),
  availability: z.string().min(1, 'Selecciona tu disponibilidad'),
  terms: z.boolean().refine(val => val === true, 'Debes aceptar los terminos'),
})

type ApplicationFormData = z.infer<typeof applicationSchema>

const steps = [
  { number: 1, title: 'Datos Personales', icon: <FaUser /> },
  { number: 2, title: 'Documentos', icon: <FaFileAlt /> },
  { number: 3, title: 'Finalizar', icon: <FaPaperPlane /> },
]

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [showShareTooltip, setShowShareTooltip] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
  })

  useEffect(() => {
    if (id) {
      loadJob()
    }
  }, [id])

  const loadJob = async () => {
    setIsLoading(true)
    setError('')

    try {
      const result = await api.getJobById(id!)

      if (result.success && result.data) {
        const j = result.data as unknown as Record<string, unknown>
        setJob({
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
        })
      } else {
        setJob(null)
      }
    } catch (err) {
      console.error('Error loading job:', err)
      setError('Error al cargar la convocatoria')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNextStep = async () => {
    if (step === 1) {
      const isValid = await trigger(['fullName', 'dni', 'email', 'phone'])
      if (isValid) setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const onSubmit = async (data: ApplicationFormData) => {
    if (!job) return

    setIsSubmitting(true)

    try {
      let cvBase64 = ''
      let cvMimeType = ''
      if (cvFile) {
        cvBase64 = await fileToBase64(cvFile)
        cvMimeType = cvFile.type
      }

      const result = await api.submitApplication({
        jobId: job.id,
        jobTitle: job.titulo,
        fullName: data.fullName,
        dni: data.dni,
        email: data.email,
        phone: data.phone,
        linkedIn: data.linkedIn || '',
        coverLetter: data.coverLetter || '',
        expectedSalary: data.expectedSalary ? Number(data.expectedSalary) : undefined,
        availability: data.availability,
        cvFileName: cvFile?.name || '',
        cvBase64: cvBase64,
        cvMimeType: cvMimeType,
      })

      if (result.success) {
        setIsSuccess(true)
      } else {
        setError(result.error || 'Error al enviar la postulacion')
      }
    } catch (err) {
      console.error('Application error:', err)
      setError('Error al enviar la postulacion')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCvFile(file)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
    })
  }

  const formatSalary = (min: number, max: number) => {
    if (!min && !max) return 'A convenir'
    if (min && max) return `S/${min.toLocaleString()} - S/${max.toLocaleString()}`
    if (min) return `Desde S/${min.toLocaleString()}`
    return `Hasta S/${max.toLocaleString()}`
  }

  const parseList = (str: string): string[] => {
    if (!str) return []
    return str.split('|').map(item => item.trim()).filter(item => item.length > 0)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return dateStr
    }
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

  const handleShare = async () => {
    const shareData = {
      title: job?.titulo || 'Vacante',
      text: `Mira esta oportunidad laboral: ${job?.titulo}`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      setShowShareTooltip(true)
      setTimeout(() => setShowShareTooltip(false), 2000)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-950 via-primary-900 to-primary-950 pt-24 pb-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-accent-electric/20 rounded-full" />
            <div className="w-20 h-20 border-4 border-accent-electric border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-primary-400 mt-6 text-lg">Cargando convocatoria...</p>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error && !job) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-950 via-primary-900 to-primary-950 pt-24 pb-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaExclamationTriangle className="text-4xl text-red-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-4">Error</h2>
          <p className="text-red-400 mb-8">{error}</p>
          <Link to="/bolsa-trabajo">
            <Button variant="primary">Ver todas las vacantes</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  // Not found
  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-950 via-primary-900 to-primary-950 pt-24 pb-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-24 h-24 bg-primary-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaBriefcase className="text-4xl text-primary-500" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-4">
            Vacante no encontrada
          </h1>
          <p className="text-primary-400 mb-8">
            La vacante que buscas no existe o ya no esta disponible.
          </p>
          <Link to="/bolsa-trabajo">
            <Button variant="primary">Ver todas las vacantes</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-950 via-primary-900 to-primary-950 pt-24 pb-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg mx-auto px-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-500/30"
          >
            <FaCheckCircle className="text-5xl text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              ¡Postulacion Exitosa!
            </h1>
            <p className="text-primary-300 text-lg mb-3">
              Tu postulacion para el puesto de
            </p>
            <p className="text-accent-electric text-xl font-semibold mb-6">
              {job.titulo}
            </p>
            <p className="text-primary-400 mb-8">
              Ha sido recibida correctamente. Revisaremos tu perfil y nos pondremos en contacto contigo pronto.
            </p>

            <div className="bg-primary-800/30 rounded-xl p-6 mb-8 border border-primary-700/50">
              <p className="text-primary-300 text-sm mb-2">Puedes consultar el estado de tu postulacion con tu DNI en:</p>
              <Link to="/mi-postulacion" className="text-accent-electric hover:underline font-medium">
                Consultar mi postulacion
              </Link>
            </div>

            <Link to="/bolsa-trabajo">
              <Button variant="primary" className="min-w-[200px]">
                Ver mas vacantes
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  const requisitos = parseList(job.requisitos)
  const beneficios = parseList(job.beneficios)
  const categoryInfo = categories[job.categoria] || categories['Otros']
  const modalityInfo = modalities[job.modalidad] || modalities['Presencial']
  const daysRemaining = getDaysRemaining(job.fecha_cierre)

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-950 via-primary-900 to-primary-950 pt-20 pb-16">
      {/* Hero Header */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${categoryInfo.color} py-12 md:py-16`}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Back Button */}
            <Link
              to="/bolsa-trabajo"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6 group"
            >
              <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
              Volver a Bolsa de Trabajo
            </Link>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1">
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {job.prioridad === 'alta' && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full shadow-lg animate-pulse"
                    >
                      <FaExclamationTriangle className="text-xs" />
                      URGENTE
                    </motion.span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                    {categoryInfo.icon}
                    {categoryInfo.label}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border ${modalityInfo.color}`}>
                    {modalityInfo.label}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white mb-4 drop-shadow-lg">
                  {job.titulo}
                </h1>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-white/90">
                  <div className="flex items-center gap-2">
                    <FaMapMarkerAlt />
                    <span>{job.ubicacion}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaMoneyBillWave />
                    <span className="font-semibold">{formatSalary(job.salario_min, job.salario_max)}</span>
                  </div>
                  {job.fecha_cierre && (
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt />
                      <span>Cierre: {formatDate(job.fecha_cierre)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Share Button */}
              <div className="relative">
                <button
                  onClick={handleShare}
                  className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-all hover:scale-110"
                  title="Compartir vacante"
                >
                  <FaShare />
                </button>
                <AnimatePresence>
                  {showShareTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-full mt-2 right-0 bg-white text-primary-900 text-sm px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap"
                    >
                      ¡Enlace copiado!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-primary-900/80 border-b border-primary-700/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8 py-4">
            <div className="flex items-center gap-2 text-primary-300">
              <FaUsers className="text-accent-electric" />
              <span><strong className="text-white">{job.postulantes_count}</strong> postulantes</span>
            </div>
            {daysRemaining !== null && daysRemaining > 0 && (
              <div className="flex items-center gap-2 text-primary-300">
                <FaClock className={daysRemaining <= 3 ? 'text-red-400' : 'text-accent-energy'} />
                <span className={daysRemaining <= 3 ? 'text-red-400' : ''}>
                  <strong className="text-white">{daysRemaining}</strong> {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                </span>
              </div>
            )}
            {job.fecha_publicacion && (
              <div className="flex items-center gap-2 text-primary-300">
                <FaCalendarAlt className="text-primary-500" />
                <span>Publicado: {formatDate(job.fecha_publicacion)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Job Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Description */}
            <div className="bg-primary-900/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 p-6 md:p-8 hover:border-primary-600/50 transition-colors">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-accent-electric/20 rounded-xl flex items-center justify-center">
                  <FaFileAlt className="text-accent-electric" />
                </div>
                <h2 className="text-xl md:text-2xl font-display font-bold text-white">
                  Descripcion del Puesto
                </h2>
              </div>
              <p className="text-primary-300 leading-relaxed whitespace-pre-line text-base md:text-lg">
                {job.descripcion}
              </p>
            </div>

            {/* Requirements */}
            {requisitos.length > 0 && (
              <div className="bg-primary-900/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 p-6 md:p-8 hover:border-primary-600/50 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <FaCheckCircle className="text-blue-400" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-display font-bold text-white">
                    Requisitos
                  </h2>
                </div>
                <ul className="space-y-4">
                  {requisitos.map((req, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-start gap-4 text-primary-300"
                    >
                      <span className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaCheckCircle className="text-xs text-blue-400" />
                      </span>
                      <span className="text-base md:text-lg">{req}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {beneficios.length > 0 && (
              <div className="bg-gradient-to-br from-accent-energy/10 to-green-500/10 backdrop-blur-sm rounded-2xl border border-accent-energy/30 p-6 md:p-8 hover:border-accent-energy/50 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-accent-energy/20 rounded-xl flex items-center justify-center">
                    <FaGift className="text-accent-energy" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-display font-bold text-white">
                    Beneficios
                  </h2>
                </div>
                <ul className="grid sm:grid-cols-2 gap-4">
                  {beneficios.map((benefit, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-start gap-3 bg-primary-900/50 rounded-xl p-4 border border-primary-700/30"
                    >
                      <span className="w-6 h-6 bg-accent-energy/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaStar className="text-xs text-accent-energy" />
                      </span>
                      <span className="text-primary-200">{benefit}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>

          {/* Application Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-gradient-to-b from-primary-800/50 to-primary-900/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 overflow-hidden sticky top-24">
              {/* Form Header */}
              <div className={`bg-gradient-to-r ${categoryInfo.color} p-6`}>
                <h2 className="text-xl font-display font-bold text-white mb-2">
                  Postular Ahora
                </h2>
                <p className="text-white/80 text-sm">
                  Completa el formulario para aplicar
                </p>
              </div>

              <div className="p-6">
                {/* Step Indicator */}
                <div className="flex items-center justify-between mb-8">
                  {steps.map((s, i) => (
                    <div key={s.number} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                            step >= s.number
                              ? 'bg-accent-electric text-white shadow-lg shadow-accent-electric/30'
                              : 'bg-primary-700 text-primary-400'
                          }`}
                        >
                          {step > s.number ? <FaCheckCircle /> : s.icon}
                        </div>
                        <span className={`text-xs mt-2 ${step >= s.number ? 'text-accent-electric' : 'text-primary-500'}`}>
                          {s.title}
                        </span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`w-8 md:w-12 h-0.5 mx-1 ${step > s.number ? 'bg-accent-electric' : 'bg-primary-700'}`} />
                      )}
                    </div>
                  ))}
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl"
                  >
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <FaExclamationTriangle />
                      {error}
                    </p>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <div className="relative">
                          <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" />
                          <input
                            {...register('fullName')}
                            placeholder="Nombre completo *"
                            className="w-full pl-11 pr-4 py-3.5 bg-primary-800/50 border border-primary-700 rounded-xl text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric transition-all"
                          />
                          {errors.fullName && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.fullName.message}</p>}
                        </div>

                        <div className="relative">
                          <FaIdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" />
                          <input
                            {...register('dni')}
                            placeholder="DNI (8 digitos) *"
                            maxLength={8}
                            className="w-full pl-11 pr-4 py-3.5 bg-primary-800/50 border border-primary-700 rounded-xl text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric transition-all"
                          />
                          {errors.dni && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.dni.message}</p>}
                        </div>

                        <div className="relative">
                          <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" />
                          <input
                            {...register('email')}
                            type="email"
                            placeholder="Email *"
                            className="w-full pl-11 pr-4 py-3.5 bg-primary-800/50 border border-primary-700 rounded-xl text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric transition-all"
                          />
                          {errors.email && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.email.message}</p>}
                        </div>

                        <div className="relative">
                          <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" />
                          <input
                            {...register('phone')}
                            placeholder="Telefono *"
                            className="w-full pl-11 pr-4 py-3.5 bg-primary-800/50 border border-primary-700 rounded-xl text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric transition-all"
                          />
                          {errors.phone && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.phone.message}</p>}
                        </div>

                        <div className="relative">
                          <FaLinkedin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" />
                          <input
                            {...register('linkedIn')}
                            placeholder="LinkedIn (opcional)"
                            className="w-full pl-11 pr-4 py-3.5 bg-primary-800/50 border border-primary-700 rounded-xl text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric transition-all"
                          />
                        </div>

                        <Button type="button" onClick={handleNextStep} className="w-full py-3.5">
                          Continuar
                        </Button>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm text-primary-300 mb-2 font-medium">
                            Curriculum Vitae (PDF, DOC, DOCX)
                          </label>
                          <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                            cvFile
                              ? 'border-accent-electric bg-accent-electric/10'
                              : 'border-primary-600 hover:border-accent-electric hover:bg-primary-800/50'
                          }`}>
                            {cvFile ? (
                              <>
                                <FaCheckCircle className="text-3xl text-accent-electric mb-2" />
                                <span className="text-sm text-accent-electric font-medium">{cvFile.name}</span>
                                <span className="text-xs text-primary-500 mt-1">Clic para cambiar</span>
                              </>
                            ) : (
                              <>
                                <FaUpload className="text-3xl text-primary-500 mb-2" />
                                <span className="text-sm text-primary-400 font-medium">Haz clic para subir tu CV</span>
                                <span className="text-xs text-primary-600 mt-1">Max 10MB</span>
                              </>
                            )}
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx"
                              onChange={handleFileChange}
                            />
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm text-primary-300 mb-2 font-medium">
                            Carta de presentacion (opcional)
                          </label>
                          <textarea
                            {...register('coverLetter')}
                            placeholder="Cuentanos por que eres ideal para este puesto..."
                            rows={4}
                            className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-xl text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric resize-none transition-all"
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button type="button" variant="secondary" onClick={() => setStep(1)} className="flex-1 py-3">
                            Atras
                          </Button>
                          <Button type="button" onClick={handleNextStep} className="flex-1 py-3">
                            Continuar
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <div className="relative">
                          <FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" />
                          <input
                            {...register('expectedSalary')}
                            placeholder="Pretension salarial en S/ (opcional)"
                            type="number"
                            className="w-full pl-11 pr-4 py-3.5 bg-primary-800/50 border border-primary-700 rounded-xl text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric transition-all"
                          />
                        </div>

                        <div className="relative">
                          <FaClock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none" />
                          <select
                            {...register('availability')}
                            className="w-full pl-11 pr-4 py-3.5 bg-primary-800/50 border border-primary-700 rounded-xl text-white focus:outline-none focus:border-accent-electric focus:ring-1 focus:ring-accent-electric appearance-none cursor-pointer transition-all"
                          >
                            <option value="" className="bg-primary-800">Disponibilidad para iniciar *</option>
                            <option value="inmediata" className="bg-primary-800">Inmediata</option>
                            <option value="1-semana" className="bg-primary-800">1 semana</option>
                            <option value="2-semanas" className="bg-primary-800">2 semanas</option>
                            <option value="1-mes" className="bg-primary-800">1 mes</option>
                          </select>
                          {errors.availability && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.availability.message}</p>}
                        </div>

                        <div className="bg-primary-800/30 rounded-xl p-4 border border-primary-700/50">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              {...register('terms')}
                              type="checkbox"
                              className="mt-1 w-4 h-4 rounded border-primary-600 text-accent-electric focus:ring-accent-electric focus:ring-offset-0 bg-primary-800"
                            />
                            <span className="text-sm text-primary-300 leading-relaxed">
                              Acepto los <span className="text-accent-electric">terminos y condiciones</span> y autorizo el tratamiento de mis datos personales para fines de seleccion.
                            </span>
                          </label>
                          {errors.terms && <p className="text-red-400 text-xs mt-2">{errors.terms.message}</p>}
                        </div>

                        <div className="flex gap-3">
                          <Button type="button" variant="secondary" onClick={() => setStep(2)} className="flex-1 py-3">
                            Atras
                          </Button>
                          <Button
                            type="submit"
                            isLoading={isSubmitting}
                            className="flex-1 py-3"
                          >
                            {isSubmitting ? (
                              <span className="flex items-center justify-center gap-2">
                                <FaSpinner className="animate-spin" />
                                Enviando...
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                <FaPaperPlane />
                                Enviar Postulacion
                              </span>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
