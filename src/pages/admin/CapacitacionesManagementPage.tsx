import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaPlus, FaEdit, FaTrash, FaTimes, FaBook, FaListAlt,
  FaSave, FaChevronDown, FaArrowLeft
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import { Capacitacion, Pregunta } from '../../types/capacitacion.types'

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

const emptyPregunta: Omit<Pregunta, 'id'> = {
  capacitacion_id: '', pregunta: '', tipo: 'multiple',
  opcion_a: '', opcion_b: '', opcion_c: '', opcion_d: '',
  respuesta_correcta: '', justificacion: '',
  dificultad: 'media', puntaje: 1, estado: 'activa',
}

export default function CapacitacionesManagementPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('capacitaciones')
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([])
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [loading, setLoading] = useState(true)
  const [capSeleccionada, setCapSeleccionada] = useState<string>('')

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

  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadCapacitaciones = async () => {
    setLoading(true)
    const res = await api.getCapacitaciones()
    if (res.success && res.data) setCapacitaciones(res.data)
    setLoading(false)
  }

  useEffect(() => { loadCapacitaciones() }, [])

  // Cargar preguntas cuando cambia la capacitacion seleccionada
  const loadPreguntas = async (capId: string) => {
    if (!capId) { setPreguntas([]); return }
    setLoading(true)
    const res = await api.getPreguntas(capId)
    if (res.success && res.data) setPreguntas(res.data)
    else showToast(res.error || 'Error al cargar preguntas')
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

  const guardarCap = async () => {
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

  const eliminarCap = async (id: string, titulo: string) => {
    if (!confirm(`¿Eliminar "${titulo}"? Esta acción no se puede deshacer.`)) return
    const res = await api.eliminarCapacitacion(id)
    if (res.success) {
      showToast('Capacitación eliminada')
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

  const guardarPq = async () => {
    if (!formPq.capacitacion_id) { showToast('Selecciona una capacitación'); return }
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
    } else {
      showToast('Error: ' + res.error)
    }
  }

  const eliminarPq = async (id: string) => {
    if (!confirm('¿Eliminar esta pregunta?')) return
    const res = await api.eliminarPregunta(id)
    if (res.success) {
      showToast('Pregunta eliminada')
      loadPreguntas(capSeleccionada)
    } else {
      showToast('Error: ' + res.error)
    }
  }

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      activo: 'bg-green-100 text-green-700',
      borrador: 'bg-gray-100 text-gray-600',
      cerrado: 'bg-red-100 text-red-600',
    }
    return map[estado] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-3 transition-colors group"
        >
          <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          Volver al Dashboard
        </button>
        <h1 className="text-2xl font-bold text-white">Gestión de Capacitaciones</h1>
        <p className="text-gray-400 text-sm mt-1">Administra capacitaciones y banco de preguntas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {([['capacitaciones', FaBook, 'Capacitaciones'], ['preguntas', FaListAlt, 'Banco de Preguntas']] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
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
            <p className="text-sm text-gray-400">{capacitaciones.length} capacitacion{capacitaciones.length !== 1 ? 'es' : ''}</p>
            <button
              onClick={abrirCrearCap}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <FaPlus /> Nueva capacitación
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Cargando...</div>
          ) : capacitaciones.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FaBook className="text-4xl mx-auto mb-3 opacity-30" />
              <p>No hay capacitaciones. Crea la primera.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {capacitaciones.map(cap => (
                <div key={cap.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 leading-snug">{cap.titulo}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${estadoBadge(cap.estado)}`}>
                      {cap.estado}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">{cap.descripcion}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-4">
                    <span>{cap.categoria}</span>
                    <span>{cap.num_preguntas} preg.</span>
                    <span>Nota mín: {cap.nota_minima}</span>
                    <span>{cap.tiempo_limite_min} min</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setTab('preguntas'); setCapSeleccionada(cap.id) }}
                      className="flex-1 text-center text-xs text-blue-600 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50 transition-colors"
                    >
                      Ver preguntas
                    </button>
                    <button onClick={() => abrirEditarCap(cap)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <FaEdit />
                    </button>
                    <button onClick={() => eliminarCap(cap.id, cap.titulo)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <FaTrash />
                    </button>
                  </div>
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
              <FaChevronDown className="text-gray-400 text-xs" />
              <select
                value={capSeleccionada}
                onChange={e => setCapSeleccionada(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona una capacitación</option>
                {capacitaciones.map(c => (
                  <option key={c.id} value={c.id}>{c.titulo}</option>
                ))}
              </select>
            </div>
            <button
              onClick={abrirCrearPq}
              disabled={!capSeleccionada}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <FaPlus /> Nueva pregunta
            </button>
          </div>

          {!capSeleccionada ? (
            <div className="text-center py-12 text-gray-400">
              <FaListAlt className="text-4xl mx-auto mb-3 opacity-30" />
              <p>Selecciona una capacitación para ver sus preguntas</p>
            </div>
          ) : preguntas.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FaListAlt className="text-4xl mx-auto mb-3 opacity-30" />
              <p>No hay preguntas para esta capacitación. Crea la primera con el botón de arriba.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {preguntas.map((pq, i) => (
                <div key={pq.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium leading-snug mb-1">{pq.pregunta}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full">{pq.tipo}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full">{pq.dificultad}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full">{pq.puntaje} pt</span>
                        <span className={`px-2 py-0.5 rounded-full ${pq.estado === 'activa' ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
                          {pq.estado}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => abrirEditarPq(pq)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <FaEdit className="text-xs" />
                      </button>
                      <button onClick={() => eliminarPq(pq.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>
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
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalCap(false) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">
                  {editCap ? 'Editar Capacitación' : 'Nueva Capacitación'}
                </h3>
                <button onClick={() => setModalCap(false)} className="text-gray-400 hover:text-gray-600">
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input type="text" value={formCap.titulo} onChange={e => setFormCap(p => ({ ...p, titulo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea value={formCap.descripcion} onChange={e => setFormCap(p => ({ ...p, descripcion: e.target.value }))}
                    rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none text-gray-900 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Material (opcional)</label>
                  <input type="url" value={formCap.material_url} onChange={e => setFormCap(p => ({ ...p, material_url: e.target.value }))}
                    placeholder="https://drive.google.com/..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select value={formCap.categoria} onChange={e => setFormCap(p => ({ ...p, categoria: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white">
                      {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select value={formCap.estado} onChange={e => setFormCap(p => ({ ...p, estado: e.target.value as Capacitacion['estado'] }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white">
                      {ESTADOS_CAP.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° Preguntas</label>
                    <input type="number" min={1} max={100} value={formCap.num_preguntas}
                      onChange={e => setFormCap(p => ({ ...p, num_preguntas: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nota Mínima</label>
                    <input type="number" min={1} max={20} value={formCap.nota_minima}
                      onChange={e => setFormCap(p => ({ ...p, nota_minima: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo (min)</label>
                    <input type="number" min={5} max={180} value={formCap.tiempo_limite_min}
                      onChange={e => setFormCap(p => ({ ...p, tiempo_limite_min: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo foto (seg)</label>
                    <input type="number" min={10} max={120} value={formCap.foto_intervalo_seg}
                      onChange={e => setFormCap(p => ({ ...p, foto_intervalo_seg: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setModalCap(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={guardarCap} disabled={savingCap || !formCap.titulo}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {savingCap ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaSave />}
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
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalPq(false) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">
                  {editPq ? 'Editar Pregunta' : 'Nueva Pregunta'}
                </h3>
                <button onClick={() => setModalPq(false)} className="text-gray-400 hover:text-gray-600">
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                {/* Capacitacion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacitación *</label>
                  <select value={formPq.capacitacion_id} onChange={e => setFormPq(p => ({ ...p, capacitacion_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white">
                    <option value="">Seleccionar...</option>
                    {capacitaciones.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta *</label>
                  <textarea value={formPq.pregunta} onChange={e => setFormPq(p => ({ ...p, pregunta: e.target.value }))}
                    rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none text-gray-900 bg-white" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select value={formPq.tipo} onChange={e => setFormPq(p => ({ ...p, tipo: e.target.value as Pregunta['tipo'] }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white">
                      {TIPOS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dificultad</label>
                    <select value={formPq.dificultad} onChange={e => setFormPq(p => ({ ...p, dificultad: e.target.value as Pregunta['dificultad'] }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white">
                      {DIFICULTADES.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Puntaje</label>
                    <input type="number" min={1} max={10} value={formPq.puntaje}
                      onChange={e => setFormPq(p => ({ ...p, puntaje: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white" />
                  </div>
                </div>

                {formPq.tipo === 'multiple' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Opciones (A, B, C, D)</label>
                    {(['a', 'b', 'c', 'd'] as const).map(letra => (
                      <div key={letra} className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-gray-100 rounded-full text-xs font-bold flex items-center justify-center shrink-0 uppercase">
                          {letra}
                        </span>
                        <input
                          type="text"
                          value={formPq[`opcion_${letra}` as keyof typeof formPq] as string || ''}
                          onChange={e => setFormPq(p => ({ ...p, [`opcion_${letra}`]: e.target.value }))}
                          placeholder={`Opción ${letra.toUpperCase()}`}
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta correcta (A/B/C/D) *</label>
                      <select value={formPq.respuesta_correcta} onChange={e => setFormPq(p => ({ ...p, respuesta_correcta: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white">
                        <option value="">Seleccionar...</option>
                        {['A', 'B', 'C', 'D'].map(l => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {formPq.tipo === 'llenado' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta correcta (referencia) *</label>
                    <input type="text" value={formPq.respuesta_correcta}
                      onChange={e => setFormPq(p => ({ ...p, respuesta_correcta: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Justificación (opcional)</label>
                  <textarea value={formPq.justificacion} onChange={e => setFormPq(p => ({ ...p, justificacion: e.target.value }))}
                    rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none text-gray-900 bg-white" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setModalPq(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={guardarPq} disabled={savingPq || !formPq.pregunta || !formPq.capacitacion_id}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {savingPq ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaSave />}
                  {editPq ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
