import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaBook, FaClock, FaQuestionCircle, FaExternalLinkAlt, FaGraduationCap, FaChevronRight } from 'react-icons/fa'
import { api } from '../api/appScriptApi'
import { Capacitacion } from '../types/capacitacion.types'

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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <FaGraduationCap />
            Portal de Capacitaciones
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Capacitaciones Disponibles
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Rinde tu evaluación en línea. El resultado llegará a tu correo tras la revisión del administrador.
          </p>
        </motion.div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                categoriaActiva === cat
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Estado */}
        {loading && (
          <div className="text-center py-16 text-gray-400">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            Cargando capacitaciones...
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-red-500">
            <FaBook className="text-4xl mx-auto mb-3 opacity-50" />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filtradas.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FaGraduationCap className="text-5xl mx-auto mb-3 opacity-30" />
            <p className="text-lg">No hay capacitaciones disponibles en esta categoría</p>
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
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Tira de color por categoría */}
              <div className={`h-1.5 ${getCategoriaColor(cap.categoria)}`} />
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {cap.categoria || 'General'}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg leading-snug mb-2">{cap.titulo}</h3>
                <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-4 line-clamp-3">
                  {cap.descripcion}
                </p>

                {/* Metadatos */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-5">
                  <span className="flex items-center gap-1">
                    <FaQuestionCircle className="text-blue-400" />
                    {cap.num_preguntas} preguntas
                  </span>
                  <span className="flex items-center gap-1">
                    <FaClock className="text-blue-400" />
                    {cap.tiempo_limite_min} min
                  </span>
                  <span className="flex items-center gap-1">
                    <FaBook className="text-blue-400" />
                    Nota min: {cap.nota_minima}
                  </span>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 mt-auto">
                  {cap.material_url && (
                    <a
                      href={cap.material_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-sm text-blue-600 border border-blue-200 rounded-xl py-2 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <FaExternalLinkAlt className="text-xs" />
                      Material
                    </a>
                  )}
                  <button
                    onClick={() => navigate(`/evaluacion/${cap.id}`)}
                    className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl py-2 transition-colors"
                  >
                    Rendir Evaluación
                    <FaChevronRight className="text-xs" />
                  </button>
                </div>
              </div>
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
    'Técnico': 'bg-blue-500',
    'Administrativo': 'bg-purple-400',
    'Salud': 'bg-green-400',
    'Otro': 'bg-gray-400',
  }
  return map[categoria] || 'bg-blue-500'
}
