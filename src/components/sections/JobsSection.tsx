import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Link } from 'react-router-dom'
import {
  FaBriefcase, FaMapMarkerAlt, FaArrowRight, FaMoneyBillWave, FaExclamationTriangle,
  FaSearch, FaLaptopHouse, FaCrosshairs,
} from 'react-icons/fa'
import SectionWrapper from '../common/SectionWrapper'
import SectionHeader from '../common/SectionHeader'
import TiltCard from '../common/TiltCard'
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
  imagen?: string
}

const categories: Record<string, string> = {
  'Ingenieria': 'Ingeniería',
  'Tecnico': 'Técnico',
  'TI': 'Tecnología / TI',
  'Administracion': 'Administración',
  'Finanzas': 'Finanzas',
  'RRHH': 'Recursos Humanos',
  'Operaciones': 'Operaciones',
  'Otros': 'Otros',
}

const modalities: Record<string, string> = {
  'Presencial': 'Presencial',
  'Remoto': 'Remoto',
  'Hibrido': 'Híbrido',
}

// Chip HUD para los datos de la oferta
function Chip({ icon, children, tono = 'neutro' }: { icon: React.ReactNode; children: React.ReactNode; tono?: 'neutro' | 'energia' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[11px] tracking-wide border ${
        tono === 'energia'
          ? 'border-accent-energy/40 bg-accent-energy/10 text-accent-energy'
          : 'border-primary-600/50 bg-primary-900/60 text-primary-200'
      }`}
    >
      {icon}
      {children}
    </span>
  )
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
            imagen: String(j.imagen || j.image || ''),
          }
        })
        // Solo mostrar trabajos activos, máximo 3
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

  // Si no hay trabajos y no está cargando, no mostrar la sección
  if (!isLoading && jobs.length === 0) {
    return null
  }

  return (
    <SectionWrapper id="bolsa-trabajo" dark>
      <div ref={ref}>
        <SectionHeader
          id="bolsa-trabajo"
          eyebrow="Únete al equipo"
          accent="energy"
          title="Bolsa de trabajo"
          subtitle="Ingenieros, técnicos y personal administrativo para nuestros proyectos en el sur del Perú. Postula en línea en pocos minutos."
        />

        {/* Cargando: esqueletos con la misma forma que las tarjetas */}
        {isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10" aria-busy="true" aria-label="Cargando convocatorias">
            {[0, 1, 2].map((i) => (
              <div key={i} className="panel-hud p-6 h-64 animate-pulse">
                <div className="h-3 w-24 bg-primary-700/60 mb-4" />
                <div className="h-5 w-3/4 bg-primary-700/60 mb-6" />
                <div className="flex gap-2 mb-6">
                  <div className="h-6 w-20 bg-primary-800" />
                  <div className="h-6 w-20 bg-primary-800" />
                </div>
                <div className="h-3 w-full bg-primary-800 mb-2" />
                <div className="h-3 w-2/3 bg-primary-800" />
              </div>
            ))}
          </div>
        )}

        {/* Ofertas: tarjetas tipo "misión disponible" */}
        {!isLoading && jobs.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {jobs.map((job, index) => {
              const urgente = job.prioridad === 'alta'
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                >
                  <TiltCard>
                    <Link
                      to={`/bolsa-trabajo/${job.id}`}
                      className={`panel-hud group h-full flex flex-col overflow-hidden ${urgente ? '!border-accent-energy/50' : ''}`}
                    >
                      {/* Cabecera: imagen de la oferta o banda de categoría */}
                      <div className="relative h-32 overflow-hidden">
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
                            <FaCrosshairs className="text-5xl text-accent-electric/25 group-hover:rotate-90 transition-transform duration-700" />
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
                        <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent-electric/80 mb-1.5">
                          {categories[job.categoria] || job.categoria}
                        </span>
                        <h3 className="text-lg font-display font-semibold text-white mb-3 leading-snug group-hover:text-accent-electric transition-colors duration-300">
                          {job.titulo}
                        </h3>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {job.ubicacion && (
                            <Chip icon={<FaMapMarkerAlt className="text-accent-electric" />}>{job.ubicacion}</Chip>
                          )}
                          <Chip icon={<FaLaptopHouse className="text-accent-electric" />}>
                            {modalities[job.modalidad] || job.modalidad}
                          </Chip>
                          <Chip icon={<FaMoneyBillWave />} tono="energia">
                            {formatSalary(job.salario_min, job.salario_max)}
                          </Chip>
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
        )}

        {/* CTA con foto aspiracional (B2) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="panel-hud relative overflow-hidden"
        >
          <img
            src="/assets/images/operaciones/B2.webp"
            alt="Joven técnico frente a una torre de telecomunicaciones al amanecer"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-950/95 via-primary-950/80 to-primary-950/30" />
          <div className="relative z-10 px-6 py-10 md:px-12 md:py-14 max-w-xl">
            <p className="font-mono text-[11px] tracking-[0.3em] text-accent-energy mb-3">
              <FaBriefcase className="inline mr-2 -mt-0.5" />
              RECLUTAMIENTO ABIERTO
            </p>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
              Tu carrera empieza en el terreno
            </h3>
            <p className="text-primary-200 mb-6">
              Buscamos talento técnico y profesional para proyectos de energía,
              construcción y minería en el sur del Perú.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/bolsa-trabajo"
                className="btn-energy btn-hud inline-flex items-center justify-center gap-2"
              >
                Ver todas las ofertas
                <FaArrowRight />
              </Link>
              <Link
                to="/mi-postulacion"
                className="btn-secondary btn-hud inline-flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                <FaSearch />
                Consultar mi postulación
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
