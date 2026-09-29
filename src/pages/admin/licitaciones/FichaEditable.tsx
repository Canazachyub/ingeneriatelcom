import { useEffect, useMemo, useState } from 'react'
import { FaTimes, FaSave, FaSpinner, FaArchive, FaUndo, FaHistory, FaPen, FaCheck, FaSearch, FaExclamationTriangle, FaBoxOpen } from 'react-icons/fa'
import { api, LicCambio, LicPersonal, Project } from '../../../api/appScriptApi'
import { useToast } from '../../../context/ToastContext'
import { ESQUEMAS, EntidadLic, CampoLic, claveDe, todosLosCampos, aTextoCampo, validarCampo, aValorEnvio } from './licEsquemas'

// ============================================================
// Ficha editable única para TODO Licitaciones ("fácil de usar, difícil de
// malograr"):
//   · Muestra solo campos con nombre claro, ayuda y validación al escribir.
//   · Guardar dice cuántos cambios hay; cerrar con cambios pide confirmación.
//   · Nada se borra: "Archivar" oculta la ficha y se recupera con un clic.
//   · Pestaña Historial: quién cambió qué y botón "Deshacer" por cambio.
//   · Lo corregido en la web queda marcado y el import del vault no lo pisa.
// ============================================================

type Fila = Record<string, unknown>

interface Props {
  entidad: EntidadLic
  /** ficha a editar; null = crear una nueva */
  fila: Fila | null
  /** valores con los que arranca una ficha nueva (p. ej. la licitación del postor) */
  inicial?: Fila
  /** claves que no se deben pedir al crear porque ya vienen en `inicial` */
  clavesFijas?: string[]
  titulo?: string
  onCerrar: () => void
  onGuardado: (fila: Fila) => void
}

const input = 'w-full bg-slate-900 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-energy'

