import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaPlus, FaEdit, FaTimes, FaBook, FaListAlt,
  FaSave, FaChevronDown, FaArchive, FaBoxOpen, FaExclamationTriangle
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import { Capacitacion, Pregunta } from '../../types/capacitacion.types'
import AdminLayout from '../../components/admin/AdminLayout'
import ErrorCarga from '../../components/admin/ErrorCarga'
import { useToast } from '../../context/ToastContext'

type Tab = 'capacitaciones' | 'preguntas'

const ESTADOS_CAP = ['borrador', 'activo', 'cerrado']
const CATEGORIAS = ['Seguridad', 'Técnico', 'Administrativo', 'Salud', 'Otro']
const DIFICULTADES = ['facil', 'media', 'dificil']
const TIPOS = ['multiple', 'llenado']

const emptyCapacitacion: Omit<Capacitacion, 'id' | 'fecha_creacion'> = {
  titulo: '', descripcion: '', material_url: '', categoria: 'Técnico',
  num_preguntas: 15, nota_minima: 14, tiempo_limite_min: 30,
  foto_intervalo_seg: 20, estado: 'borrador',
}

// Validación en el navegador (el backend repite las mismas reglas)
function erroresCapacitacion(f: Omit<Capacitacion, 'id' | 'fecha_creacion'>): string[] {
  const e: string[] = []
  if (!f.titulo.trim()) e.push('Escribe el título')
  if (!Number.isInteger(Number(f.num_preguntas)) || f.num_preguntas < 1 || f.num_preguntas > 100) e.push('N° de preguntas: un entero entre 1 y 100')
  if (isNaN(Number(f.nota_minima)) || f.nota_minima < 0 || f.nota_minima > 20) e.push('Nota mínima: entre 0 y 20')
  if (isNaN(Number(f.tiempo_limite_min)) || f.tiempo_limite_min <= 0) e.push('Tiempo: mayor que 0 minutos')
  if (isNaN(Number(f.foto_intervalo_seg)) || f.foto_intervalo_seg < 5) e.push('Intervalo de foto: al menos 5 segundos')
  return e
}

function erroresPregunta(f: Omit<Pregunta, 'id'>): string[] {
  const e: string[] = []
  if (!f.capacitacion_id) e.push('Elige la capacitación')
  if (!f.pregunta.trim()) e.push('Escribe la pregunta')
  if (isNaN(Number(f.puntaje)) || f.puntaje < 1 || f.puntaje > 10) e.push('Puntaje: entre 1 y 10')
  if (f.tipo === 'multiple') {
    const letras = (['a', 'b', 'c', 'd'] as const).filter((l) => String(f[`opcion_${l}`] || '').trim())
    if (letras.length < 2) e.push('Escribe al menos 2 opciones')
    const r = String(f.respuesta_correcta || '').toUpperCase()
    if (!['A', 'B', 'C', 'D'].includes(r)) e.push('Elige la respuesta correcta')
    else if (!String(f[`opcion_${r.toLowerCase()}` as 'opcion_a'] || '').trim()) e.push(`La opción ${r} (respuesta correcta) está vacía`)
  } else if (!String(f.respuesta_correcta || '').trim()) {
    e.push('Escribe la respuesta de referencia')
  }
  return e
}

const emptyPregunta: Omit<Pregunta, 'id'> = {
  capacitacion_id: '', pregunta: '', tipo: 'multiple',
  opcion_a: '', opcion_b: '', opcion_c: '', opcion_d: '',
  respuesta_correcta: '', justificacion: '',
  dificultad: 'media', puntaje: 1, estado: 'activa',
}

