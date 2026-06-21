import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaEye, FaCheckCircle, FaExclamationCircle, FaClock,
  FaTimes, FaImage, FaExternalLinkAlt, FaFilter
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import { Evaluacion, Capacitacion } from '../../types/capacitacion.types'

const ESTADO_LABELS: Record<string, string> = {
  pendiente_revision: 'Pendiente',
  aprobado: 'Aprobado',
  observado: 'Observado',
  en_curso: 'En curso',
  abandonado: 'Abandonado',
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente_revision: 'bg-amber-100 text-amber-700',
  aprobado: 'bg-green-100 text-green-700',
  observado: 'bg-orange-100 text-orange-700',
  en_curso: 'bg-blue-100 text-blue-700',
  abandonado: 'bg-gray-100 text-gray-500',
}

export default function EvaluacionesPage() {
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCap, setFiltroCap] = useState('')

  const [seleccionada, setSeleccionada] = useState<Evaluacion | null>(null)
  const [notaFinal, setNotaFinal] = useState<string>('')
  const [retroalimentacion, setRetroalimentacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    const [evalRes, capRes] = await Promise.all([
      api.getEvaluaciones({ estado: filtroEstado || undefined, capacitacion_id: filtroCap || undefined }),
      api.getCapacitaciones()
    ])
    if (evalRes.success && evalRes.data) setEvaluaciones(evalRes.data)
    if (capRes.success && capRes.data) setCapacitaciones(capRes.data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [filtroEstado, filtroCap])

  const abrirRevision = (ev: Evaluacion) => {
    setSeleccionada(ev)
    setNotaFinal(ev.nota_final !== undefined ? String(ev.nota_final) : String(ev.puntaje_auto || ''))
    setRetroalimentacion(ev.retroalimentacion || '')
  }

  const handleRevisar = async (estado: 'aprobado' | 'observado') => {
    if (!seleccionada) return
    const nota = parseFloat(notaFinal)
    if (isNaN(nota) || nota < 0 || nota > 20) { showToast('Ingresa una nota válida (0–20)'); return }
    setGuardando(true)
    const res = await api.revisarEvaluacion({
      id: seleccionada.id,
      nota_final: nota,
      retroalimentacion,
      estado,
      revisado_por: 'Admin',
    })
    setGuardando(false)
    if (res.success) {
      showToast(`Evaluación marcada como ${estado}. Correo enviado a ${seleccionada.email}`)
      setSeleccionada(null)
      loadData()
    } else {
      showToast('Error: ' + res.error)
    }
  }

  const getNombreCap = (id: string) => {
    return capacitaciones.find(c => c.id === id)?.titulo || id
  }

  const parseFotos = (fotos_url?: string): string[] => {
    if (!fotos_url) return []
    try { return JSON.parse(fotos_url) }
    catch { return fotos_url ? [fotos_url] : [] }
  }

  const formatDuracion = (seg?: number) => {
    if (!seg) return '—'
    const m = Math.floor(seg / 60)
    const s = seg % 60
    return `${m}m ${s}s`
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm max-w-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Revisión de Evaluaciones</h1>
        <p className="text-gray-500 text-sm mt-1">Revisa, califica y envía resultados por correo</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <FaFilter className="text-gray-400 text-sm" />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente_revision">Pendientes</option>
          <option value="aprobado">Aprobados</option>
          <option value="observado">Observados</option>
          <option value="en_curso">En curso</option>
        </select>
        <select
          value={filtroCap}
          onChange={e => setFiltroCap(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las capacitaciones</option>
          {capacitaciones.map(c => (
            <option key={c.id} value={c.id}>{c.titulo}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400 ml-auto">
          {evaluaciones.length} resultado{evaluaciones.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando evaluaciones...</div>
      ) : evaluaciones.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FaEye className="text-4xl mx-auto mb-3 opacity-30" />
          <p>No hay evaluaciones con los filtros seleccionados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Trabajador</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Capacitación</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Puntaje</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Salidas</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Duración</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {evaluaciones.map(ev => (
                  <tr key={ev.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{ev.nombres}</div>
                      <div className="text-gray-400 text-xs">{ev.dni} · {ev.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-[180px] truncate">
                      {getNombreCap(ev.capacitacion_id)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ev.nota_final !== undefined && ev.nota_final !== null
                        ? <span className="font-bold text-gray-900">{ev.nota_final}</span>
                        : <span className="text-gray-400">{ev.puntaje_auto ?? '—'} <span className="text-xs">(auto)</span></span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {(ev.salidas_pestana ?? 0) > 0 ? (
                        <span className="text-amber-600 font-medium">{ev.salidas_pestana}</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 hidden lg:table-cell">
                      {formatDuracion(ev.duracion_seg)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_COLORS[ev.estado] || 'bg-gray-100 text-gray-500'}`}>
                        {ESTADO_LABELS[ev.estado] || ev.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => abrirRevision(ev)}
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <FaEye className="text-xs" />
                        Revisar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PANEL DE REVISIÓN ── */}
      <AnimatePresence>
        {seleccionada && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-start justify-end"
            onClick={e => { if (e.target === e.currentTarget) setSeleccionada(null) }}
          >
            <motion.div
              initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="bg-white h-full w-full max-w-lg shadow-2xl overflow-y-auto"
            >
              {/* Header panel */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h3 className="font-bold text-gray-900">{seleccionada.nombres}</h3>
                  <p className="text-xs text-gray-400">{seleccionada.dni} · {seleccionada.email}</p>
                </div>
                <button onClick={() => setSeleccionada(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <FaTimes />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Info general */}
                <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Capacitación</p>
                    <p className="font-medium text-gray-800 leading-snug">{getNombreCap(seleccionada.capacitacion_id)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Estado actual</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[seleccionada.estado] || ''}`}>
                      {ESTADO_LABELS[seleccionada.estado] || seleccionada.estado}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Puntaje automático</p>
                    <p className="font-bold text-gray-900 text-lg">{seleccionada.puntaje_auto ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Duración</p>
                    <p className="font-medium text-gray-800">{formatDuracion(seleccionada.duracion_seg)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Salidas de pestaña</p>
                    <p className={`font-bold ${(seleccionada.salidas_pestana ?? 0) > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                      {seleccionada.salidas_pestana ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Inicio</p>
                    <p className="text-gray-700 text-xs">{seleccionada.hora_inicio ? new Date(seleccionada.hora_inicio).toLocaleString('es-PE') : '—'}</p>
                  </div>
                </div>

                {/* Fotos webcam */}
                {parseFotos(seleccionada.fotos_url).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                      <FaImage className="text-blue-400" />
                      Fotos de proctoring ({parseFotos(seleccionada.fotos_url).length})
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {parseFotos(seleccionada.fotos_url).map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-video block hover:ring-2 hover:ring-blue-400 transition-all"
                        >
                          <img
                            src={url.replace('/view', '/preview')}
                            alt={`Foto ${i + 1}`}
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <FaExternalLinkAlt className="text-white opacity-0 group-hover:opacity-100 text-xs transition-opacity" />
                          </div>
                          <span className="absolute bottom-1 left-1 text-white text-xs bg-black/50 px-1.5 rounded">
                            {i + 1}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {parseFotos(seleccionada.fotos_url).length === 0 && (
                  <div className="text-center py-6 text-gray-300 border border-dashed border-gray-200 rounded-2xl">
                    <FaImage className="text-3xl mx-auto mb-2" />
                    <p className="text-sm">Sin fotos de proctoring registradas</p>
                  </div>
                )}

                {/* Revisión */}
                {(seleccionada.estado === 'pendiente_revision' || seleccionada.estado === 'en_curso') && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700 text-sm">Calificación manual</h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nota final (0–20)</label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step={0.5}
                        value={notaFinal}
                        onChange={e => setNotaFinal(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Retroalimentación (se enviará por correo)</label>
                      <textarea
                        value={retroalimentacion}
                        onChange={e => setRetroalimentacion(e.target.value)}
                        rows={3}
                        placeholder="Escribe comentarios para el trabajador..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleRevisar('aprobado')}
                        disabled={guardando}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                      >
                        <FaCheckCircle />
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleRevisar('observado')}
                        disabled={guardando}
                        className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                      >
                        <FaExclamationCircle />
                        Observado
                      </button>
                    </div>

                    {guardando && (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Guardando y enviando correo...
                      </div>
                    )}
                  </div>
                )}

                {(seleccionada.estado === 'aprobado' || seleccionada.estado === 'observado') && (
                  <div className="bg-green-50 rounded-2xl p-4 text-sm">
                    <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
                      <FaCheckCircle />
                      Evaluación ya revisada
                    </div>
                    <p className="text-gray-600 text-xs">
                      Nota final: <strong>{seleccionada.nota_final}</strong> ·
                      Revisado por: {seleccionada.revisado_por} ·
                      {seleccionada.fecha_revision ? new Date(seleccionada.fecha_revision).toLocaleDateString('es-PE') : ''}
                    </p>
                    {seleccionada.retroalimentacion && (
                      <p className="mt-2 text-gray-600 text-xs border-t border-green-200 pt-2">
                        <strong>Retroalimentación:</strong> {seleccionada.retroalimentacion}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-1 text-xs text-amber-600">
                      <FaClock />
                      Correo enviado al momento de la revisión
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
