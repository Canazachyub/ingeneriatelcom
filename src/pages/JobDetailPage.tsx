import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FaArrowLeft, FaMapMarkerAlt, FaBriefcase, FaCheckCircle, FaGift, FaUpload, FaSpinner, FaExclamationTriangle, FaMoneyBillWave, FaCalendarAlt } from 'react-icons/fa'
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

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [cvFile, setCvFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
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

  const onSubmit = async (data: ApplicationFormData) => {
    if (!job) return

    setIsSubmitting(true)

    try {
      // Convertir CV a base64 si existe
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
    if (min && max) return `S/${min.toLocaleString()} - S/${max.toLocaleString()} mensuales`
    if (min) return `Desde S/${min.toLocaleString()} mensuales`
    return `Hasta S/${max.toLocaleString()} mensuales`
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-950 pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-accent-electric mx-auto mb-4" />
          <p className="text-primary-400">Cargando convocatoria...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !job) {
    return (
      <div className="min-h-screen bg-primary-950 pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link to="/bolsa-trabajo" className="btn-primary">
            Ver todas las vacantes
          </Link>
        </div>
      </div>
    )
  }

  // Not found
  if (!job) {
    return (
      <div className="min-h-screen bg-primary-950 pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-white mb-4">
            Puesto no encontrado
          </h1>
          <Link to="/bolsa-trabajo" className="btn-primary">
            Ver todas las vacantes
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-primary-950 pt-24 pb-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-20 h-20 bg-accent-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaCheckCircle className="text-4xl text-accent-success" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-4">
            ¡Postulacion Enviada!
          </h1>
          <p className="text-primary-300 mb-8">
            Hemos recibido tu postulacion para el puesto de {job.titulo}. Nos pondremos en contacto contigo pronto.
          </p>
          <Link to="/bolsa-trabajo" className="btn-primary">
            Ver mas vacantes
          </Link>
        </motion.div>
      </div>
    )
  }

  const requisitos = parseList(job.requisitos)
  const beneficios = parseList(job.beneficios)

  return (
    <div className="min-h-screen bg-primary-950 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          to="/bolsa-trabajo"
          className="inline-flex items-center gap-2 text-primary-400 hover:text-accent-electric transition-colors mb-6"
        >
          <FaArrowLeft />
          Volver a Bolsa de Trabajo
        </Link>

        {/* Job Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-b from-primary-800/50 to-primary-900/50 backdrop-blur-sm rounded-xl border p-6 md:p-8 mb-8 ${
            job.prioridad === 'alta' ? 'border-red-500/50' : 'border-primary-700/50'
          }`}
        >
          <div className="flex flex-wrap gap-2 mb-3">
            {job.prioridad === 'alta' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 text-sm font-semibold rounded-full">
                <FaExclamationTriangle className="text-xs" />
                URGENTE
              </span>
            )}
            <span className="px-3 py-1 bg-accent-electric/20 text-accent-electric text-sm font-medium rounded-full">
              {categories[job.categoria] || job.categoria}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mt-2 mb-4">
            {job.titulo}
          </h1>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 text-primary-300">
              <FaMapMarkerAlt className="text-accent-electric" />
              <span>{job.ubicacion}</span>
            </div>
            <div className="flex items-center gap-2 text-primary-300">
              <FaBriefcase className="text-accent-electric" />
              <span>{modalities[job.modalidad] || job.modalidad}</span>
            </div>
            {job.fecha_cierre && (
              <div className="flex items-center gap-2 text-primary-300">
                <FaCalendarAlt className="text-accent-electric" />
                <span>Cierre: {formatDate(job.fecha_cierre)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xl font-semibold text-accent-energy">
            <FaMoneyBillWave className="text-green-400" />
            {formatSalary(job.salario_min, job.salario_max)}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Job Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Description */}
            <div className="bg-primary-900/50 rounded-xl border border-primary-700/50 p-6">
              <h2 className="text-xl font-display font-semibold text-white mb-4">
                Descripcion del Puesto
              </h2>
              <p className="text-primary-300 leading-relaxed whitespace-pre-line">
                {job.descripcion}
              </p>
            </div>

            {/* Requirements */}
            {requisitos.length > 0 && (
              <div className="bg-primary-900/50 rounded-xl border border-primary-700/50 p-6">
                <h2 className="text-xl font-display font-semibold text-white mb-4 flex items-center gap-2">
                  <FaCheckCircle className="text-accent-electric" />
                  Requisitos
                </h2>
                <ul className="space-y-3">
                  {requisitos.map((req, index) => (
                    <li key={index} className="flex items-start gap-3 text-primary-300">
                      <span className="w-1.5 h-1.5 bg-accent-electric rounded-full mt-2 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {beneficios.length > 0 && (
              <div className="bg-primary-900/50 rounded-xl border border-primary-700/50 p-6">
                <h2 className="text-xl font-display font-semibold text-white mb-4 flex items-center gap-2">
                  <FaGift className="text-accent-energy" />
                  Beneficios
                </h2>
                <ul className="space-y-3">
                  {beneficios.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3 text-primary-300">
                      <span className="w-1.5 h-1.5 bg-accent-energy rounded-full mt-2 flex-shrink-0" />
                      {benefit}
                    </li>
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
            <div className="bg-primary-900/50 rounded-xl border border-primary-700/50 p-6 sticky top-24">
              <h2 className="text-xl font-display font-semibold text-white mb-4">
                Postular Ahora
              </h2>

              {/* Progress */}
              <div className="flex gap-2 mb-6">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full ${
                      s <= step ? 'bg-accent-electric' : 'bg-primary-700'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {step === 1 && (
                  <>
                    <div>
                      <input
                        {...register('fullName')}
                        placeholder="Nombre completo *"
                        className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                      {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>}
                    </div>
                    <div>
                      <input
                        {...register('dni')}
                        placeholder="DNI *"
                        className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                      {errors.dni && <p className="text-red-400 text-xs mt-1">{errors.dni.message}</p>}
                    </div>
                    <div>
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="Email *"
                        className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                      {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <input
                        {...register('phone')}
                        placeholder="Telefono *"
                        className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                      {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
                    </div>
                    <div>
                      <input
                        {...register('linkedIn')}
                        placeholder="LinkedIn (opcional)"
                        className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <Button type="button" onClick={() => setStep(2)} className="w-full">
                      Siguiente
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <label className="block text-sm text-primary-300 mb-2">
                        Subir CV (PDF, DOC, DOCX)
                      </label>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary-700 rounded-lg cursor-pointer hover:border-accent-electric transition-colors">
                        <FaUpload className="text-2xl text-primary-500 mb-2" />
                        <span className="text-sm text-primary-400">
                          {cvFile ? cvFile.name : 'Haz clic para subir'}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                    <div>
                      <textarea
                        {...register('coverLetter')}
                        placeholder="Carta de presentacion (opcional)"
                        rows={4}
                        className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => setStep(1)} className="flex-1">
                        Atras
                      </Button>
                      <Button type="button" onClick={() => setStep(3)} className="flex-1">
                        Siguiente
                      </Button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div>
                      <input
                        {...register('expectedSalary')}
                        placeholder="Pretension salarial (S/)"
                        className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <select
                        {...register('availability')}
                        className="w-full px-4 py-3 bg-primary-800/50 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        <option value="">Disponibilidad *</option>
                        <option value="inmediata">Inmediata</option>
                        <option value="1-semana">1 semana</option>
                        <option value="2-semanas">2 semanas</option>
                        <option value="1-mes">1 mes</option>
                      </select>
                      {errors.availability && <p className="text-red-400 text-xs mt-1">{errors.availability.message}</p>}
                    </div>
                    <div className="flex items-start gap-2">
                      <input
                        {...register('terms')}
                        type="checkbox"
                        className="mt-1"
                      />
                      <label className="text-sm text-primary-300">
                        Acepto los terminos y condiciones y autorizo el tratamiento de mis datos personales.
                      </label>
                    </div>
                    {errors.terms && <p className="text-red-400 text-xs">{errors.terms.message}</p>}
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => setStep(2)} className="flex-1">
                        Atras
                      </Button>
                      <Button type="submit" isLoading={isSubmitting} className="flex-1">
                        Enviar
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
