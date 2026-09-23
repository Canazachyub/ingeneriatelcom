import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaBook, FaClock, FaQuestionCircle, FaExternalLinkAlt, FaGraduationCap, FaChevronRight } from 'react-icons/fa'
import { api } from '../api/appScriptApi'
import { Capacitacion } from '../types/capacitacion.types'
import PageHeader from '../components/common/PageHeader'
import TiltCard from '../components/common/TiltCard'

const CATEGORIAS = ['Todas', 'Seguridad', 'Técnico', 'Administrativo', 'Salud', 'Otro']

export default function CapacitacionesPage() {
  const navigate = useNavigate()
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoriaActiva, setCategoriaActiva] = useState('Todas')

  useEffect(() => {
    api.getCapacitaciones().then(res => {
      if (res.success && res.data) {
        setCapacitaciones(res.data)
      } else {
        setError(res.error || 'No se pudieron cargar las capacitaciones')
      }
      setLoading(false)
    }).catch(() => {
      setError('Error de conexión')
      setLoading(false)
    })
  }, [])

  const filtradas = categoriaActiva === 'Todas'
    ? capacitaciones
    : capacitaciones.filter(c => c.categoria === categoriaActiva)

  return (
    <div className="min-h-screen bg-primary-950 pb-16">
      <PageHeader
        eyebrow="Portal de capacitaciones"
        title="Capacitaciones Disponibles"
        subtitle="Rinde tu evaluación en línea. El resultado llegará a tu correo tras la revisión del administrador."
        migas={[{ label: 'Inicio', to: '/' }, { label: 'Capacitaciones' }]}
        metrica={
          !loading && !error ? (
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-white tabular-nums">{capacitaciones.length}</div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mt-1">Cursos disponibles</div>
            </div>
          ) : undefined
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Banda con foto de entrenamiento (C1) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-hud relative overflow-hidden mb-10"
        >
          <img
            src="/assets/images/operaciones/C1.webp"
            alt="Sesión de capacitación en seguridad con arnés de protección"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-950/95 via-primary-950/70 to-primary-950/30" />
          <div className="relative z-10 px-6 py-8 md:py-10 flex items-center gap-4">
            <div
              className="w-12 h-12 shrink-0 flex items-center justify-center bg-accent-electric/10 border border-accent-electric/40 text-accent-electric text-xl"
              style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}
            >
              <FaGraduationCap />
            </div>
            <div>
              <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-accent-electric mb-1">Formación del equipo</p>
              <p className="text-white font-display font-semibold text-lg md:text-xl">Seguridad, técnica y gestión en un solo lugar</p>
            </div>
          </div>
        </motion.div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 justify-center mb-8" role="tablist" aria-label="Filtrar por categoría">
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              role="tab"
              aria-selected={categoriaActiva === cat}
              onClick={() => setCategoriaActiva(cat)}
              className={`btn-hud min-h-[40px] px-4 py-2 font-mono text-xs tracking-[0.15em] uppercase border transition-all ${
                categoriaActiva === cat
                  ? 'bg-accent-electric text-primary-950 border-accent-electric font-bold'
                  : 'bg-primary-900/60 text-primary-300 border-primary-700 hover:border-accent-electric/60 hover:text-accent-electric'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Estado */}
        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin w-10 h-10 border-2 border-accent-electric border-t-transparent rounded-full mx-auto mb-4" />
            <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary-400">Cargando capacitaciones...</p>
          </div>
        )}

        {error && (
          <div className="panel-hud max-w-lg mx-auto text-center px-6 py-10">
            <FaBook className="text-4xl mx-auto mb-3 text-red-400/70" />
            <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-red-400 mb-2">Error de enlace</p>
            <p className="text-primary-200">{error}</p>
          </div>
        )}

        {!loading && !error && filtradas.length === 0 && (
          <div className="panel-hud max-w-lg mx-auto text-center px-6 py-10">
            <FaGraduationCap className="text-5xl mx-auto mb-3 text-primary-500" />
            <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-primary-400 mb-2">Sin resultados</p>
            <p className="text-primary-200">No hay capacitaciones disponibles en esta categoría</p>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtradas.map((cap, i) => (
            <motion.div
              key={cap.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <TiltCard>
                <div className="panel-hud group h-full overflow-hidden flex flex-col">
                  {/* Tira de color por categoría */}
                  <div className={`h-1 ${getCategoriaColor(cap.categoria)}`} />
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-[10px] tracking-[0.25em] uppercase px-2 py-1 border border-accent-electric/40 bg-accent-electric/10 text-accent-electric">
                        {cap.categoria || 'General'}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.25em] text-primary-500">
                        CURSO {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-white text-lg leading-snug mb-2 group-hover:text-accent-electric transition-colors">
                      {cap.titulo}
                    </h3>
                    <p className="text-primary-300 text-sm leading-relaxed flex-1 mb-4 line-clamp-3">
                      {cap.descripcion}
                    </p>

                    {/* Metadatos */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[11px] border border-primary-600/50 bg-primary-900/60 text-primary-200">
                        <FaQuestionCircle className="text-accent-electric" />
                        {cap.num_preguntas} preguntas
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[11px] border border-primary-600/50 bg-primary-900/60 text-primary-200">
                        <FaClock className="text-accent-electric" />
                        {cap.tiempo_limite_min} min
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[11px] border border-accent-energy/40 bg-accent-energy/10 text-accent-energy">
                        <FaBook />
                        Nota mín.: {cap.nota_minima}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 mt-auto">
                      {cap.material_url && (
                        <a
                          href={cap.material_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary btn-hud flex-1 !px-3 !py-2.5 text-sm gap-1.5"
                        >
                          <FaExternalLinkAlt className="text-xs" />
                          Material
                        </a>
                      )}
                      <button
                        onClick={() => navigate(`/evaluacion/${cap.id}`)}
                        className="btn-primary btn-hud flex-1 !px-3 !py-2.5 text-sm gap-1.5"
                      >
                        Rendir evaluación
                        <FaChevronRight className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getCategoriaColor(categoria: string): string {
  const map: Record<string, string> = {
    'Seguridad': 'bg-red-400',
    'Técnico': 'bg-accent-electric',
    'Administrativo': 'bg-primary-400',
    'Salud': 'bg-accent-success',
    'Otro': 'bg-primary-500',
  }
  return map[categoria] || 'bg-accent-electric'
}
