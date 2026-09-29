import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FaFolderOpen, FaSearch, FaPlus, FaTimes, FaSave, FaSpinner, FaCheck, FaExclamationTriangle } from 'react-icons/fa'
import { api, LicDocumento, LicPropuesta } from '../../../api/appScriptApi'
import { VISTAS, Vista, agrupar, FilaDocumento, VistaPropuestas, PanelDrive } from './DocumentosVistas'
import PersonalDrive from './PersonalDrive'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import EmptyState from '../../../components/common/EmptyState'
import TableSkeleton from '../../../components/common/TableSkeleton'
import { useToast } from '../../../context/ToastContext'
import { fecha, Pestanas } from './licUtils'

const CATEGORIAS = ['personal', 'experiencia', 'equipos', 'empresa', 'anexos'] as const
const ETIQUETA_CATEGORIA: Record<string, string> = {
  personal: 'Personal', experiencia: 'Experiencia', equipos: 'Equipos', empresa: 'Empresa', anexos: 'Anexos',
}

function diasParaVencer(v: string): number | null {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

function VenceBadge({ vence }: { vence: string }) {
  const d = diasParaVencer(vence)
  if (d === null) return <span className="text-primary-600 text-xs">—</span>
  if (d < 0) return <span className="px-2 py-0.5 rounded-full text-[11px] bg-red-500/20 text-red-400">Venció {fecha(vence)}</span>
  if (d <= 30) return <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-500/20 text-amber-300">Vence {fecha(vence)}</span>
  return <span className="text-primary-400 text-xs">{fecha(vence)}</span>
}

interface FormNuevo {
  categoria: string
  tipo: string
  titulo: string
  entidad: string
  dni: string
  nombre: string
  fecha: string
  periodo_desde: string
  periodo_hasta: string
  monto: string
  archivo_vault: string
  notas: string
}

const FORM_VACIO: FormNuevo = {
  categoria: 'personal', tipo: '', titulo: '', entidad: '', dni: '', nombre: '',
  fecha: '', periodo_desde: '', periodo_hasta: '', monto: '', archivo_vault: '', notas: '',
}

// Estado del documento en palabras: revisado / pendiente / con problema + vencimiento
function EstadoDoc({ verificado, vence }: { verificado: string; vence: string }) {
  const v = verificado === 'si'
    ? { t: '✔ Revisado', c: 'bg-green-500/15 text-green-300 border-green-500/40' }
    : verificado === 'no'
      ? { t: '✖ Tiene un problema', c: 'bg-red-500/15 text-red-300 border-red-500/40' }
      : { t: 'Sin revisar', c: 'bg-primary-800 text-primary-300 border-primary-700' }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`px-2 py-0.5 text-xs border whitespace-nowrap ${v.c}`}>{v.t}</span>
      {vence && <VenceBadge vence={vence} />}
    </div>
  )
}