export default function FichaEditable({ entidad, fila: filaProp, inicial, clavesFijas = [], titulo, onCerrar, onGuardado }: Props) {
  // Copia local: "Deshacer" la actualiza sin cerrar la ficha; al cerrar se avisa para recargar
  const [fila, setFila] = useState<Fila | null>(filaProp)
  const [tocada, setTocada] = useState(false)
  const cerrar = () => (tocada && fila ? onGuardado(fila) : onCerrar())
  const toast = useToast()
  const esq = ESQUEMAS[entidad]
  const crear = !fila
  const campos = useMemo(() => todosLosCampos(entidad), [entidad])
  const camposWeb = (fila?.campos_web as string[] | undefined) || []

  const valoresIniciales = useMemo(() => {
    const base = { ...(inicial || {}), ...(fila || {}) }
    const v: Record<string, string> = {}
    campos.concat(esq.clave).forEach((c) => { v[c.k] = aTextoCampo(c.tipo, base[c.k]) })
    return v
  }, [fila, inicial, campos, esq.clave])

  const [valores, setValores] = useState(valoresIniciales)
  const [pestana, setPestana] = useState<'datos' | 'historial'>('datos')
  const [guardando, setGuardando] = useState(false)
  const [confirmar, setConfirmar] = useState<null | 'cerrar' | 'archivar'>(null)
  const [error, setError] = useState('')

  useEffect(() => { setValores(valoresIniciales) }, [valoresIniciales])

  const cambiados = campos.filter((c) => (valores[c.k] ?? '') !== (valoresIniciales[c.k] ?? ''))
  const clavesPedidas = crear ? esq.clave.filter((c) => !clavesFijas.includes(c.k)) : []
  const errores: Record<string, string> = {}
  campos.concat(clavesPedidas).forEach((c) => {
    const e = validarCampo(c, valores[c.k] || '')
    if (e) errores[c.k] = e
  })
  const obligatoriosVacios = crear ? esq.obligatorios.filter((k) => !(valores[k] || '').trim()) : []
  const hayCambios = crear ? campos.some((c) => (valores[c.k] || '') !== '') || clavesPedidas.some((c) => valores[c.k]) : cambiados.length > 0
  const puedeGuardar = hayCambios && !Object.keys(errores).length && !obligatoriosVacios.length && !guardando

  const intentarCerrar = () => {
    if (hayCambios && !guardando) setConfirmar('cerrar')
    else cerrar()
  }

  // Esc cierra (pidiendo confirmación si hay cambios)
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') intentarCerrar() }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  const guardar = async () => {
    if (!puedeGuardar) return
    setGuardando(true)
    setError('')
    const enviar = crear ? campos.filter((c) => (valores[c.k] || '') !== '') : cambiados
    const cambios: Fila = {}
    enviar.forEach((c) => { cambios[c.k] = aValorEnvio(c.tipo, valores[c.k] || '') })
    const clave: Record<string, string> = crear
      ? Object.fromEntries(esq.clave.map((c) => [c.k, (valores[c.k] || String(inicial?.[c.k] ?? '')).trim()]))
      : claveDe(entidad, fila!)
    const r = await api.licGuardar({ entidad, clave, cambios, crear })
    setGuardando(false)
    if (!r.success) { setError(r.error || 'No se pudo guardar'); return }
    toast.success(r.message || 'Guardado')
    onGuardado({ ...(fila || {}), ...(r.data || {}) })
  }

  const archivar = async () => {
    setGuardando(true)
    const r = await api.licArchivar({ entidad, clave: claveDe(entidad, fila!), archivar: !fila!.archivado })
    setGuardando(false)
    setConfirmar(null)
    if (!r.success) { setError(r.error || 'No se pudo archivar'); return }
    toast.success(r.message || 'Listo')
    onGuardado({ ...fila!, archivado: fila!.archivado ? '' : new Date().toISOString() })
  }

  const nombreFicha = titulo || String(fila?.nombre || fila?.titulo || fila?.razon_social || fila?.nomenclatura || fila?.contrato || fila?.proceso || fila?.numero || '')

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onMouseDown={(e) => { if (e.target === e.currentTarget) intentarCerrar() }}>
      <div className="w-full max-w-2xl h-full flex flex-col bg-[#0f172a] border-l-2 border-accent-energy shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-start gap-3 p-5 border-b border-slate-700">
          <div className="flex-1 min-w-0">
            <p className="rotulo-estencil mb-1">{crear ? `Nuevo ${esq.nombre}` : `Editar ${esq.nombre}`}</p>
            <h2 className="text-xl font-display font-bold text-white leading-tight truncate">{crear ? (titulo || `Agregar ${esq.nombre}`) : nombreFicha}</h2>
            {!crear && (
              <div className="flex flex-wrap gap-2 mt-2">
                {esq.clave.map((c) => (
                  <span key={c.k} className="px-2 py-0.5 text-[11px] bg-slate-800 border border-slate-600 text-slate-300 font-mono" title="Este dato identifica la ficha y no se cambia">
                    {c.etiqueta}: {String(fila?.[c.k] ?? '')}
                  </span>
                ))}
                <EtiquetaEdicion fila={fila!} />
              </div>
            )}
          </div>
          <button onClick={intentarCerrar} className="p-2 text-slate-400 hover:text-white" aria-label="Cerrar"><FaTimes /></button>
        </div>

        {!crear && (
          <div className="flex border-b border-slate-700 text-sm">
            {(['datos', 'historial'] as const).map((p) => (
              <button key={p} onClick={() => setPestana(p)}
                className={`px-5 py-2.5 font-semibold inline-flex items-center gap-2 ${pestana === p ? 'text-[#111827] bg-accent-energy' : 'text-slate-300 hover:text-white'}`}>
                {p === 'datos' ? <><FaPen className="text-xs" /> Datos</> : <><FaHistory className="text-xs" /> Historial de cambios</>}
              </button>
            ))}
          </div>
        )}

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {pestana === 'historial' && fila ? (
            <Historial entidad={entidad} fila={fila} onDeshecho={(f) => { setFila({ ...fila, ...f }); setTocada(true) }} />
          ) : (
            <>
              {clavesPedidas.length > 0 && (
                <Seccion titulo="Identificación (no se podrá cambiar después)">
                  {clavesPedidas.map((c) => (
                    <Campo key={c.k} c={c} valor={valores[c.k] || ''} error={errores[c.k]} obligatorio
                      onChange={(v) => setValores({ ...valores, [c.k]: v })} />
                  ))}
                </Seccion>
              )}
              {esq.secciones.map((s) => (
                <Seccion key={s.titulo} titulo={s.titulo}>
                  {s.campos.map((c) => (
                    <Campo key={c.k} c={c} valor={valores[c.k] || ''} error={errores[c.k]}
                      obligatorio={esq.obligatorios.includes(c.k)}
                      marcado={camposWeb.includes(c.k)}
                      cambiado={!crear && (valores[c.k] ?? '') !== (valoresIniciales[c.k] ?? '')}
                      onChange={(v) => setValores({ ...valores, [c.k]: v })} />
                  ))}
                </Seccion>
              ))}
            </>
          )}
        </div>

        {/* Pie */}
        <div className="border-t border-slate-700 p-4 space-y-3">
          {error && <p className="text-sm text-red-300 flex items-start gap-2"><FaExclamationTriangle className="mt-0.5 shrink-0" /> {error}</p>}
          {confirmar === 'cerrar' && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/50 text-sm text-amber-200">
              <span className="flex-1">Tienes cambios sin guardar. ¿Salir sin guardarlos?</span>
              <button onClick={() => setConfirmar(null)} className="px-3 py-1.5 bg-accent-energy text-[#111827] font-semibold">Seguir editando</button>
              <button onClick={cerrar} className="px-3 py-1.5 border border-slate-500 text-slate-200">Salir sin guardar</button>
            </div>
          )}
          {confirmar === 'archivar' && fila && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-800 border border-slate-500 text-sm text-slate-200">
              <span className="flex-1">
                {fila.archivado ? 'Volverá a aparecer en las listas.' : 'Se ocultará de las listas. No se borra: la recuperas con "Ver archivados".'}
              </span>
              <button onClick={() => setConfirmar(null)} className="px-3 py-1.5 border border-slate-500">Cancelar</button>
              <button onClick={archivar} disabled={guardando} className="px-3 py-1.5 bg-accent-energy text-[#111827] font-semibold">
                {fila.archivado ? 'Sí, recuperar' : 'Sí, archivar'}
              </button>
            </div>
          )}
          {pestana === 'datos' && (
            <div className="flex flex-wrap items-center gap-3">
              {!crear && (
                <button onClick={() => setConfirmar('archivar')} className="px-3 py-2 text-sm border border-slate-600 text-slate-300 hover:border-slate-400 inline-flex items-center gap-2">
                  {fila?.archivado ? <><FaBoxOpen /> Recuperar</> : <><FaArchive /> Archivar</>}
                </button>
              )}
              <span className="flex-1 text-xs text-slate-400">
                {obligatoriosVacios.length ? `Falta: ${obligatoriosVacios.map((k) => campos.concat(esq.clave).find((c) => c.k === k)?.etiqueta || k).join(', ')}`
                  : Object.keys(errores).length ? 'Corrige los campos en rojo' : ''}
              </span>
              <button onClick={intentarCerrar} className="px-4 py-2 text-sm border border-slate-600 text-slate-200">Cancelar</button>
              <button onClick={guardar} disabled={!puedeGuardar}
                className="px-5 py-2 text-sm bg-accent-energy text-[#111827] font-bold inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                {guardando ? <FaSpinner className="animate-spin" /> : <FaSave />}
                {crear ? `Crear ${esq.nombre}` : cambiados.length ? `Guardar ${cambiados.length} cambio${cambiados.length > 1 ? 's' : ''}` : 'Sin cambios'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-[11px] font-bold uppercase tracking-widest text-accent-energy mb-3">{titulo}</legend>
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
    </fieldset>
  )
}

function Campo({ c, valor, error, obligatorio, marcado, cambiado, onChange }: {
  c: CampoLic; valor: string; error?: string; obligatorio?: boolean; marcado?: boolean; cambiado?: boolean; onChange: (v: string) => void
}) {
  const idLista = `sug-${c.k}`
  const borde = error ? ' border-red-500' : cambiado ? ' border-accent-energy' : ''
  let control: React.ReactNode
  if (c.tipo === 'l') control = <textarea value={valor} rows={3} onChange={(e) => onChange(e.target.value)} className={input + borde} />
  else if (c.tipo === 'o') control = (
    <select value={valor} onChange={(e) => onChange(e.target.value)} className={input + borde}>
      {c.opciones?.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
    </select>
  )
  else if (c.tipo === 'b') control = (
    <div className="flex gap-2">
      {[['si', 'Sí'], ['no', 'No']].map(([v, t]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`flex-1 py-2 text-sm border ${valor === v ? 'bg-accent-energy text-[#111827] border-accent-energy font-bold' : 'border-slate-600 text-slate-300'}`}>{t}</button>
      ))}
    </div>
  )
  else if (c.tipo === 'd') control = <input type="date" value={valor} onChange={(e) => onChange(e.target.value)} className={input + borde} />
  else if (c.tipo === 'personas') control = <SelectorPersonas valor={valor} onChange={onChange} />
  else if (c.tipo === 'proyecto') control = <SelectorProyecto valor={valor} onChange={onChange} clase={input + borde} />
  else if (c.soloLectura) control = <input value={valor || '—'} readOnly className={input + ' opacity-60 cursor-not-allowed'} />
  else control = (
    <div className="relative">
      {c.tipo === 'm' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">S/</span>}
      <input value={valor} onChange={(e) => onChange(e.target.value)} list={c.sugerencias ? idLista : undefined}
        inputMode={c.tipo === 'n' || c.tipo === 'm' || c.tipo === 'p' ? 'decimal' : undefined}
        className={input + borde + (c.tipo === 'm' ? ' pl-9' : '') + (c.tipo === 'p' ? ' pr-8' : '')} />
      {c.tipo === 'p' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>}
      {c.sugerencias && <datalist id={idLista}>{c.sugerencias.map((s) => <option key={s} value={s} />)}</datalist>}
    </div>
  )
  return (
    <label className={`block text-xs ${c.ancho === 'completo' || c.tipo === 'personas' ? 'sm:col-span-2' : ''}`}>
      <span className="flex items-center gap-2 mb-1 text-slate-300">
        {c.etiqueta}{obligatorio && <span className="text-accent-energy">*</span>}
        {marcado && <span className="text-[10px] text-sky-300" title="Corregido en la web: al importar del vault no se pisa">✎ corregido</span>}
      </span>
      {control}
      {error ? <span className="block mt-1 text-red-300">{error}</span> : c.ayuda && <span className="block mt-1 text-slate-500">{c.ayuda}</span>}
    </label>
  )
}

// Lista del personal clave para marcar con check (se guarda la lista de DNI)
function SelectorPersonas({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const [personas, setPersonas] = useState<LicPersonal[]>([])
  const [q, setQ] = useState('')
  useEffect(() => { api.licPersonal().then((r) => { if (r.success && r.data) setPersonas(r.data) }) }, [])
  let elegidos: string[] = []
  try { elegidos = JSON.parse(valor || '[]') } catch { elegidos = [] }
  const alternar = (dni: string) => onChange(JSON.stringify(elegidos.includes(dni) ? elegidos.filter((d) => d !== dni) : [...elegidos, dni]))
  const visibles = personas.filter((p) => !q || p.nombre.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="border border-slate-600 bg-slate-900">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
        <FaSearch className="text-slate-500 text-xs" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona…" className="flex-1 bg-transparent text-sm text-white focus:outline-none" />
        <span className="text-slate-400">{elegidos.length} elegidos</span>
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-slate-800">
        {visibles.map((p) => (
          <button type="button" key={p.dni} onClick={() => alternar(String(p.dni))} className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-800">
            <span className={`w-5 h-5 flex items-center justify-center border ${elegidos.includes(String(p.dni)) ? 'bg-accent-energy border-accent-energy text-[#111827]' : 'border-slate-500'}`}>
              {elegidos.includes(String(p.dni)) && <FaCheck className="text-[10px]" />}
            </span>
            <span className="text-slate-200">{p.nombre}</span>
          </button>
        ))}
        {!visibles.length && <p className="px-3 py-3 text-slate-500">Sin coincidencias. Agrega a la persona en Personal clave.</p>}
      </div>
    </div>
  )
}

// Proyectos de Gestión > Proyectos (la asistencia del servicio sale de sus asignaciones)
function SelectorProyecto({ valor, onChange, clase }: { valor: string; onChange: (v: string) => void; clase: string }) {
  const [proyectos, setProyectos] = useState<Project[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.getProjects().then((r) => {
      if (r.success && r.data) setProyectos(r.data)
      else { setProyectos([]); setError(r.error || 'No se pudieron cargar los proyectos') }
    })
  }, [])
  if (proyectos === null) return <p className="text-slate-400 py-2"><FaSpinner className="inline animate-spin mr-2" />Cargando proyectos…</p>
  if (error && !proyectos.length) {
    return (
      <div>
        <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder="Código del proyecto (ej. PROY001)" className={clase} />
        <span className="block mt-1 text-amber-300/80">{error}. Escribe el código a mano o elígelo en la web publicada.</span>
      </div>
    )
  }
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)} className={clase}>
      <option value="">Sin proyecto</option>
      {valor && !proyectos.some((p) => p.id === valor) && <option value={valor}>{valor} (no encontrado)</option>}
      {proyectos.map((p) => <option key={p.id} value={p.id}>{p.name}{p.city ? ` · ${p.city}` : ''}</option>)}
    </select>
  )
}

