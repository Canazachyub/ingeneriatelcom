import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaEye, FaCheckCircle, FaExclamationCircle, FaClock,
  FaTimes, FaImage, FaFilter, FaListUl, FaRedo, FaUndo, FaExclamationTriangle
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import { Evaluacion, Capacitacion, Pregunta } from '../../types/capacitacion.types'
import AdminLayout from '../../components/admin/AdminLayout'
import FileViewerModal from '../../components/admin/FileViewerModal'
import ErrorCarga from '../../components/admin/ErrorCarga'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

const ESTADO_LABELS: Record<string, string> = {
  pendiente_revision: 'Pendiente',
  aprobado: 'Aprobado',
  observado: 'Observado',
  en_curso: 'En curso',
  abandonado: 'Abandonado',
  anulado: 'Anulado (reabierto)',
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente_revision: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  aprobado: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  observado: 'bg-orange-500/15 text-orange-300 border border-orange-500/30',
  en_curso: 'bg-accent-electric/15 text-accent-electric border border-accent-electric/30',
  abandonado: 'bg-primary-800/60 text-primary-400 border border-primary-700',
  anulado: 'bg-primary-800/60 text-primary-500 border border-primary-700 line-through',
}

const SELECT_CLS =
  'bg-primary-900/80 border border-primary-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-electric'