export default function LicDocumentosPage() {
  const toast = useToast()
  const [lista, setLista] = useState<LicDocumento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  // Vista por tema (antes: chips por categoría con los recortes sueltos)
  const [vista, setVista] = useState<Vista>('personal')
  const [propuestas, setPropuestas] = useState<LicPropuesta[]>([])
  const [busqueda, setBusqueda] = useState(() => searchParams.get('dni') || '')
  const [editando, setEditando] = useState<Record<string, Partial<LicDocumento>>>({})
  const [guardandoId, setGuardandoId] = useState<string | null>(null)
  // Fila abierta para editar (una a la vez): la tabla muestra solo el estado
  const [abierto, setAbierto] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormNuevo>(FORM_VACIO)
  const [creando, setCreando] = useState(false)

  const cargar = async () => {
    setCargando(true)
    setError('')
    const [r, rp] = await Promise.all([api.licDocumentos(), api.licPropuestas()])
    setCargando(false)
    if (rp.success && rp.data) setPropuestas(rp.data)
    if (r.success && r.data) setLista(r.data)
    else setError(r.error || 'Error desconocido')
  }

  useEffect(() => { cargar() }, [])


  const valorEditado = <K extends keyof LicDocumento>(d: LicDocumento, campo: K): LicDocumento[K] =>
    (editando[d.id]?.[campo] as LicDocumento[K]) ?? d[campo]

  const marcarEdicion = (id: string, cambios: Partial<LicDocumento>) => {
    setEditando((prev) => ({ ...prev, [id]: { ...prev[id], ...cambios } }))
  }

  const guardarFila = async (d: LicDocumento) => {
    const cambios = editando[d.id]
    if (!cambios) return
    setGuardandoId(d.id)
    const r = await api.licActualizarDocumento({ id: d.id, ...cambios } as { id: string; verificado?: string; vence?: string; notas?: string })
    setGuardandoId(null)
    if (r.success) {
      setLista((prev) => prev.map((x) => (x.id === d.id ? { ...x, ...cambios } : x)))
      setEditando((prev) => { const { [d.id]: _quitado, ...resto } = prev; return resto })
      toast.success('Documento actualizado')
    } else {
      toast.error(r.error || 'No se pudo guardar')
    }
  }

  const crearDocumento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.categoria || !form.titulo.trim()) {
      toast.error('Completa al menos la categoría y el título')
      return
    }
    setCreando(true)
    const r = await api.licCrearDocumento({
      ...form,
      monto: form.monto ? Number(form.monto) : undefined,
    })
    setCreando(false)
    if (r.success && r.data) {
      toast.success('Documento creado')
      setLista((prev) => [r.data as LicDocumento, ...prev])
      setShowModal(false)
      setForm(FORM_VACIO)
    } else {
      toast.error(r.error || 'No se pudo crear el documento')
    }
  }


  // Estado y editor de un documento (se usan en las listas y en el Drive del personal)
  const estadoDe = (doc: LicDocumento) => (
    <EstadoDoc verificado={valorEditado(doc, 'verificado') || ''} vence={valorEditado(doc, 'vence') || ''} />
  )
  const edicionDe = (doc: LicDocumento) => (
                            <div className="grid sm:grid-cols-[auto_auto_1fr_auto] gap-4 items-end bg-primary-950/60 p-3 border border-primary-800">
                              <label className="text-xs text-primary-300">
                                ¿Ya lo revisaste?
                                <select
                                  value={valorEditado(doc, 'verificado') || ''}
                                  onChange={(e) => marcarEdicion(doc.id, { verificado: e.target.value })}
                                  className="block mt-1 bg-primary-800 border border-primary-700 px-2 py-2 text-sm text-white focus:outline-none focus:border-accent-electric"
                                >
                                  <option value="">Todavía no</option>
                                  <option value="si">Sí, está bien</option>
                                  <option value="no">Tiene un problema</option>
                                </select>
                              </label>
                              <label className="text-xs text-primary-300">
                                ¿Cuándo vence? (si aplica)
                                <input
                                  type="date"
                                  value={valorEditado(doc, 'vence') || ''}
                                  onChange={(e) => marcarEdicion(doc.id, { vence: e.target.value })}
                                  className="block mt-1 bg-primary-800 border border-primary-700 px-2 py-2 text-sm text-white focus:outline-none focus:border-accent-electric"
                                />
                              </label>
                              <label className="text-xs text-primary-300">
                                Nota
                                <input
                                  type="text"
                                  value={valorEditado(doc, 'notas') || ''}
                                  onChange={(e) => marcarEdicion(doc.id, { notas: e.target.value })}
                                  placeholder="Ej.: pedir copia legalizada"
                                  className="block w-full mt-1 bg-primary-800 border border-primary-700 px-2 py-2 text-sm text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                                />
                              </label>
                              <button
                                onClick={async () => { await guardarFila(doc); setAbierto(null) }}
                                disabled={!editando[doc.id] || guardandoId === doc.id}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent-energy text-[#111827] font-semibold text-sm disabled:opacity-40"
                              >
                                {guardandoId === doc.id ? <FaSpinner className="animate-spin" /> : <FaSave />} Guardar
                              </button>
                            </div>
                          )

  const grupos = useMemo(
    () => (vista === 'propuestas' ? [] : agrupar(lista, vista, busqueda)),
    [lista, vista, busqueda],
  )


  return (
    <AdminLayout>
      <Pestanas grupo="carpeta" />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <FaFolderOpen className="text-accent-electric" /> Documentos
            </h1>
            <p className="text-primary-400">Los papeles que importan, cada uno con la propuesta completa de la que salió. Los anexos ya no se listan sueltos.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 shrink-0">
            <FaPlus /> Agregar documento
          </button>
        </div>

        <PanelDrive />

        {!cargando && !error && lista.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              {VISTAS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { setVista(v.id); setAbierto(null) }}
                  className={`flex items-center gap-2 px-3 py-3 text-sm font-semibold border transition-colors text-left ${vista === v.id
                    ? 'bg-accent-energy text-[#111827] border-accent-energy'
                    : 'bg-primary-900/60 border-primary-700 text-primary-200 hover:border-primary-500'}`}
                >
                  <span className="text-base">{v.icono}</span>{v.texto}
                </button>
              ))}
            </div>
            <p className="text-sm text-primary-400">{VISTAS.find((v) => v.id === vista)?.ayuda}</p>
            {vista !== 'propuestas' && (
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, DNI, contrato o título…"
                  className="w-full pl-10 pr-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                />
              </div>
            )}
          </div>
        )}

        {cargando ? (
          <TableSkeleton rows={6} cols={6} />
        ) : error ? (
          <ErrorCarga que="el acervo de documentos" error={error} onReintentar={cargar} />
        ) : lista.length === 0 ? (
          <EmptyState
            icon={<FaFolderOpen />}
            title="El acervo todavía está vacío"
            hint="Se llena al importar documentos.json desde el vault (catálogo de personal, experiencia, equipos, empresa y anexos), o agregando documentos a mano con el botón de arriba."
            action={
              <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                <FaPlus /> Agregar el primero
              </button>
            }
          />
        ) : vista === 'propuestas' ? (
          <VistaPropuestas propuestas={propuestas} documentos={lista} />
        ) : vista === 'personal' ? (
          <PersonalDrive lista={lista} busqueda={busqueda} estadoDe={estadoDe} edicionDe={edicionDe} />
        ) : grupos.length === 0 ? (
          <EmptyState icon={<FaSearch />} title="Nada por aquí" hint="No hay documentos de este tema, o la búsqueda no coincide." />
        ) : (
          <div className="space-y-4">
            {grupos.map((g) => (
              <section key={g.titulo} className="bg-primary-900/50 border border-primary-800">
                <header className="flex items-baseline justify-between gap-3 px-4 py-3 border-b border-primary-800 bg-primary-900/80">
                  <h2 className="font-display font-semibold text-white">{g.titulo}</h2>
                  <span className="text-xs text-primary-400">
                    {g.subtitulo ? `${g.subtitulo} · ` : ''}{g.docs.length} {g.docs.length === 1 ? 'documento' : 'documentos'}
                  </span>
                </header>
                <ul>
                  {g.docs.map((u) => (
                    <FilaDocumento
                      key={u.doc.id}
                      u={u}
                      abierto={abierto === u.doc.id}
                      onEditar={() => setAbierto(abierto === u.doc.id ? null : u.doc.id)}
                      estado={estadoDe(u.doc)}
                      edicion={edicionDe(u.doc)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-primary-900 rounded-xl border border-primary-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-primary-800">
                  <h2 className="text-xl font-display font-semibold text-white">Agregar documento</h2>
                  <button onClick={() => setShowModal(false)} className="text-primary-400 hover:text-white">
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={crearDocumento} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Categoría</label>
                      <select
                        value={form.categoria}
                        onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        {CATEGORIAS.map((c) => <option key={c} value={c}>{ETIQUETA_CATEGORIA[c]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Tipo</label>
                      <input
                        type="text"
                        value={form.tipo}
                        onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                        placeholder="Ej: DNI, certificado, contrato…"
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1">Título *</label>
                    <input
                      type="text"
                      value={form.titulo}
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Nombre (personal)</label>
                      <input
                        type="text"
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">DNI</label>
                      <input
                        type="text"
                        value={form.dni}
                        onChange={(e) => setForm({ ...form, dni: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-primary-200 mb-1">Entidad (experiencia)</label>
                      <input
                        type="text"
                        value={form.entidad}
                        onChange={(e) => setForm({ ...form, entidad: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Fecha</label>
                      <input
                        type="date"
                        value={form.fecha}
                        onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Monto (S/.)</label>
                      <input
                        type="number"
                        value={form.monto}
                        onChange={(e) => setForm({ ...form, monto: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Periodo desde</label>
                      <input
                        type="date"
                        value={form.periodo_desde}
                        onChange={(e) => setForm({ ...form, periodo_desde: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Periodo hasta</label>
                      <input
                        type="date"
                        value={form.periodo_hasta}
                        onChange={(e) => setForm({ ...form, periodo_hasta: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1">Referencia en el vault (opcional)</label>
                    <input
                      type="text"
                      value={form.archivo_vault}
                      onChange={(e) => setForm({ ...form, archivo_vault: e.target.value })}
                      placeholder="Ruta relativa del archivo en el vault…"
                      className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1">Notas</label>
                    <textarea
                      value={form.notas}
                      onChange={(e) => setForm({ ...form, notas: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric resize-none"
                    />
                  </div>
                  <p className="flex items-start gap-2 text-xs text-amber-300">
                    <FaExclamationTriangle className="mt-0.5 shrink-0" />
                    Este documento se guarda solo en el panel: si luego se reimporta el catálogo del vault, no se pierde
                    (el import respeta las filas que no vienen en el JSON).
                  </p>
                  <div className="flex justify-end gap-3 pt-4 border-t border-primary-800">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-primary-300 hover:text-white transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={creando} className="btn-primary flex items-center gap-2">
                      {creando ? <FaSpinner className="animate-spin" /> : <FaCheck />} Crear documento
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AdminLayout>
  )
}
