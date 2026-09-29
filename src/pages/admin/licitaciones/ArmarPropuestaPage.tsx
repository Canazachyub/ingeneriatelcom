import { useEffect, useMemo, useState } from 'react'
import { FaFileArchive, FaSpinner, FaCheck, FaChevronDown, FaUserTie, FaFileContract, FaBuilding, FaTruck, FaGavel, FaTimes, FaSearch, FaDownload, FaExclamationTriangle } from 'react-icons/fa'
import { api, LicDocumento, LicPersonal, LicProceso } from '../../../api/appScriptApi'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import { useToast } from '../../../context/ToastContext'
import { nombreTipo } from './DocumentosVistas'
import { fecha } from './licUtils'

// ============================================================
// Armar propuesta: eliges la licitación, el personal clave y la experiencia,
// y te llevas un ZIP con los PDF ordenados en carpetas:
//   <licitación>/1 Personal clave/1. NOMBRE - cargo/…
//               /2 Experiencia/<contrato>/…
//               /3 Empresa/…  /4 Vehículos y equipos/…
// Todo en una sola pantalla numerada; la selección se recuerda en este
// navegador por si se recarga la página.
// ============================================================

const BORRADOR = 'lic-armar-propuesta-v1'

interface Borrador {
  licitacion: string
  personas: { dni: string; cargo: string }[]
  docs: string[] // ids elegidos
}