export default function EvaluacionesPage() {
  const toast = useToast()
  const { user } = useAuth()
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([])
  const [loading, setLoading] = useState(true)
  // Falló la carga ≠ no hay datos (ver ErrorCarga)
  const [errorCarga, setErrorCarga] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCap, setFiltroCap] = useState('')

  const [seleccionada, setSeleccionada] = useState<Evaluacion | null>(null)
  const [notaFinal, setNotaFinal] = useState<string>('')
  const [retroalimentacion, setRetroalimentacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [preguntasDetalle, setPreguntasDetalle] = useState<Pregunta[]>([])
  const [loadingPreguntas, setLoadingPreguntas] = useState(false)
  // Visor seguro de fotos de proctoring (los archivos de Drive ya no son publicos — C6)
  const [fotoVisor, setFotoVisor] = useState<{ url: string; indice: number } | null>(null)
  // Recalificar una evaluación ya calificada (pide confirmación explícita)
  const [recalificando, setRecalificando] = useState(false)
  // Reabrir intento (anular para que vuelva a rendir)
  const [reabriendo, setReabriendo] = useState(false)
  const [motivoReabrir, setMotivoReabrir] = useState('')

  const loadData = async () => {
    setLoading(true)
    setErrorCarga('')
    const [evalRes, capRes] = await Promise.all([
      api.getEvaluaciones({ estado: filtroEstado || undefined, capacitacion_id: filtroCap || undefined }),
      api.getCapacitacionesAdmin(true) // todos, para mostrar el nombre de cualquier curso
    ])
    if (evalRes.success && evalRes.data) setEvaluaciones(evalRes.data)
    else { setEvaluaciones([]); setErrorCarga(evalRes.error || 'Error desconocido') }
    if (capRes.success && capRes.data) setCapacitaciones(capRes.data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [filtroEstado, filtroCap])

  const abrirRevision = async (ev: Evaluacion) => {
    setSeleccionada(ev)
    setRecalificando(false)
    setReabriendo(false)
    setMotivoReabrir('')
    const yaRevisada = ev.estado === 'aprobado' || ev.estado === 'observado'
    setNotaFinal(yaRevisada && ev.nota_final !== undefined
      ? String(ev.nota_final)
      : String(ev.puntaje_auto ?? '')
    )
    setRetroalimentacion(ev.retroalimentacion || '')
    setPreguntasDetalle([])
    setLoadingPreguntas(true)
    const res = await api.getPreguntas(ev.capacitacion_id)
    if (res.success && res.data) setPreguntasDetalle(res.data)
    setLoadingPreguntas(false)
  }

  const parseJson = <T,>(s?: string, fallback: T = [] as unknown as T): T => {
    if (!s) return fallback
    try { return JSON.parse(s) } catch { return fallback }
  }

  const getTextoOpcion = (pq: Pregunta, key: string): string => {
    const map: Record<string, string | undefined> = {
      A: pq.opcion_a, B: pq.opcion_b, C: pq.opcion_c, D: pq.opcion_d,
    }
    return map[key?.toUpperCase()] || key || '—'
  }

  const normalizar = (s?: string) =>
    (s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  const handleRevisar = async (estado: 'aprobado' | 'observado') => {
    if (!seleccionada) return
    const nota = parseFloat(notaFinal)
    if (notaFinal.trim() === '' || isNaN(nota) || nota < 0 || nota > 20) { toast.warning('Ingresa una nota válida (0–20)'); return }
    const yaCalificada = seleccionada.estado === 'aprobado' || seleccionada.estado === 'observado'
    setGuardando(true)
    const res = await api.revisarEvaluacion({
      id: seleccionada.id,
      nota_final: nota,
      retroalimentacion,
      estado,
      // Trazabilidad: quién revisó (antes quedaba siempre "Admin")
      revisado_por: user?.name || user?.email || 'Admin',
      recalificar: yaCalificada && recalificando,
    })
    setGuardando(false)
    if (res.success) {
      // Solo se dice "correo enviado" si de verdad salió
      if (res.data?.correo_enviado) toast.success(`Evaluación marcada como ${estado}. Correo enviado a ${seleccionada.email}`)
      else toast.warning(`Evaluación marcada como ${estado}, pero el correo NO se envió${res.data?.correo_error ? ': ' + res.data.correo_error : ''}`)
      setSeleccionada(null)
      loadData()
    } else {
      toast.error('Error: ' + res.error)
    }
  }

  const reabrirIntento = async () => {
    if (!seleccionada || motivoReabrir.trim().length < 3) return
    setGuardando(true)
    const res = await api.anularEvaluacion(seleccionada.id, motivoReabrir.trim(), user?.name || user?.email || 'Admin')
    setGuardando(false)
    if (res.success) {
      toast.success(res.message || 'Intento anulado: ya puede volver a rendir')
      setSeleccionada(null)
      loadData()
    } else {
      toast.error('Error: ' + res.error)
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
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Revisión de Evaluaciones</h1>
          <p className="text-gray-400 text-sm mt-0.5">Revisa, califica y envía resultados por correo</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <FaFilter className="text-primary-400 text-sm" />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className={SELECT_CLS}>
            <option value="">Todos los estados</option>
            <option value="pendiente_revision">Pendientes</option>
            <option value="aprobado">Aprobados</option>
            <option value="observado">Observados</option>
            <option value="en_curso">En curso</option>
            <option value="anulado">Anulados (reabiertos)</option>
          </select>
          <select value={filtroCap} onChange={e => setFiltroCap(e.target.value)} className={SELECT_CLS}>
            <option value="">Todas las capacitaciones</option>
            {capacitaciones.map(c => (
              <option key={c.id} value={c.id}>{c.titulo}</option>
            ))}
          </select>
          <span className="text-sm text-primary-400 ml-auto">
            {evaluaciones.length} resultado{evaluaciones.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-12 text-primary-400">
            <div className="w-6 h-6 mx-auto mb-3 border-2 border-accent-electric border-t-transparent rounded-full animate-spin" />
            Cargando evaluaciones...
          </div>
        ) : errorCarga ? (
          <ErrorCarga que="las evaluaciones" error={errorCarga} onReintentar={loadData} />
        ) : evaluaciones.length === 0 ? (
          <div className="text-center py-12 text-primary-400 panel-hud">
            <FaEye className="text-4xl mx-auto mb-3 opacity-30" />
            <p>No hay evaluaciones con los filtros seleccionados</p>
          </div>
        ) : (
          <div className="panel-hud overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-primary-950/60 border-b border-primary-800">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-primary-300">Trabajador</th>
                    <th className="text-left px-4 py-3 font-medium text-primary-300 hidden md:table-cell">Capacitación</th>
                    <th className="text-center px-4 py-3 font-medium text-primary-300">Puntaje</th>
                    <th className="text-center px-4 py-3 font-medium text-primary-300 hidden sm:table-cell">Salidas</th>
                    <th className="text-center px-4 py-3 font-medium text-primary-300 hidden lg:table-cell">Duración</th>
                    <th className="text-center px-4 py-3 font-medium text-primary-300">Estado</th>
                    <th className="text-center px-4 py-3 font-medium text-primary-300">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-800/70">
                  {evaluaciones.map(ev => (
                    <tr key={ev.id} className="hover:bg-primary-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{ev.nombres}</div>
                        <div className="text-primary-400 text-xs">{ev.dni} · {ev.email}</div>
                      </td>
                      <td className="px-4 py-3 text-primary-200 hidden md:table-cell max-w-[180px] truncate">
                        {getNombreCap(ev.capacitacion_id)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ev.nota_final !== undefined && ev.nota_final !== null
                          ? <span className="font-bold text-white">{ev.nota_final}</span>
                          : <span className="text-primary-400">{ev.puntaje_auto ?? '—'} <span className="text-xs">(auto)</span></span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        {(ev.salidas_pestana ?? 0) > 0 ? (
                          <span className="text-amber-400 font-medium">{ev.salidas_pestana}</span>
                        ) : (
                          <span className="text-primary-600">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-primary-300 hidden lg:table-cell">
                        {formatDuracion(ev.duracion_seg)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_COLORS[ev.estado] || ESTADO_COLORS.abandonado}`}>
                          {ESTADO_LABELS[ev.estado] || ev.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => abrirRevision(ev)}
                          className="inline-flex items-center gap-1.5 text-accent-electric hover:bg-accent-electric/10 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
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
      </div>

      {/* ── PANEL DE REVISIÓN ── */}
      <AnimatePresence>
        {seleccionada && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-start justify-end"
            onClick={e => { if (e.target === e.currentTarget) setSeleccionada(null) }}
          >
            <motion.div
              initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="bg-primary-950 border-l border-primary-800 h-full w-full max-w-lg shadow-2xl overflow-y-auto"
            >
              {/* Header panel */}
              <div className="sticky top-0 bg-primary-950/95 backdrop-blur border-b border-primary-800 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h3 className="font-bold text-white">{seleccionada.nombres}</h3>
                  <p className="text-xs text-primary-400">{seleccionada.dni} · {seleccionada.email}</p>
                </div>
                <button onClick={() => setSeleccionada(null)} aria-label="Cerrar" className="text-primary-400 hover:text-white p-1">
                  <FaTimes />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Info general */}
                <div className="panel-hud p-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-primary-400 text-xs mb-0.5">Capacitación</p>
                    <p className="font-medium text-white leading-snug">{getNombreCap(seleccionada.capacitacion_id)}</p>
                  </div>
                  <div>
                    <p className="text-primary-400 text-xs mb-0.5">Estado actual</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[seleccionada.estado] || ''}`}>
                      {ESTADO_LABELS[seleccionada.estado] || seleccionada.estado}
                    </span>
                  </div>
                  <div>
                    <p className="text-primary-400 text-xs mb-0.5">Puntaje automático</p>
                    <p className="font-bold text-white text-lg">{seleccionada.puntaje_auto ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-primary-400 text-xs mb-0.5">Duración</p>
                    <p className="font-medium text-primary-100">{formatDuracion(seleccionada.duracion_seg)}</p>
                  </div>
                  <div>
                    <p className="text-primary-400 text-xs mb-0.5">Salidas de pestaña</p>
                    <p className={`font-bold ${(seleccionada.salidas_pestana ?? 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {seleccionada.salidas_pestana ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-primary-400 text-xs mb-0.5">Inicio</p>
                    <p className="text-primary-200 text-xs">{seleccionada.hora_inicio ? new Date(seleccionada.hora_inicio).toLocaleString('es-PE') : '—'}</p>
                  </div>
                </div>

                {/* Fotos webcam */}
                {parseFotos(seleccionada.fotos_url).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-primary-200 text-sm mb-3 flex items-center gap-2">
                      <FaImage className="text-accent-electric" />
                      Fotos de proctoring ({parseFotos(seleccionada.fotos_url).length})
                    </h4>
                    {/* Las fotos ya no son publicas en Drive: se abren con el visor autenticado */}
                    <div className="grid grid-cols-3 gap-2">
                      {parseFotos(seleccionada.fotos_url).map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFotoVisor({ url, indice: i + 1 })}
                          className="relative group rounded-xl overflow-hidden bg-primary-900 border border-primary-800 aspect-video flex flex-col items-center justify-center gap-1 hover:border-accent-electric/60 transition-all"
                        >
                          <FaImage className="text-2xl text-primary-500 group-hover:text-accent-electric transition-colors" />
                          <span className="text-xs text-primary-400">Ver foto {i + 1}</span>
                          <span className="absolute bottom-1 left-1 text-white text-xs bg-black/50 px-1.5 rounded">
                            {i + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {parseFotos(seleccionada.fotos_url).length === 0 && (
                  <div className="text-center py-6 text-primary-500 border border-dashed border-primary-700 rounded-2xl">
                    <FaImage className="text-3xl mx-auto mb-2" />
                    <p className="text-sm">Sin fotos de proctoring registradas</p>
                  </div>
                )}

                {/* Desglose de respuestas */}
                {(() => {
                  const idsAsignados: string[] = parseJson(seleccionada.preguntas_asignadas, [])
                  const respuestas: Record<string, string> = parseJson(seleccionada.respuestas, {})
                  const pregs = idsAsignados
                    .map(id => preguntasDetalle.find(p => String(p.id) === String(id)))
                    .filter(Boolean) as Pregunta[]

                  if (loadingPreguntas) return (
                    <div className="text-center py-4 text-primary-400 text-sm">Cargando preguntas...</div>
                  )
                  if (!idsAsignados.length || !pregs.length) return null

                  const correctas = pregs.filter(p => {
                    const dada = respuestas[p.id]
                    return p.tipo === 'multiple'
                      ? normalizar(dada) === normalizar(p.respuesta_correcta)
                      : normalizar(dada) === normalizar(p.respuesta_correcta)
                  }).length

                  return (
                    <div>
                      <h4 className="font-semibold text-primary-200 text-sm mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2"><FaListUl className="text-accent-electric" />Detalle de respuestas</span>
                        <span className="text-xs font-normal text-primary-400">
                          {correctas}/{pregs.length} correctas
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {pregs.map((pq, i) => {
                          const dada = respuestas[pq.id]
                          const correcta = pq.tipo === 'multiple'
                            ? normalizar(dada) === normalizar(pq.respuesta_correcta)
                            : normalizar(dada) === normalizar(pq.respuesta_correcta)
                          const sinResponder = !dada

                          return (
                            <div
                              key={pq.id}
                              className={`rounded-xl border px-3 py-2.5 text-xs ${
                                sinResponder
                                  ? 'border-primary-700 bg-primary-900/60'
                                  : correcta
                                  ? 'border-emerald-500/30 bg-emerald-500/10'
                                  : 'border-rose-500/30 bg-rose-500/10'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                                  sinResponder ? 'bg-primary-600 text-white'
                                  : correcta ? 'bg-emerald-500 text-white'
                                  : 'bg-rose-500 text-white'
                                }`}>
                                  {sinResponder ? '?' : correcta ? '✓' : '✗'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-primary-100 leading-snug mb-1">
                                    {i + 1}. {pq.pregunta}
                                  </p>
                                  {pq.tipo === 'multiple' ? (
                                    <div className="space-y-0.5">
                                      <p className={correcta ? 'text-emerald-300' : 'text-rose-300'}>
                                        Respondió: <strong>{dada ? `${dada} — ${getTextoOpcion(pq, dada)}` : 'Sin respuesta'}</strong>
                                      </p>
                                      {!correcta && pq.respuesta_correcta && (
                                        <p className="text-emerald-300">
                                          Correcta: <strong>{pq.respuesta_correcta} — {getTextoOpcion(pq, pq.respuesta_correcta)}</strong>
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <p className={correcta ? 'text-emerald-300' : 'text-rose-300'}>
                                        Respondió: <strong>"{dada || 'Sin respuesta'}"</strong>
                                      </p>
                                      {!correcta && pq.respuesta_correcta && (
                                        <p className="text-emerald-300">
                                          Referencia: <strong>"{pq.respuesta_correcta}"</strong>
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Revisión */}
                {(seleccionada.estado === 'pendiente_revision' || seleccionada.estado === 'en_curso' || recalificando) && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-primary-200 text-sm">{recalificando ? 'Recalificar' : 'Calificación manual'}</h4>
                    {recalificando && (
                      <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex gap-2">
                        <FaExclamationTriangle className="mt-0.5 shrink-0" />
                        Vas a cambiar una calificación ya enviada. La persona recibirá un correo nuevo con el resultado corregido.
                      </p>
                    )}
                    <div>
                      <label htmlFor="nota-final" className="block text-xs font-medium text-primary-300 mb-1">Nota final (0–20)</label>
                      <input
                        id="nota-final"
                        type="number"
                        min={0}
                        max={20}
                        step={0.5}
                        value={notaFinal}
                        onChange={e => setNotaFinal(e.target.value)}
                        className="w-full bg-primary-900/80 border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-lg font-bold text-center text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="retro" className="block text-xs font-medium text-primary-300 mb-1">Retroalimentación (se enviará por correo)</label>
                      <textarea
                        id="retro"
                        value={retroalimentacion}
                        onChange={e => setRetroalimentacion(e.target.value)}
                        rows={3}
                        placeholder="Escribe comentarios para el trabajador..."
                        className="w-full bg-primary-900/80 border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm resize-none text-white placeholder-primary-500"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleRevisar('aprobado')}
                        disabled={guardando}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                      >
                        <FaCheckCircle />
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleRevisar('observado')}
                        disabled={guardando}
                        className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-primary-950 font-semibold py-3 rounded-xl transition-colors text-sm"
                      >
                        <FaExclamationCircle />
                        Observado
                      </button>
                    </div>

                    {guardando && (
                      <div className="flex items-center justify-center gap-2 text-sm text-primary-400">
                        <div className="w-4 h-4 border-2 border-accent-electric border-t-transparent rounded-full animate-spin" />
                        Guardando y enviando correo...
                      </div>
                    )}
                  </div>
                )}

                {(seleccionada.estado === 'aprobado' || seleccionada.estado === 'observado') && (
                  <div className="rounded-2xl p-4 text-sm bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-2 text-emerald-300 font-semibold mb-1">
                      <FaCheckCircle />
                      Evaluación ya revisada
                    </div>
                    <p className="text-primary-200 text-xs">
                      Nota final: <strong>{seleccionada.nota_final}</strong> ·
                      Revisado por: {seleccionada.revisado_por} ·
                      {seleccionada.fecha_revision ? new Date(seleccionada.fecha_revision).toLocaleDateString('es-PE') : ''}
                    </p>
                    {seleccionada.retroalimentacion && (
                      <p className="mt-2 text-primary-200 text-xs border-t border-emerald-500/30 pt-2">
                        <strong>Retroalimentación:</strong> {seleccionada.retroalimentacion}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-1 text-xs text-primary-400">
                      <FaClock />
                      El resultado se envía por correo al calificar
                    </div>
                    {!recalificando && (
                      <button onClick={() => { setRecalificando(true); setNotaFinal(String(seleccionada.nota_final ?? '')) }}
                        className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-amber-500/50 text-amber-200 hover:bg-amber-500/10">
                        <FaRedo /> Recalificar
                      </button>
                    )}
                  </div>
                )}

                {/* Reabrir intento: anula un intento cortado o sin calificar para que vuelva a rendir */}
                {['en_curso', 'pendiente_revision', 'abandonado'].includes(seleccionada.estado) && (
                  <div className="rounded-2xl p-4 text-sm border border-primary-700 bg-primary-900/40 space-y-3">
                    <p className="text-primary-200 text-xs">
                      ¿Se le cortó el internet o hubo un problema? Puedes <strong>reabrir el intento</strong>: este queda anulado (no se borra) y la persona puede volver a rendir.
                    </p>
                    {!reabriendo ? (
                      <button onClick={() => setReabriendo(true)}
                        className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-primary-600 text-primary-200 hover:border-accent-electric">
                        <FaUndo /> Reabrir intento
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <input value={motivoReabrir} onChange={(e) => setMotivoReabrir(e.target.value)} autoFocus
                          placeholder="Motivo (obligatorio). Ej.: se cortó la conexión"
                          className="w-full bg-primary-900/80 border border-primary-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-electric" />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setReabriendo(false); setMotivoReabrir('') }} className="px-3 py-1.5 text-xs rounded-lg border border-primary-600 text-primary-200">Cancelar</button>
                          <button onClick={reabrirIntento} disabled={guardando || motivoReabrir.trim().length < 3}
                            className="px-3 py-1.5 text-xs rounded-lg bg-amber-400 text-primary-950 font-semibold disabled:opacity-40">
                            Sí, anular y dejar volver a rendir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visor autenticado de fotos de proctoring (C6) */}
      {fotoVisor && seleccionada && (
        <FileViewerModal
          fileUrl={fotoVisor.url}
          title={`Proctoring ${fotoVisor.indice} · ${seleccionada.nombres} · DNI ${seleccionada.dni}`}
          onClose={() => setFotoVisor(null)}
        />
      )}
    </AdminLayout>
  )
}