const ACCION: Record<string, string> = { crear: 'Creó la ficha', archivar: 'Archivó', restaurar: 'Recuperó', editar: 'Cambió' }

function Historial({ entidad, fila, onDeshecho }: { entidad: EntidadLic; fila: Fila; onDeshecho: (f: Fila) => void }) {
  const toast = useToast()
  const [lista, setLista] = useState<LicCambio[] | null>(null)
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const etiqueta = (k: string) => todosLosCampos(entidad).find((c) => c.k === k)?.etiqueta || k
  const cargar = () => api.licHistorial({ entidad, clave: claveDe(entidad, fila) }).then((r) => setLista(r.success && r.data ? r.data : []))
  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const deshacer = async (h: LicCambio) => {
    setTrabajando(h.id)
    const r = await api.licDeshacer(h.id)
    setTrabajando(null)
    if (!r.success) { toast.error(r.error || 'No se pudo deshacer'); return }
    toast.success(r.message || 'Deshecho')
    onDeshecho(h.accion === 'editar' ? { [h.campo]: h.antes } : { archivado: h.accion === 'archivar' ? '' : 'si' })
    cargar()
  }
  if (!lista) return <p className="text-slate-400 text-sm"><FaSpinner className="inline animate-spin mr-2" />Cargando historial…</p>
  if (!lista.length) return <p className="text-slate-400 text-sm">Esta ficha no se ha cambiado desde la web. Todo lo que ves viene del vault.</p>
  return (
    <ol className="space-y-2">
      {lista.map((h) => (
        <li key={h.id} className="p-3 bg-slate-900 border border-slate-700 text-sm">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-slate-300">
                <b className="text-white">{h.usuario || 'Alguien'}</b> · {ACCION[h.accion] || h.accion}{h.accion === 'editar' ? <> <b className="text-accent-energy">{etiqueta(h.campo)}</b></> : ''}
                <span className="text-slate-500"> · {new Date(h.fecha).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </p>
              {h.accion === 'editar' && (
                <p className="mt-1 text-xs">
                  <span className="text-red-300/80 line-through break-all">{h.antes || '(vacío)'}</span>
                  <span className="text-slate-500 mx-2">→</span>
                  <span className="text-green-300 break-all">{h.despues || '(vacío)'}</span>
                </p>
              )}
            </div>
            <button onClick={() => deshacer(h)} disabled={trabajando === h.id}
              className="px-2.5 py-1 text-xs border border-slate-600 text-slate-200 hover:border-accent-energy inline-flex items-center gap-1.5 shrink-0">
              {trabajando === h.id ? <FaSpinner className="animate-spin" /> : <FaUndo />} Deshacer
            </button>
          </div>
        </li>
      ))}
    </ol>
  )
}

// ── Piezas para las listas ───────────────────────────────────────

/** Distintivo: creado/corregido en la web o archivado. */
export function EtiquetaEdicion({ fila }: { fila: Fila }) {
  if (fila.archivado) return <span className="px-2 py-0.5 text-[11px] bg-slate-700 text-slate-300 border border-slate-500">Archivado</span>
  if (fila.origen === 'web') return <span className="px-2 py-0.5 text-[11px] bg-sky-500/15 text-sky-300 border border-sky-500/40">Agregado en la web</span>
  const n = ((fila.campos_web as string[] | undefined) || []).length
  if (n) return <span className="px-2 py-0.5 text-[11px] bg-sky-500/15 text-sky-300 border border-sky-500/40" title="Estos datos ya no se pisan al importar del vault">✎ Corregido en la web</span>
  return null
}

/** Interruptor "Ver archivados" para las listas. */
export function VerArchivados({ activo, onChange }: { activo: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!activo)}
      className={`px-3 py-2 text-xs border inline-flex items-center gap-2 ${activo ? 'bg-slate-700 border-slate-400 text-white' : 'border-slate-600 text-slate-400 hover:text-slate-200'}`}>
      <FaArchive /> {activo ? 'Ocultar archivados' : 'Ver archivados'}
    </button>
  )
}