const limpiar = (t: string, max = 90) => String(t || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
// El mismo papel aparece copiado en varias propuestas: se muestra una vez
const huella = (d: LicDocumento) => `${d.categoria}|${d.tipo}|${d.entidad}|${d.fecha}|${String(d.titulo || '').toLowerCase().replace(/\s+/g, ' ').trim()}`
const nombreContrato = (e: string) => {
  const s = String(e || '')
  if (s.startsWith('empresa:')) return s.slice(8) === '20602277900' ? 'Otros de Telcom (sin N.º de contrato)' : `Otros del RUC ${s.slice(8)} (sin N.º de contrato)`
  return s.replace(/^contrato:/, '') || 'Sin contrato'
}

function leerBorrador(): Borrador {
  try {
    const b = JSON.parse(localStorage.getItem(BORRADOR) || 'null')
    if (b && Array.isArray(b.docs)) return b
  } catch { /* sin almacenamiento */ }
  return { licitacion: '', personas: [], docs: [] }
}

function Caja({ marcado, onClick }: { marcado: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={marcado}
      className={`w-5 h-5 shrink-0 flex items-center justify-center border ${marcado ? 'bg-accent-energy border-accent-energy text-[#111827]' : 'border-slate-500 hover:border-slate-300'}`}>
      {marcado && <FaCheck className="text-[10px]" />}
    </button>
  )
}

function FilaDoc({ d, marcado, onClick }: { d: LicDocumento; marcado: boolean; onClick: () => void }) {
  return (
    <li className="flex items-start gap-3 px-3 py-2 hover:bg-slate-800/60 cursor-pointer" onClick={onClick}>
      <Caja marcado={marcado} onClick={onClick} />
      <span className="flex-1 min-w-0 text-sm">
        <span className="text-[11px] text-accent-energy font-semibold mr-2">{nombreTipo(d.tipo)}</span>
        <span className="text-slate-200">{d.titulo}</span>
        {d.fecha && <span className="text-slate-500 text-xs"> · {fecha(d.fecha)}</span>}
      </span>
    </li>
  )
}

function Seccion({ n, icono, titulo, ayuda, cuenta, children, abierta, onAbrir }: {
  n: number; icono: JSX.Element; titulo: string; ayuda: string; cuenta: number; children: React.ReactNode; abierta: boolean; onAbrir: () => void
}) {
  return (
    <div className="placa-acero">
      <button onClick={onAbrir} className="w-full flex items-center gap-4 p-5 text-left">
        <span className="w-10 h-10 shrink-0 flex items-center justify-center bg-accent-energy text-[#111827] font-display font-bold text-lg">{n}</span>
        <span className="flex-1">
          <span className="flex items-center gap-2 text-white font-display font-bold text-lg">{icono} {titulo}</span>
          <span className="block text-sm text-slate-400">{ayuda}</span>
        </span>
        {cuenta > 0 && <span className="px-2.5 py-1 text-xs bg-green-500/15 text-green-300 border border-green-500/40 whitespace-nowrap">{cuenta} elegidos</span>}
        <FaChevronDown className={`text-slate-400 transition-transform ${abierta ? '' : '-rotate-90'}`} />
      </button>
      {abierta && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

export default function ArmarPropuestaPage() {
  const toast = useToast()
  const [docs, setDocs] = useState<LicDocumento[]>([])
  const [personal, setPersonal] = useState<LicPersonal[]>([])
  const [procesos, setProcesos] = useState<LicProceso[]>([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [b, setB] = useState<Borrador>(leerBorrador)
  const [abierta, setAbierta] = useState(1)
  const [qPersona, setQPersona] = useState('')
  const [armando, setArmando] = useState(false)
  const [resultado, setResultado] = useState<{ url?: string; nombre: string; documentos: number; faltan: string[] } | null>(null)

  const cargar = async () => {
    setCargando(true); setError('')
    const [d, p, pr] = await Promise.all([api.licDocumentos(), api.licPersonal(), api.licProcesos()])
    setCargando(false)
    if (!d.success || !d.data) { setError(d.error || 'No se pudieron leer los documentos'); return }
    // Solo papeles con PDF y sin repetidos; los anexos no se reutilizan
    const vistos = new Set<string>()
    setDocs(d.data.filter((x) => x.archivo_vault && !['anexo', 'otro'].includes(x.categoria)).filter((x) => {
      const h = huella(x); if (vistos.has(h)) return false; vistos.add(h); return true
    }))
    if (p.success && p.data) setPersonal(p.data)
    if (pr.success && pr.data) setProcesos(pr.data)
  }
  useEffect(() => { cargar() }, [])
  useEffect(() => { try { localStorage.setItem(BORRADOR, JSON.stringify(b)) } catch { /* sin almacenamiento */ } }, [b])

  const elegidos = useMemo(() => new Set(b.docs), [b.docs])
  const docsDe = (dni: string) => docs.filter((d) => d.categoria === 'personal' && String(d.dni) === dni)
    .sort((x, y) => String(y.fecha || '').localeCompare(String(x.fecha || '')))
  const alternar = (ids: string[], marcar?: boolean) => setB((prev) => {
    const s = new Set(prev.docs)
    const poner = marcar ?? !ids.every((i) => s.has(i))
    ids.forEach((i) => (poner ? s.add(i) : s.delete(i)))
    return { ...prev, docs: [...s] }
  })

  const agregarPersona = (p: LicPersonal) => {
    if (b.personas.some((x) => x.dni === String(p.dni))) return
    // Por defecto: todos sus papeles, pero solo el CV más reciente
    const suyos = docsDe(String(p.dni))
    const cvs = suyos.filter((d) => d.tipo === 'cv')
    const ids = suyos.filter((d) => d.tipo !== 'cv' || d === cvs[0]).map((d) => d.id)
    setB((prev) => ({ ...prev, personas: [...prev.personas, { dni: String(p.dni), cargo: '' }], docs: [...new Set([...prev.docs, ...ids])] }))
    setQPersona('')
  }
  const quitarPersona = (dni: string) => {
    const ids = new Set(docsDe(dni).map((d) => d.id))
    setB((prev) => ({ ...prev, personas: prev.personas.filter((x) => x.dni !== dni), docs: prev.docs.filter((i) => !ids.has(i)) }))
  }

  const experiencia = useMemo(() => {
    const g = new Map<string, LicDocumento[]>()
    docs.filter((d) => d.categoria === 'experiencia').forEach((d) => {
      const k = nombreContrato(d.entidad); g.set(k, [...(g.get(k) || []), d])
    })
    return [...g.entries()].sort((a, b2) => b2[1].length - a[1].length)
  }, [docs])
  const empresa = docs.filter((d) => d.categoria === 'empresa' || d.categoria === 'tecnico')
  const equipos = docs.filter((d) => d.categoria === 'equipos')

  const nombreCarpeta = limpiar(b.licitacion || 'Propuesta', 80)
  const archivos = useMemo(() => {
    const out: { ruta: string; destino: string }[] = []
    const porId = new Map(docs.map((d) => [d.id, d]))
    const archivo = (d: LicDocumento) => `${limpiar(`${nombreTipo(d.tipo)} - ${d.titulo || ''}`)}.pdf`
    const usados = new Set<string>()
    b.personas.forEach((p, i) => {
      const nom = personal.find((x) => String(x.dni) === p.dni)?.nombre || p.dni
      const carpeta = `${nombreCarpeta}/1 Personal clave/${i + 1}. ${limpiar(nom, 60)}${p.cargo ? ' - ' + limpiar(p.cargo, 40) : ''}`
      docsDe(p.dni).filter((d) => elegidos.has(d.id)).forEach((d) => { out.push({ ruta: d.archivo_vault, destino: `${carpeta}/${archivo(d)}` }); usados.add(d.id) })
    })
    b.docs.forEach((id) => {
      const d = porId.get(id)
      if (!d || usados.has(id) || d.categoria === 'personal') return
      const sub = d.categoria === 'experiencia' ? `2 Experiencia/${limpiar(nombreContrato(d.entidad), 60)}`
        : d.categoria === 'equipos' ? '4 Vehículos y equipos' : '3 Empresa'
      out.push({ ruta: d.archivo_vault, destino: `${nombreCarpeta}/${sub}/${archivo(d)}` })
    })
    return out
  }, [b, docs, personal, elegidos, nombreCarpeta]) // eslint-disable-line react-hooks/exhaustive-deps

  const armar = async () => {
    if (!archivos.length) return
    setArmando(true); setResultado(null)
    const r = await api.licArmarZip({ nombre: nombreCarpeta, archivos })
    setArmando(false)
    if (!r.success || !r.data) { toast.error(r.error || 'No se pudo armar el ZIP'); return }
    setResultado(r.data)
    if (r.data.url) window.open(r.data.url, '_blank', 'noopener')
    toast.success(r.message || 'ZIP listo')
  }

  const empezarDeNuevo = () => { setB({ licitacion: '', personas: [], docs: [] }); setResultado(null); setAbierta(1) }
  const candidatos = personal.filter((p) => !b.personas.some((x) => x.dni === String(p.dni)) && (!qPersona || p.nombre.toLowerCase().includes(qPersona.toLowerCase())))
  const nPersonal = b.personas.reduce((a, p) => a + docsDe(p.dni).filter((d) => elegidos.has(d.id)).length, 0)
  const cuenta = (lista: LicDocumento[]) => lista.filter((d) => elegidos.has(d.id)).length

  return (
    <AdminLayout>
      <div className="space-y-5 pb-28">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <FaFileArchive className="text-accent-energy" /> Armar propuesta
            </h1>
            <p className="text-primary-400">Elige qué va en la propuesta y descarga un ZIP con los PDF ordenados en carpetas.</p>
          </div>
          {(b.docs.length > 0 || b.licitacion) && (
            <button onClick={empezarDeNuevo} className="px-3 py-2 text-xs border border-slate-600 text-slate-300 hover:border-slate-400">Empezar de nuevo</button>
          )}
        </div>

        {cargando ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="placa-acero h-20 animate-pulse" />)}</div>
        ) : error ? (
          <ErrorCarga que="los documentos" error={error} onReintentar={cargar} />
        ) : (
          <>
            <Seccion n={1} icono={<FaGavel />} titulo="¿Para qué licitación?" ayuda="Será el nombre de la carpeta principal del ZIP." cuenta={0} abierta={abierta === 1} onAbrir={() => setAbierta(abierta === 1 ? 0 : 1)}>
              <input list="lic-procesos" value={b.licitacion} onChange={(e) => setB({ ...b, licitacion: e.target.value })}
                placeholder="Escribe o elige la nomenclatura. Ej.: CP SER-SM-21-2026-ELSE-1"
                className="w-full bg-slate-900 border border-slate-600 px-3 py-2.5 text-white focus:outline-none focus:border-accent-energy" />
              <datalist id="lic-procesos">
                {procesos.slice().sort((x, y) => String(y.anio).localeCompare(String(x.anio))).map((p) => <option key={p.nomenclatura} value={p.nomenclatura}>{p.objeto}</option>)}
              </datalist>
              <button onClick={() => setAbierta(2)} className="mt-3 px-4 py-2 text-sm bg-accent-energy text-[#111827] font-semibold">Siguiente: personal clave →</button>
            </Seccion>

            <Seccion n={2} icono={<FaUserTie />} titulo="Personal clave" ayuda="Agrega a cada profesional: se marcan solos todos sus papeles (y solo su CV más reciente)." cuenta={nPersonal} abierta={abierta === 2} onAbrir={() => setAbierta(abierta === 2 ? 0 : 2)}>
              <div className="space-y-3">
                {b.personas.map((p, i) => {
                  const nom = personal.find((x) => String(x.dni) === p.dni)?.nombre || p.dni
                  const suyos = docsDe(p.dni)
                  return (
                    <div key={p.dni} className="border border-slate-700">
                      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-900/60">
                        <span className="font-display font-bold text-white">{i + 1}. {nom}</span>
                        <input value={p.cargo} onChange={(e) => setB({ ...b, personas: b.personas.map((x) => x.dni === p.dni ? { ...x, cargo: e.target.value } : x) })}
                          placeholder="Cargo en esta propuesta (ej. Supervisor)" className="flex-1 min-w-[180px] bg-slate-900 border border-slate-600 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-accent-energy" />
                        <span className="text-xs text-slate-400">{cuenta(suyos)} de {suyos.length}</span>
                        <button onClick={() => alternar(suyos.map((d) => d.id))} className="text-xs text-accent-energy hover:underline">Marcar / desmarcar todos</button>
                        <button onClick={() => quitarPersona(p.dni)} className="p-1.5 text-slate-400 hover:text-red-300" title="Quitar a esta persona"><FaTimes /></button>
                      </div>
                      {suyos.length ? (
                        <ul className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
                          {suyos.map((d) => <FilaDoc key={d.id} d={d} marcado={elegidos.has(d.id)} onClick={() => alternar([d.id])} />)}
                        </ul>
                      ) : <p className="p-3 text-sm text-amber-300/80">Esta persona no tiene PDF en la carpeta. Súbelos en Documentos.</p>}
                    </div>
                  )
                })}
                <div className="border border-dashed border-slate-600 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FaSearch className="text-slate-500 text-xs" />
                    <input value={qPersona} onChange={(e) => setQPersona(e.target.value)} placeholder="Buscar a quién agregar…" className="flex-1 bg-transparent text-sm text-white focus:outline-none" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {candidatos.map((p) => (
                      <button key={p.dni} onClick={() => agregarPersona(p)} className="px-3 py-1.5 text-xs border border-slate-600 text-slate-200 hover:border-accent-energy">
                        + {p.nombre} <span className="text-slate-500">({docsDe(String(p.dni)).length})</span>
                      </button>
                    ))}
                    {!candidatos.length && <span className="text-xs text-slate-500">No hay más personas que agregar.</span>}
                  </div>
                </div>
                <button onClick={() => setAbierta(3)} className="px-4 py-2 text-sm bg-accent-energy text-[#111827] font-semibold">Siguiente: experiencia →</button>
              </div>
            </Seccion>

            <Seccion n={3} icono={<FaFileContract />} titulo="Experiencia de la empresa" ayuda="Marca un contrato para llevar todos sus papeles (contrato, conformidades, facturas…). Ábrelo para elegir uno por uno." cuenta={cuenta(docs.filter((d) => d.categoria === 'experiencia'))} abierta={abierta === 3} onAbrir={() => setAbierta(abierta === 3 ? 0 : 3)}>
              <div className="space-y-2">
                {experiencia.map(([contrato, lista]) => <GrupoContrato key={contrato} contrato={contrato} lista={lista} elegidos={elegidos} alternar={alternar} />)}
                {!experiencia.length && <p className="text-sm text-slate-400">No hay documentos de experiencia con PDF.</p>}
                <button onClick={() => setAbierta(4)} className="mt-2 px-4 py-2 text-sm bg-accent-energy text-[#111827] font-semibold">Siguiente: empresa y equipos →</button>
              </div>
            </Seccion>

            <Seccion n={4} icono={<FaBuilding />} titulo="Empresa, vehículos y equipos" ayuda="Vigencia de poder, promesas de consorcio, tarjetas de propiedad, contratos de alquiler…" cuenta={cuenta(empresa) + cuenta(equipos)} abierta={abierta === 4} onAbrir={() => setAbierta(abierta === 4 ? 0 : 4)}>
              <div className="grid lg:grid-cols-2 gap-4">
                {[{ t: 'Empresa', i: <FaBuilding />, l: empresa }, { t: 'Vehículos y equipos', i: <FaTruck />, l: equipos }].map((g) => (
                  <div key={g.t} className="border border-slate-700">
                    <div className="flex items-center gap-2 p-3 bg-slate-900/60 text-white font-semibold text-sm">
                      {g.i} {g.t} <span className="flex-1" />
                      {g.l.length > 0 && <button onClick={() => alternar(g.l.map((d) => d.id))} className="text-xs text-accent-energy font-normal hover:underline">Marcar / desmarcar todos</button>}
                    </div>
                    <ul className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
                      {g.l.map((d) => <FilaDoc key={d.id} d={d} marcado={elegidos.has(d.id)} onClick={() => alternar([d.id])} />)}
                      {!g.l.length && <li className="p-3 text-sm text-slate-500">Sin documentos.</li>}
                    </ul>
                  </div>
                ))}
              </div>
            </Seccion>

            {resultado && (
              <div className="placa-acero p-5 border-l-4 border-green-400">
                <p className="text-white font-semibold flex items-center gap-2"><FaCheck className="text-green-400" /> {resultado.nombre}: {resultado.documentos} documentos</p>
                {resultado.url && <a href={resultado.url} className="inline-flex items-center gap-2 mt-2 text-accent-energy hover:underline"><FaDownload /> Si no empezó la descarga, pulsa aquí</a>}
                {resultado.faltan.length > 0 && (
                  <div className="mt-3 text-sm text-amber-200">
                    <p className="flex items-center gap-2"><FaExclamationTriangle /> {resultado.faltan.length} no se incluyeron porque su PDF no está en Drive (pulsa "Actualizar" en Documentos):</p>
                    <ul className="list-disc ml-6 text-xs mt-1">{resultado.faltan.slice(0, 10).map((f) => <li key={f}>{f}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Barra fija: cuánto llevas y descargar */}
      {!cargando && !error && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 border-t-2 border-accent-energy bg-[#0b1220]/95 backdrop-blur px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-200 flex-1">
            <b className="text-white text-lg">{archivos.length}</b> documentos · {b.personas.length} personas · carpeta <b className="text-accent-energy">{nombreCarpeta}</b>
          </span>
          <button onClick={armar} disabled={!archivos.length || armando}
            className="px-6 py-2.5 bg-accent-energy text-[#111827] font-bold inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
            {armando ? <><FaSpinner className="animate-spin" /> Armando ZIP…</> : <><FaFileArchive /> Descargar ZIP</>}
          </button>
        </div>
      )}
    </AdminLayout>
  )
}

function GrupoContrato({ contrato, lista, elegidos, alternar }: { contrato: string; lista: LicDocumento[]; elegidos: Set<string>; alternar: (ids: string[], marcar?: boolean) => void }) {
  const [abierto, setAbierto] = useState(false)
  const n = lista.filter((d) => elegidos.has(d.id)).length
  const ids = lista.map((d) => d.id)
  return (
    <div className="border border-slate-700">
      <div className="flex items-center gap-3 p-3 bg-slate-900/60">
        <Caja marcado={n === lista.length} onClick={() => alternar(ids, n !== lista.length)} />
        <button onClick={() => setAbierto(!abierto)} className="flex-1 text-left">
          <span className="text-white font-semibold">{contrato}</span>
          <span className="text-xs text-slate-400 ml-2">{n > 0 && n < lista.length ? `${n} de ` : ''}{lista.length} documentos</span>
        </button>
        <FaChevronDown onClick={() => setAbierto(!abierto)} className={`text-slate-400 cursor-pointer transition-transform ${abierto ? '' : '-rotate-90'}`} />
      </div>
      {abierto && (
        <ul className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
          {lista.map((d) => <FilaDoc key={d.id} d={d} marcado={elegidos.has(d.id)} onClick={() => alternar([d.id])} />)}
        </ul>
      )}
    </div>
  )
}