export default function CapacitacionesManagementPage() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('capacitaciones')
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([])
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [loading, setLoading] = useState(true)
  const [capSeleccionada, setCapSeleccionada] = useState<string>('')
  // Nada se borra: se archiva y se puede recuperar
  const [verArchivadas, setVerArchivadas] = useState(false)
  const [verPreguntasArchivadas, setVerPreguntasArchivadas] = useState(false)
  const [confirmando, setConfirmando] = useState<string | null>(null)

  // Modal capacitacion
  const [modalCap, setModalCap] = useState(false)
  const [editCap, setEditCap] = useState<Capacitacion | null>(null)
  const [formCap, setFormCap] = useState(emptyCapacitacion)
  const [savingCap, setSavingCap] = useState(false)

  // Modal pregunta
  const [modalPq, setModalPq] = useState(false)
  const [editPq, setEditPq] = useState<Pregunta | null>(null)
  const [formPq, setFormPq] = useState(emptyPregunta)
  const [savingPq, setSavingPq] = useState(false)

  // Falló la carga ≠ no hay datos (ver ErrorCarga)
  const [errorCarga, setErrorCarga] = useState('')
  const [errorPreguntas, setErrorPreguntas] = useState('')

  // Avisos vía ToastContext (antes, un toast local propio de esta página)
  const showToast = (msg: string) => {
    if (/^Error/.test(msg)) toast.error(msg)
    else if (/^Selecciona/.test(msg)) toast.warning(msg)
    else toast.success(msg)
  }

  const loadCapacitaciones = async () => {
    setLoading(true)
    setErrorCarga('')
    const res = await api.getCapacitacionesAdmin(verArchivadas)
    if (res.success && res.data) setCapacitaciones(res.data)
    else { setCapacitaciones([]); setErrorCarga(res.error || 'Error desconocido') }
    setLoading(false)
  }

  useEffect(() => { loadCapacitaciones() }, [verArchivadas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar preguntas cuando cambia la capacitacion seleccionada
  const loadPreguntas = async (capId: string) => {
    if (!capId) { setPreguntas([]); setErrorPreguntas(''); return }
    setLoading(true)
    setErrorPreguntas('')
    const res = await api.getPreguntas(capId)
    if (res.success && res.data) setPreguntas(res.data)
    else { setPreguntas([]); setErrorPreguntas(res.error || 'Error desconocido') }
    setLoading(false)
  }

  useEffect(() => {
    if (tab === 'preguntas' && capSeleccionada) loadPreguntas(capSeleccionada)
  }, [tab, capSeleccionada])

  // ── Capacitaciones ───────────────────────────────────────────────
  const abrirCrearCap = () => {
    setEditCap(null)
    setFormCap(emptyCapacitacion)
    setModalCap(true)
  }

  const abrirEditarCap = (cap: Capacitacion) => {
    setEditCap(cap)
    setFormCap({
      titulo: cap.titulo, descripcion: cap.descripcion,
      material_url: cap.material_url || '', categoria: cap.categoria,
      num_preguntas: cap.num_preguntas, nota_minima: cap.nota_minima,
      tiempo_limite_min: cap.tiempo_limite_min, foto_intervalo_seg: cap.foto_intervalo_seg,
      estado: cap.estado,
    })
    setModalCap(true)
  }

  const errCap = erroresCapacitacion(formCap)
  // Activar exige preguntas activas suficientes (un curso nuevo aún no tiene)
  const activasCap = editCap ? (editCap.preguntas_activas ?? 0) : 0
  const faltanPreguntas = formCap.estado === 'activo' && activasCap < formCap.num_preguntas

  const guardarCap = async () => {
    if (errCap.length || faltanPreguntas) return
    setSavingCap(true)
    let res
    if (editCap) {
      res = await api.actualizarCapacitacion({ id: editCap.id, ...formCap })
    } else {
      res = await api.crearCapacitacion(formCap)
    }
    setSavingCap(false)
    if (res.success) {
      showToast(editCap ? 'Capacitación actualizada' : 'Capacitación creada')
      setModalCap(false)
      loadCapacitaciones()
    } else {
      showToast('Error: ' + (res.error || 'desconocido'))
    }
  }

  const archivarCap = async (id: string, archivar: boolean) => {
    setConfirmando(null)
    const res = await api.archivarCapacitacion(id, archivar)
    if (res.success) {
      showToast(res.message || (archivar ? 'Capacitación archivada' : 'Capacitación recuperada'))
      loadCapacitaciones()
    } else {
      showToast('Error: ' + res.error)
    }
  }

  // ── Preguntas ────────────────────────────────────────────────────
  const abrirCrearPq = () => {
    setEditPq(null)
    setFormPq({ ...emptyPregunta, capacitacion_id: capSeleccionada })
    setModalPq(true)
  }

  const abrirEditarPq = (pq: Pregunta) => {
    setEditPq(pq)
    setFormPq({ ...pq })
    setModalPq(true)
  }

  const errPq = erroresPregunta(formPq)

  const guardarPq = async () => {
    if (!formPq.capacitacion_id) { showToast('Selecciona una capacitación'); return }
    if (errPq.length) return
    setSavingPq(true)
    let res
    if (editPq) {
      res = await api.actualizarPregunta({ id: editPq.id, ...formPq })
    } else {
      res = await api.crearPregunta(formPq)
    }
    setSavingPq(false)
    if (res.success) {
      showToast(editPq ? 'Pregunta actualizada' : 'Pregunta creada')
      setModalPq(false)
      loadPreguntas(capSeleccionada)
      loadCapacitaciones() // actualiza el conteo de preguntas activas
    } else {
      showToast('Error: ' + res.error)
    }
  }

  const archivarPq = async (id: string, archivar: boolean) => {
    setConfirmando(null)
    const res = await api.archivarPregunta(id, archivar)
    if (res.success) {
      showToast(res.message || (archivar ? 'Pregunta archivada' : 'Pregunta recuperada'))
      loadPreguntas(capSeleccionada)
      loadCapacitaciones()
    } else {
      showToast('Error: ' + res.error)
    }
  }

  const capActual = capacitaciones.find((c) => c.id === capSeleccionada)
  const preguntasVisibles = preguntas.filter((p) => verPreguntasArchivadas || p.estado !== 'inactiva')
  const nActivas = preguntas.filter((p) => p.estado === 'activa').length

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      activo: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
      borrador: 'bg-primary-800/60 text-primary-300 border border-primary-700',
      cerrado: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
      archivado: 'bg-primary-800/60 text-primary-500 border border-primary-700',
    }
    return map[estado] || 'bg-primary-800/60 text-primary-300 border border-primary-700'
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Gestión de Capacitaciones</h1>
        <p className="text-gray-400 text-sm mt-0.5">Administra capacitaciones y banco de preguntas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-primary-900/60 border border-primary-800 p-1 rounded-xl w-fit">
        {([['capacitaciones', FaBook, 'Capacitaciones'], ['preguntas', FaListAlt, 'Banco de Preguntas']] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-accent-electric/15 text-accent-electric border border-accent-electric/30' : 'text-primary-400 hover:text-white border border-transparent'
            }`}
          >
            <Icon className="text-xs" />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: CAPACITACIONES ── */}
      {tab === 'capacitaciones' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-primary-400">{capacitaciones.length} {capacitaciones.length !== 1 ? 'capacitaciones' : 'capacitación'}</p>
              <button onClick={() => setVerArchivadas(!verArchivadas)}
                className={`text-xs px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 ${verArchivadas ? 'bg-primary-700 border-primary-500 text-white' : 'border-primary-700 text-primary-400 hover:text-white'}`}>
                <FaArchive /> {verArchivadas ? 'Ocultar archivadas' : 'Ver archivadas'}
              </button>
            </div>
            <button
              onClick={abrirCrearCap}
              className="flex items-center gap-2 bg-accent-electric hover:brightness-110 text-primary-950 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <FaPlus /> Nueva capacitación
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-primary-400">Cargando...</div>
          ) : errorCarga ? (
            <ErrorCarga que="las capacitaciones" error={errorCarga} onReintentar={loadCapacitaciones} />
          ) : capacitaciones.length === 0 ? (
            <div className="text-center py-12 text-primary-400">
              <FaBook className="text-4xl mx-auto mb-3 opacity-30" />
              <p>No hay capacitaciones. Crea la primera.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {capacitaciones.map(cap => (
                <div key={cap.id} className="panel-hud p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-white leading-snug">{cap.titulo}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${estadoBadge(cap.estado)}`}>
                      {cap.estado}
                    </span>
                  </div>
                  <p className="text-primary-300 text-sm mb-3 line-clamp-2">{cap.descripcion}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-primary-400 mb-4">
                    <span>{cap.categoria}</span>
                    <span className={(cap.preguntas_activas ?? 0) < cap.num_preguntas ? 'text-amber-300' : ''}
                      title="Preguntas activas en el banco / preguntas que pide el examen">
                      {cap.preguntas_activas ?? 0}/{cap.num_preguntas} preg.
                    </span>
                    <span>Nota mín: {cap.nota_minima}</span>
                    <span>{cap.tiempo_limite_min} min</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setTab('preguntas'); setCapSeleccionada(cap.id) }}
                      className="flex-1 text-center text-xs text-accent-electric border border-accent-electric/30 rounded-lg py-1.5 hover:bg-accent-electric/10 transition-colors"
                    >
                      Ver preguntas
                    </button>
                    <button onClick={() => abrirEditarCap(cap)} className="p-2 text-primary-400 hover:text-accent-electric hover:bg-accent-electric/10 rounded-lg transition-colors">
                      <FaEdit />
                    </button>
                    {cap.estado === 'archivado' ? (
                      <button onClick={() => archivarCap(cap.id, false)} title="Recuperar (vuelve como borrador)" className="p-2 text-primary-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors">
                        <FaBoxOpen />
                      </button>
                    ) : (
                      <button onClick={() => setConfirmando('cap:' + cap.id)} title="Archivar (no se borra)" className="p-2 text-primary-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors">
                        <FaArchive />
                      </button>
                    )}
                  </div>
                  {confirmando === 'cap:' + cap.id && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-xs text-amber-100 flex flex-wrap items-center gap-2">
                      <span className="flex-1">¿Archivar «{cap.titulo}»? Ya no se podrá rendir. Sus preguntas y evaluaciones se conservan y la recuperas con "Ver archivadas".</span>
                      <button onClick={() => setConfirmando(null)} className="px-2 py-1 rounded border border-primary-600 text-primary-200">Cancelar</button>
                      <button onClick={() => archivarCap(cap.id, true)} className="px-2 py-1 rounded bg-amber-400 text-primary-950 font-semibold">Sí, archivar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PREGUNTAS ── */}
      {tab === 'preguntas' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaChevronDown className="text-primary-400 text-xs" />
              <select
                value={capSeleccionada}
                onChange={e => setCapSeleccionada(e.target.value)}
                className="border border-primary-700 rounded-xl px-3 py-2 text-sm text-white bg-primary-900/80 focus:outline-none focus:border-accent-electric"
              >
                <option value="">Selecciona una capacitación</option>
                {capacitaciones.filter(c => c.estado !== 'archivado').map(c => (
                  <option key={c.id} value={c.id}>{c.titulo}{c.estado !== 'activo' ? ` (${c.estado})` : ''}</option>
                ))}
              </select>
            </div>
            {capSeleccionada && (
              <div className="flex items-center gap-3 text-xs">
                <span className={capActual && nActivas < capActual.num_preguntas ? 'text-amber-300' : 'text-primary-400'}>
                  {nActivas} preguntas activas{capActual ? ` · el examen pide ${capActual.num_preguntas}` : ''}
                </span>
                <button onClick={() => setVerPreguntasArchivadas(!verPreguntasArchivadas)}
                  className={`px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 ${verPreguntasArchivadas ? 'bg-primary-700 border-primary-500 text-white' : 'border-primary-700 text-primary-400 hover:text-white'}`}>
                  <FaArchive /> {verPreguntasArchivadas ? 'Ocultar archivadas' : 'Ver archivadas'}
                </button>
              </div>
            )}
            <button
              onClick={abrirCrearPq}
              disabled={!capSeleccionada}
              className="flex items-center gap-2 bg-accent-electric hover:brightness-110 disabled:opacity-40 text-primary-950 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <FaPlus /> Nueva pregunta
            </button>
          </div>

          {!capSeleccionada ? (
            <div className="text-center py-12 text-primary-400">
              <FaListAlt className="text-4xl mx-auto mb-3 opacity-30" />
              <p>Selecciona una capacitación para ver sus preguntas</p>
            </div>
          ) : errorPreguntas ? (
            <ErrorCarga que="las preguntas" error={errorPreguntas} onReintentar={() => loadPreguntas(capSeleccionada)} />
          ) : preguntasVisibles.length === 0 ? (
            <div className="text-center py-12 text-primary-400">
              <FaListAlt className="text-4xl mx-auto mb-3 opacity-30" />
              <p>No hay preguntas para esta capacitación. Crea la primera con el botón de arriba.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {preguntasVisibles.map((pq, i) => (
                <div key={pq.id} className={`panel-hud p-4 ${pq.estado === 'inactiva' ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 bg-accent-electric/15 text-accent-electric rounded-full text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-medium leading-snug mb-1">{pq.pregunta}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-primary-400">
                        <span className="bg-primary-800/70 text-primary-300 px-2 py-0.5 rounded-full">{pq.tipo}</span>
                        <span className="bg-primary-800/70 text-primary-300 px-2 py-0.5 rounded-full">{pq.dificultad}</span>
                        <span className="bg-primary-800/70 text-primary-300 px-2 py-0.5 rounded-full">{pq.puntaje} pt</span>
                        <span className={`px-2 py-0.5 rounded-full ${pq.estado === 'activa' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-primary-800/70 text-primary-400'}`}>
                          {pq.estado}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => abrirEditarPq(pq)} className="p-2 text-primary-400 hover:text-accent-electric hover:bg-accent-electric/10 rounded-lg transition-colors">
                        <FaEdit className="text-xs" />
                      </button>
                      {pq.estado === 'inactiva' ? (
                        <button onClick={() => archivarPq(pq.id, false)} title="Recuperar" className="p-2 text-primary-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors">
                          <FaBoxOpen className="text-xs" />
                        </button>
                      ) : (
                        <button onClick={() => setConfirmando('pq:' + pq.id)} title="Archivar (no se borra)" className="p-2 text-primary-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors">
                          <FaArchive className="text-xs" />
                        </button>
                      )}
                    </div>
                  </div>
                  {confirmando === 'pq:' + pq.id && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-xs text-amber-100 flex flex-wrap items-center gap-2">
                      <span className="flex-1">¿Archivar esta pregunta? Ya no saldrá en los exámenes nuevos. Se recupera con "Ver archivadas".</span>
                      <button onClick={() => setConfirmando(null)} className="px-2 py-1 rounded border border-primary-600 text-primary-200">Cancelar</button>
                      <button onClick={() => archivarPq(pq.id, true)} className="px-2 py-1 rounded bg-amber-400 text-primary-950 font-semibold">Sí, archivar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL CAPACITACIÓN ── */}
      <AnimatePresence>
        {modalCap && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalCap(false) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-primary-950 border border-primary-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">
                  {editCap ? 'Editar Capacitación' : 'Nueva Capacitación'}
                </h3>
                <button onClick={() => setModalCap(false)} className="text-primary-400 hover:text-white">
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-300 mb-1">Título *</label>
                  <input type="text" value={formCap.titulo} onChange={e => setFormCap(p => ({ ...p, titulo: e.target.value }))}
                    className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-300 mb-1">Descripción</label>
                  <textarea value={formCap.descripcion} onChange={e => setFormCap(p => ({ ...p, descripcion: e.target.value }))}
                    rows={3} className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm resize-none text-white bg-primary-900/80" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-300 mb-1">URL Material (opcional)</label>
                  <input type="url" value={formCap.material_url} onChange={e => setFormCap(p => ({ ...p, material_url: e.target.value }))}
                    placeholder="https://drive.google.com/..." className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-300 mb-1">Categoría</label>
                    <select value={formCap.categoria} onChange={e => setFormCap(p => ({ ...p, categoria: e.target.value }))}
                      className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80">
                      {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-300 mb-1">Estado</label>
                    <select value={formCap.estado} onChange={e => setFormCap(p => ({ ...p, estado: e.target.value as Capacitacion['estado'] }))}
                      className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80">
                      {ESTADOS_CAP.map(s => <option key={s}>{s}</option>)}
                      {formCap.estado === 'archivado' && <option value="archivado">archivado</option>}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-300 mb-1">N° Preguntas</label>
                    <input type="number" min={1} max={100} value={formCap.num_preguntas}
                      onChange={e => setFormCap(p => ({ ...p, num_preguntas: +e.target.value }))}
                      className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-300 mb-1">Nota Mínima</label>
                    <input type="number" min={1} max={20} value={formCap.nota_minima}
                      onChange={e => setFormCap(p => ({ ...p, nota_minima: +e.target.value }))}
                      className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-300 mb-1">Tiempo (min)</label>
                    <input type="number" min={5} max={180} value={formCap.tiempo_limite_min}
                      onChange={e => setFormCap(p => ({ ...p, tiempo_limite_min: +e.target.value }))}
                      className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-300 mb-1">Intervalo foto (seg)</label>
                    <input type="number" min={10} max={120} value={formCap.foto_intervalo_seg}
                      onChange={e => setFormCap(p => ({ ...p, foto_intervalo_seg: +e.target.value }))}
                      className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80" />
                  </div>
                </div>
              </div>

              {(errCap.length > 0 || faltanPreguntas) && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-100 space-y-1">
                  {errCap.map((e) => <p key={e} className="flex items-center gap-2"><FaExclamationTriangle className="shrink-0" /> {e}</p>)}
                  {faltanPreguntas && (
                    <p className="flex items-center gap-2"><FaExclamationTriangle className="shrink-0" />
                      {editCap
                        ? `Para activarla el banco necesita ${formCap.num_preguntas} preguntas activas y tiene ${activasCap}. Agrega preguntas o baja el N° de preguntas.`
                        : 'Una capacitación nueva aún no tiene preguntas: guárdala como borrador, agrega las preguntas y luego actívala.'}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setModalCap(false)}
                  className="flex-1 border border-primary-700 text-primary-200 py-2.5 rounded-xl text-sm hover:bg-primary-800/60 transition-colors">
                  Cancelar
                </button>
                <button onClick={guardarCap} disabled={savingCap || errCap.length > 0 || faltanPreguntas}
                  className="flex-1 bg-accent-electric hover:brightness-110 disabled:opacity-50 text-primary-950 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {savingCap ? <div className="w-4 h-4 border-2 border-primary-950 border-t-transparent rounded-full animate-spin" /> : <FaSave />}
                  {editCap ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL PREGUNTA ── */}
      <AnimatePresence>
        {modalPq && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalPq(false) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-primary-950 border border-primary-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">
                  {editPq ? 'Editar Pregunta' : 'Nueva Pregunta'}
                </h3>
                <button onClick={() => setModalPq(false)} className="text-primary-400 hover:text-white">
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                {/* Capacitacion */}
                <div>
                  <label className="block text-sm font-medium text-primary-300 mb-1">Capacitación *</label>
                  <select value={formPq.capacitacion_id} onChange={e => setFormPq(p => ({ ...p, capacitacion_id: e.target.value }))}
                    className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80">
                    <option value="">Seleccionar...</option>
                    {capacitaciones.filter(c => c.estado !== 'archivado').map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-300 mb-1">Pregunta *</label>
                  <textarea value={formPq.pregunta} onChange={e => setFormPq(p => ({ ...p, pregunta: e.target.value }))}
                    rows={3} className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm resize-none text-white bg-primary-900/80" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-primary-300 mb-1">Tipo</label>
                    <select value={formPq.tipo} onChange={e => setFormPq(p => ({ ...p, tipo: e.target.value as Pregunta['tipo'] }))}
                      className="w-full border border-primary-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80">
                      {TIPOS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-300 mb-1">Dificultad</label>
                    <select value={formPq.dificultad} onChange={e => setFormPq(p => ({ ...p, dificultad: e.target.value as Pregunta['dificultad'] }))}
                      className="w-full border border-primary-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80">
                      {DIFICULTADES.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-300 mb-1">Puntaje</label>
                    <input type="number" min={1} max={10} value={formPq.puntaje}
                      onChange={e => setFormPq(p => ({ ...p, puntaje: +e.target.value }))}
                      className="w-full border border-primary-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80" />
                  </div>
                </div>

                {formPq.tipo === 'multiple' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-primary-300">Opciones (A, B, C, D)</label>
                    {(['a', 'b', 'c', 'd'] as const).map(letra => (
                      <div key={letra} className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-primary-800 text-primary-200 rounded-full text-xs font-bold flex items-center justify-center shrink-0 uppercase">
                          {letra}
                        </span>
                        <input
                          type="text"
                          value={formPq[`opcion_${letra}` as keyof typeof formPq] as string || ''}
                          onChange={e => setFormPq(p => ({ ...p, [`opcion_${letra}`]: e.target.value }))}
                          placeholder={`Opción ${letra.toUpperCase()}`}
                          className="flex-1 border border-primary-700 rounded-xl px-3 py-2 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-primary-300 mb-1">Respuesta correcta (A/B/C/D) *</label>
                      <select value={formPq.respuesta_correcta} onChange={e => setFormPq(p => ({ ...p, respuesta_correcta: e.target.value }))}
                        className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80">
                        <option value="">Seleccionar...</option>
                        {['A', 'B', 'C', 'D'].map(l => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {formPq.tipo === 'llenado' && (
                  <div>
                    <label className="block text-sm font-medium text-primary-300 mb-1">Respuesta correcta (referencia) *</label>
                    <input type="text" value={formPq.respuesta_correcta}
                      onChange={e => setFormPq(p => ({ ...p, respuesta_correcta: e.target.value }))}
                      className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm text-white bg-primary-900/80" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-primary-300 mb-1">Justificación (opcional)</label>
                  <textarea value={formPq.justificacion} onChange={e => setFormPq(p => ({ ...p, justificacion: e.target.value }))}
                    rows={2} className="w-full border border-primary-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent-electric text-sm resize-none text-white bg-primary-900/80" />
                </div>
              </div>

              {errPq.length > 0 && (formPq.pregunta || editPq) && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-100 space-y-1">
                  {errPq.map((e) => <p key={e} className="flex items-center gap-2"><FaExclamationTriangle className="shrink-0" /> {e}</p>)}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setModalPq(false)}
                  className="flex-1 border border-primary-700 text-primary-200 py-2.5 rounded-xl text-sm hover:bg-primary-800/60 transition-colors">
                  Cancelar
                </button>
                <button onClick={guardarPq} disabled={savingPq || errPq.length > 0}
                  className="flex-1 bg-accent-electric hover:brightness-110 disabled:opacity-50 text-primary-950 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {savingPq ? <div className="w-4 h-4 border-2 border-primary-950 border-t-transparent rounded-full animate-spin" /> : <FaSave />}
                  {editPq ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </AdminLayout>
  )
}
