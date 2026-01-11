import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Link } from 'react-router-dom'
import { FaBriefcase, FaMapMarkerAlt, FaArrowRight, FaSpinner, FaMoneyBillWave, FaExclamationTriangle } from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import Card from '../common/Card'
import { api } from '../../api/appScriptApi'

interface Job {
  id: string
  titulo: string
  categoria: string
  descripcion: string
  ubicacion: string
  modalidad: string
  salario_min: number
  salario_max: number
  estado: string
  prioridad: string
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

export default function JobsSection() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    setIsLoading(true)
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
            ubicacion: String(j.ubicacion || j.location || ''),
            modalidad: String(j.modalidad || j.modality || 'Presencial'),
            salario_min: Number(j.salario_min || j.salaryMin || 0),
            salario_max: Number(j.salario_max || j.salaryMax || 0),
            estado: String(j.estado || j.status || 'activo'),
            prioridad: String(j.prioridad || j.priority || 'media'),
            postulantes_count: Number(j.postulantes_count || j.applicationsCount || 0),
          }
        })
        // Solo mostrar trabajos activos, maximo 3
        const activeJobs = mappedJobs.filter(job => job.estado === 'activo').slice(0, 3)
        setJobs(activeJobs)
      }
    } catch (error) {
      console.error('Error loading jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatSalary = (min: number, max: number) => {
    if (!min && !max) return 'A convenir'
    if (min && max) return `S/${min.toLocaleString()} - S/${max.toLocaleString()}`
    if (min) return `Desde S/${min.toLocaleString()}`
    return `Hasta S/${max.toLocaleString()}`
  }

  // Si no hay trabajos y no esta cargando, no mostrar la seccion
  if (!isLoading && jobs.length === 0) {
    return null
  }

  return (
    <SectionWrapper id="bolsa-trabajo" dark>
      <div ref={ref}>
        {/* Header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block px-4 py-1 bg-accent-energy/10 text-accent-energy text-sm font-medium rounded-full mb-4"
          >
            Unete a Nuestro Equipo
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-title"
          >
            Bolsa de Trabajo
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-subtitle mx-auto"
          >
            Descubre las oportunidades laborales disponibles en Ingenieria Telcom EIRL.
          </motion.p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <FaSpinner className="animate-spin text-3xl text-accent-electric" />
          </div>
        )}

        {/* Jobs Grid */}
        {!isLoading && jobs.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {jobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              >
                <Card className={`h-full flex flex-col ${job.prioridad === 'alta' ? 'border-red-500/50' : ''}`}>
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
                  <p className="text-sm text-primary-400 mb-4 flex-grow line-clamp-2">
                    {job.descripcion}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-primary-700/50">
                    <div className="flex items-center gap-2 text-xs text-primary-400">
                      <span>{job.postulantes_count || 0} postulantes</span>
                    </div>
                    <Link
                      to={`/bolsa-trabajo/${job.id}`}
                      className="btn-secondary text-sm py-2 px-4"
                    >
                      Postular
                    </Link>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-center"
        >
          <Link
            to="/bolsa-trabajo"
            className="btn-energy inline-flex items-center gap-2"
          >
            Ver Todas las Convocatorias
            <FaArrowRight />
          </Link>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
