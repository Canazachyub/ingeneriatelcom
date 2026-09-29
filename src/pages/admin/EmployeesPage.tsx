import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FaPlus, FaSearch, FaSpinner, FaTimes, FaUserTie, FaFileAlt, FaFileContract, FaIdCard, FaCamera, FaExchangeAlt,
  FaMapMarkerAlt, FaUserSlash, FaUserCheck, FaKey, FaCopy, FaHistory, FaFolderOpen, FaUpload, FaExternalLinkAlt,
  FaArchive, FaCheck, FaExclamationTriangle, FaHardHat, FaBuilding, FaPen, FaProjectDiagram,
} from 'react-icons/fa'
import { api, Employee, FichaTrabajador, ResumenDocsTrabajador, TipoDocTrabajador, Project, EmployeeAssignment } from '../../api/appScriptApi'
import { queryKeys } from '../../hooks/queries'
import AdminLayout from '../../components/admin/AdminLayout'
import { useToast } from '../../context/ToastContext'

// ============================================================
// Personal — "cuartel" estilo Terran. Una tarjeta por trabajador con lo que
// importa de un vistazo (cargo, sede, proyecto, si tiene CV/contrato/DNI) y
// una ficha lateral donde se hace TODO, con palabras simples:
//   cambiar cargo · cambiar sede · mover de proyecto · subir documentos ·
//   foto · crear acceso · dar de baja / reactivar · historial.
// Nada se borra: los documentos quitados van a _archivados y la baja solo
// registra el último día (el historial de asistencia se conserva).
// ============================================================

const SEDES = ['Cusco', 'Puerto Maldonado', 'Abancay', 'Tacna', 'Puno', 'Juliaca', 'Arequipa', 'Pucallpa', 'Lima', 'Principal']
const TIPOS_DOC: { v: TipoDocTrabajador; t: string; icono: JSX.Element; clave?: boolean }[] = [
  { v: 'cv', t: 'CV', icono: <FaFileAlt />, clave: true },
  { v: 'contrato', t: 'Contrato', icono: <FaFileContract />, clave: true },
  { v: 'dni', t: 'DNI', icono: <FaIdCard />, clave: true },
  { v: 'certificados', t: 'Certificados y títulos', icono: <FaFileAlt /> },
  { v: 'otros', t: 'Otros', icono: <FaFolderOpen /> },
]
const MAX_DOC = 10 * 1024 * 1024
// Oficina = tiene correo (marca con foto en el kiosko); Campo = sin correo (registro simple)
const SECCIONES: { clave: string; titulo: string; icono: JSX.Element; ayuda: string; filtro: (e: Employee) => boolean }[] = [
  { clave: 'oficina', titulo: 'Oficina', icono: <FaBuilding />, ayuda: 'Personal administrativo, legal y de trámite', filtro: (e) => !!e.email },
  { clave: 'campo', titulo: 'Campo', icono: <FaHardHat />, ayuda: 'Supervisores, operarios y técnicos en obra', filtro: (e) => !e.email },
]
const input = 'w-full bg-slate-900 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-energy'
const hoy = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10)
const iniciales = (n: string) => n.replace(/,/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const miniatura = (id: string | null | undefined, w = 400) => (id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${w}` : '')
const verArchivo = (id: string) => `https://drive.google.com/file/d/${id}/view`

function aBase64(f: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result || '').split(',')[1] || '')
    r.onerror = rej
    r.readAsDataURL(f)
  })
}

// Foto reducida a 600 px en JPG (sube rápido y se ve igual)
async function fotoJpeg(archivo: File): Promise<Blob> {
  const url = URL.createObjectURL(archivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url })
    const escala = Math.min(1, 600 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise<Blob>((ok) => c.toBlob((b) => ok(b as Blob), 'image/jpeg', 0.88))
  } finally { URL.revokeObjectURL(url) }
}

function Retrato({ nombre, foto, clase }: { nombre: string; foto?: string | null; clase: string }) {
  const [falla, setFalla] = useState(false)
  useEffect(() => setFalla(false), [foto])
  if (!foto || falla) {
    return (
      <div className={`${clase} flex flex-col items-center justify-center bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-600`}>
        <FaUserTie className="text-3xl text-slate-500 mb-1" />
        <span className="font-display font-bold text-xl text-slate-300">{iniciales(nombre)}</span>
      </div>
    )
  }
  return <img src={miniatura(foto)} alt={`Foto de ${nombre}`} referrerPolicy="no-referrer" onError={() => setFalla(true)} className={`${clase} object-cover border border-slate-600`} />
}

function Sello({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-bold border ${ok ? 'bg-green-500/15 text-green-300 border-green-500/40' : 'bg-red-500/10 text-red-300 border-red-500/40'}`}>
      {ok ? '✔' : '✖'} {texto}
    </span>
  )
}

export default function EmployeesPage() {
  const qc = useQueryClient()
  const empleadosQ = useQuery({ queryKey: ['empleadosTodos'], queryFn: async () => { const r = await api.getEmployeesTodos(); if (!r.success) throw new Error(r.error); return r.data || [] } })
  // Si Google responde mal, se lanza error para que React Query reintente (antes quedaba en 0/12)
  const resumenQ = useQuery({ queryKey: ['rrhhResumen'], queryFn: async () => { const r = await api.rrhhResumen(); if (!r.success) throw new Error(r.error); return r.data || {} }, retry: 3 })
  const asigQ = useQuery({ queryKey: ['asignacionesTodas'], queryFn: async () => { const r = await api.getAssignments(); if (!r.success) throw new Error(r.error); return r.data || [] }, retry: 3 })
  const proyQ = useQuery({ queryKey: queryKeys.projects, queryFn: async () => { const r = await api.getProjects(); return r.success ? r.data || [] : [] } })

  const [q, setQ] = useState('')
  const [sede, setSede] = useState('')
  const [verCesados, setVerCesados] = useState(false)
  const [soloIncompletos, setSoloIncompletos] = useState(false)
  const [abierto, setAbierto] = useState<Employee | null>(null)
  const [nuevo, setNuevo] = useState(false)

  const recargar = () => {
    qc.invalidateQueries({ queryKey: ['empleadosTodos'] })
    qc.invalidateQueries({ queryKey: ['rrhhResumen'] })
    qc.invalidateQueries({ queryKey: ['asignacionesTodas'] })
    qc.invalidateQueries({ queryKey: queryKeys.employees })
    qc.invalidateQueries({ queryKey: queryKeys.projects })
  }

  const empleados = empleadosQ.data || []
  const resumen = resumenQ.data || {}
  const proyectoDe = useMemo(() => {
    const m = new Map<string, EmployeeAssignment[]>()
    ;(asigQ.data || []).filter((a) => String(a.status) === 'active').forEach((a) => m.set(a.employeeId, [...(m.get(a.employeeId) || []), a]))
    return m
  }, [asigQ.data])

  const proyectoTexto = (e: Employee) => (proyectoDe.get(e.id) || []).map((a) => a.projectName).join(', ') || '~'
  const docs = (dni: string) => resumen[dni] as ResumenDocsTrabajador | undefined
  const completo = (dni: string) => { const d = docs(dni); return !!d && d.cv > 0 && d.contrato > 0 && d.dni > 0 }
  const activos = empleados.filter((e) => e.status !== 'inactive')
  const sedes = [...new Set(activos.map((e) => e.city || 'Sin sede'))].sort()
  const visibles = empleados
    .filter((e) => (verCesados ? e.status === 'inactive' : e.status !== 'inactive'))
    .filter((e) => !sede || (e.city || 'Sin sede') === sede)
    .filter((e) => !soloIncompletos || !completo(e.dni))
    .filter((e) => !q || `${e.name} ${e.dni} ${e.position} ${e.email}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => proyectoTexto(a).localeCompare(proyectoTexto(b)) || a.name.localeCompare(b.name))

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="rotulo-estencil mb-1">Cuartel</p>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-3"><FaHardHat className="text-accent-energy" /> Personal</h1>
            <p className="text-primary-300">Toca a una persona para ver su ficha: documentos, proyecto, cargo, sede, baja e historial.</p>
          </div>
          <button onClick={() => setNuevo(true)} className="btn-primary flex items-center gap-2 shrink-0"><FaPlus /> Nuevo trabajador</button>
        </div>

        {/* HUD */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Activos', activos.length, 'bg-green-400'],
            ['En campo', activos.filter((e) => !e.email).length, 'bg-accent-energy'],
            ['En oficina', activos.filter((e) => e.email).length, 'bg-sky-400'],
            ['Con CV', `${activos.filter((e) => (docs(e.dni)?.cv || 0) > 0).length}/${activos.length}`, 'bg-violet-400'],
            ['Con contrato', `${activos.filter((e) => (docs(e.dni)?.contrato || 0) > 0).length}/${activos.length}`, 'bg-amber-400'],
          ].map(([t, v, c]) => (
            <div key={String(t)} className="placa-acero p-4 pl-5 relative">
              <span className={`absolute left-0 top-3 bottom-3 w-1 ${c}`} />
              <p className="text-2xl font-display font-bold text-white tabular-nums">{v}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{t}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, DNI, cargo o correo…" className={input + ' pl-10 py-2.5'} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSede('')} className={`px-3 py-2 text-xs border ${!sede ? 'bg-accent-energy text-[#111827] border-accent-energy font-bold' : 'border-slate-600 text-slate-300'}`}>Todas las sedes</button>
            {sedes.map((s) => (
              <button key={s} onClick={() => setSede(s)} className={`px-3 py-2 text-xs border ${sede === s ? 'bg-accent-energy text-[#111827] border-accent-energy font-bold' : 'border-slate-600 text-slate-300'}`}>{s}</button>
            ))}
            <button onClick={() => setSoloIncompletos(!soloIncompletos)} className={`px-3 py-2 text-xs border ${soloIncompletos ? 'bg-red-500/20 border-red-400 text-red-200' : 'border-slate-600 text-slate-300'}`}>Falta CV/contrato/DNI</button>
            <button onClick={() => setVerCesados(!verCesados)} className={`px-3 py-2 text-xs border ${verCesados ? 'bg-slate-700 border-slate-400 text-white' : 'border-slate-600 text-slate-400'}`}>{verCesados ? 'Ver activos' : 'Ver dados de baja'}</button>
          </div>
        </div>

        {/* Unidades */}
        {empleadosQ.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="placa-acero h-72 animate-pulse" />)}</div>
        ) : empleadosQ.error ? (
          <div className="placa-acero p-6 text-red-300">No se pudo cargar el personal. <button onClick={recargar} className="underline">Reintentar</button></div>
        ) : !visibles.length ? (
          <div className="placa-acero p-8 text-center text-slate-400">{verCesados ? 'No hay personas dadas de baja.' : 'Nadie coincide con el filtro.'}</div>
        ) : (
          <div className="space-y-8">
            {SECCIONES.map((sec) => {
              const lista = visibles.filter(sec.filtro)
              if (!lista.length) return null
              return (
                <section key={sec.clave}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-9 h-9 flex items-center justify-center bg-accent-energy text-[#111827] text-lg">{sec.icono}</span>
                    <h2 className="font-display font-bold text-xl text-white tracking-wide uppercase">{sec.titulo}</h2>
                    <span className="px-2 py-0.5 text-xs font-bold bg-slate-800 border border-slate-600 text-slate-200">{lista.length}</span>
                    <span className="flex-1 h-px bg-gradient-to-r from-accent-energy/60 to-transparent" />
                    <span className="hidden md:inline text-xs text-slate-500">{sec.ayuda}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
                    {lista.map((e) => {
                    const d = docs(e.dni)
                    const pr = proyectoDe.get(e.id) || []
                    return (
                      <button key={e.id} onClick={() => setAbierto(e)} className={`placa-acero group text-left p-3 hover:brightness-125 transition ${e.status === 'inactive' ? 'opacity-60' : ''}`}>
                        <div className="relative">
                          <Retrato nombre={e.name} foto={d?.foto} clase="w-full aspect-[4/5]" />
                          <span className="absolute top-0 left-0 px-1.5 py-0.5 bg-accent-energy text-[#111827] text-[9px] font-bold tracking-widest uppercase flex items-center gap-1">
                            {e.email ? <><FaBuilding /> Oficina</> : <><FaHardHat /> Campo</>}
                          </span>
                          {e.status === 'inactive' && <span className="absolute bottom-0 inset-x-0 text-center py-1 bg-red-600/90 text-white text-[10px] font-bold uppercase tracking-widest">De baja</span>}
                        </div>
                        <p className="mt-2 font-display font-bold text-white leading-tight text-sm line-clamp-2 min-h-[2.5rem]" title={e.name}>{e.name}</p>
                        <p className="text-[11px] text-accent-energy font-semibold truncate" title={e.position}>{e.position || 'Sin cargo'}</p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1"><FaMapMarkerAlt /> {e.city || 'Sin sede'}</p>
                        <p className="text-[11px] text-slate-300 truncate flex items-center gap-1" title={pr.map((a) => a.projectName).join(', ')}>
                          <FaProjectDiagram className="text-slate-500 shrink-0" /> {pr.length ? pr.map((a) => a.projectName).join(', ') : <span className="text-slate-500">{asigQ.isLoading || asigQ.isError ? "cargando…" : "Sin proyecto"}</span>}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Sello ok={(d?.cv || 0) > 0} texto="CV" />
                          <Sello ok={(d?.contrato || 0) > 0} texto="Contrato" />
                          <Sello ok={(d?.dni || 0) > 0} texto="DNI" />
                        </div>
                      </button>
                    )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      {abierto && (
        <FichaPanel empleado={abierto} proyectos={proyQ.data || []} onCerrar={() => setAbierto(null)} onCambio={recargar} />
      )}
      {nuevo && <NuevoTrabajador onCerrar={() => setNuevo(false)} onCreado={() => { setNuevo(false); recargar() }} />}
    </AdminLayout>
  )
}

// ── Ficha lateral ───────────────────────────────────────────────
type Accion = null | 'cargo' | 'sede' | 'proyecto' | 'datos' | 'baja' | 'reactivar' | 'acceso'

function FichaPanel({ empleado, proyectos, onCerrar, onCambio }: { empleado: Employee; proyectos: Project[]; onCerrar: () => void; onCambio: () => void }) {
  const toast = useToast()
  const [ficha, setFicha] = useState<FichaTrabajador | null>(null)
  const [error, setError] = useState('')
  const [pestana, setPestana] = useState<'resumen' | 'documentos' | 'historial'>('resumen')
  const [accion, setAccion] = useState<Accion>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [credenciales, setCredenciales] = useState<{ email: string; tempPassword: string } | null>(null)
  const inputFoto = useRef<HTMLInputElement>(null)

  const cargar = async () => {
    setError('')
    const r = await api.rrhhFicha(empleado.dni)
    if (r.success && r.data) setFicha(r.data)
    else setError(r.error || 'No se pudo abrir la ficha')
  }
  useEffect(() => { cargar() }, [empleado.dni]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (accion) setAccion(null); else onCerrar() } }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  // Ejecuta una acción, avisa y recarga ficha + lista
  const hacer = async (fn: () => Promise<{ success: boolean; error?: string; message?: string }>, ok = 'Listo') => {
    setTrabajando(true)
    const r = await fn()
    setTrabajando(false)
    if (!r.success) { toast.error(r.error || 'No se pudo completar'); return false }
    toast.success(r.message || ok)
    setAccion(null)
    await cargar()
    onCambio()
    return true
  }

  const subirFoto = async (f?: File) => {
    if (!f) return
    if (!/^image\//.test(f.type)) { toast.error('Elige una imagen (JPG o PNG)'); return }
    const jpg = await fotoJpeg(f)
    hacer(async () => api.rrhhSubirFoto({ dni: empleado.dni, mime: 'image/jpeg', base64: await aBase64(jpg) }), 'Foto actualizada')
  }

  const activo = ficha ? !ficha.fecha_fin || ficha.fecha_fin >= hoy() : empleado.status !== 'inactive'
  const asignActivas = (ficha?.asignaciones || []).filter((a) => String(a.status) === 'active')

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="w-full max-w-2xl h-full flex flex-col bg-[#0f172a] border-l-2 border-accent-energy shadow-2xl">
        {/* Cabecera */}
        <div className="flex gap-4 p-5 border-b border-slate-700">
          <div className="shrink-0">
            <Retrato nombre={empleado.name} foto={ficha?.foto} clase="w-24 h-28" />
            <button onClick={() => inputFoto.current?.click()} disabled={trabajando} className="mt-1 w-24 text-[11px] py-1 border border-slate-600 text-slate-300 hover:border-accent-energy inline-flex items-center justify-center gap-1"><FaCamera /> Foto</button>
            <input ref={inputFoto} type="file" accept="image/*" hidden onChange={(e) => { subirFoto(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="rotulo-estencil mb-1">Ficha del trabajador</p>
            <h2 className="text-xl font-display font-bold text-white leading-tight">{ficha?.nombre_completo || empleado.name}</h2>
            <p className="text-accent-energy font-semibold text-sm">{ficha?.cargo || empleado.position || 'Sin cargo'}</p>
            <p className="text-xs text-slate-400 mt-1">DNI {empleado.dni} · {ficha?.ciudad_actual || empleado.city || 'Sin sede'} · {empleado.email ? 'Oficina' : 'Campo'}</p>
            <p className="text-xs mt-1">{activo
              ? <span className="text-green-300">● Activo{ficha?.fecha_inicio ? ` desde ${ficha.fecha_inicio}` : ''}</span>
              : <span className="text-red-300">● Dado de baja · último día {ficha?.fecha_fin}</span>}</p>
          </div>
          <button onClick={onCerrar} className="self-start p-2 text-slate-400 hover:text-white" aria-label="Cerrar"><FaTimes /></button>
        </div>

        <div className="flex border-b border-slate-700 text-sm">
          {([['resumen', 'Resumen'], ['documentos', 'Documentos'], ['historial', 'Historial']] as const).map(([k, t]) => (
            <button key={k} onClick={() => setPestana(k)} className={`px-5 py-2.5 font-semibold ${pestana === k ? 'bg-accent-energy text-[#111827]' : 'text-slate-300 hover:text-white'}`}>{t}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error ? <p className="text-red-300">{error} <button onClick={cargar} className="underline">Reintentar</button></p>
            : !ficha ? <p className="text-slate-400"><FaSpinner className="inline animate-spin mr-2" />Abriendo ficha…</p>
            : pestana === 'resumen' ? (
              <>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-accent-energy mb-2">Proyecto</p>
                  {asignActivas.length ? asignActivas.map((a) => (
                    <p key={a.id} className="text-sm text-white flex items-center gap-2"><FaProjectDiagram className="text-slate-500" /> {a.projectName} <span className="text-slate-400">· {a.role}</span></p>
                  )) : <p className="text-sm text-slate-400">No está asignado a ningún proyecto (su asistencia no aparece en los servicios).</p>}
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-accent-energy mb-2">¿Qué quieres hacer?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {activo && <>
                      <BotonAccion icono={<FaExchangeAlt />} texto="Cambiar de cargo" onClick={() => setAccion('cargo')} />
                      <BotonAccion icono={<FaMapMarkerAlt />} texto="Cambiar de sede" onClick={() => setAccion('sede')} />
                      <BotonAccion icono={<FaProjectDiagram />} texto="Mover a otro proyecto" onClick={() => setAccion('proyecto')} />
                      <BotonAccion icono={<FaPen />} texto="Corregir nombre o correo" onClick={() => setAccion('datos')} />
                      <BotonAccion icono={<FaUpload />} texto="Subir CV, contrato o DNI" onClick={() => setPestana('documentos')} />
                      {empleado.email && <BotonAccion icono={<FaKey />} texto="Crear acceso al sistema" onClick={() => setAccion('acceso')} />}
                      <BotonAccion icono={<FaUserSlash />} texto="Dar de baja (cese)" onClick={() => setAccion('baja')} peligro />
                    </>}
                    {!activo && <BotonAccion icono={<FaUserCheck />} texto="Reactivar (volvió a trabajar)" onClick={() => setAccion('reactivar')} />}
                  </div>
                </div>

                {accion && (
                  <PanelAccion accion={accion} ficha={ficha} empleado={empleado} proyectos={proyectos} asignActivas={asignActivas}
                    trabajando={trabajando} onCancelar={() => setAccion(null)} hacer={hacer}
                    onCredenciales={setCredenciales} setTrabajando={setTrabajando} />
                )}
                {credenciales && (
                  <div className="p-4 border border-green-500/50 bg-green-500/10 text-sm text-green-100 space-y-1">
                    <p className="font-semibold">Acceso creado. Entrégale estos datos (se muestran solo una vez):</p>
                    <p>Usuario: <b className="font-mono">{credenciales.email}</b></p>
                    <p>Contraseña temporal: <b className="font-mono">{credenciales.tempPassword}</b></p>
                    <button onClick={() => navigator.clipboard.writeText(`Usuario: ${credenciales.email}\nContraseña temporal: ${credenciales.tempPassword}`).then(() => toast.success('Copiado'))}
                      className="mt-2 px-3 py-1.5 border border-green-400 inline-flex items-center gap-2"><FaCopy /> Copiar</button>
                  </div>
                )}
              </>
            ) : pestana === 'documentos' ? (
              <Documentos ficha={ficha} dni={empleado.dni} hacer={hacer} trabajando={trabajando} />
            ) : (
              <Historial ficha={ficha} />
            )}
        </div>
      </div>
    </div>
  )
}

function BotonAccion({ icono, texto, onClick, peligro }: { icono: JSX.Element; texto: string; onClick: () => void; peligro?: boolean }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-3 py-3 text-sm text-left border ${peligro ? 'border-red-500/50 text-red-200 hover:bg-red-500/10' : 'border-slate-600 text-slate-200 hover:border-accent-energy hover:bg-slate-800'}`}>
      <span className={peligro ? 'text-red-300' : 'text-accent-energy'}>{icono}</span> {texto}
    </button>
  )
}

type Hacer = (fn: () => Promise<{ success: boolean; error?: string; message?: string }>, ok?: string) => Promise<boolean>

function PanelAccion({ accion, ficha, empleado, proyectos, asignActivas, trabajando, onCancelar, hacer, onCredenciales, setTrabajando }: {
  accion: Exclude<Accion, null>; ficha: FichaTrabajador; empleado: Employee; proyectos: Project[]
  asignActivas: FichaTrabajador['asignaciones']; trabajando: boolean; onCancelar: () => void; hacer: Hacer
  onCredenciales: (c: { email: string; tempPassword: string }) => void; setTrabajando: (v: boolean) => void
}) {
  const toast = useToast()
  const [v1, setV1] = useState(accion === 'baja' ? hoy() : accion === 'datos' ? ficha.nombre_completo : '')
  const [v2, setV2] = useState(accion === 'datos' ? ficha.email : '')
  const [motivo, setMotivo] = useState('')
  const proyectosVivos = proyectos.filter((p) => p.status !== 'completed')

  const confirmar = async () => {
    if (accion === 'cargo') return hacer(() => api.rrhhCambiarCargo(empleado.dni, v1.trim(), motivo))
    if (accion === 'sede') return hacer(() => api.rrhhCambiarSede(empleado.dni, v1, motivo))
    if (accion === 'baja') return hacer(() => api.rrhhCesar(empleado.dni, v1, motivo))
    if (accion === 'reactivar') return hacer(() => api.rrhhReactivar(empleado.dni, motivo || 'Reactivado'))
    if (accion === 'datos') {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v2.trim()) && v2.trim()) { toast.error('Correo no válido'); return }
      return hacer(() => api.updateEmployee(empleado.id, { name: v1.trim(), email: v2.trim() } as Partial<Employee>), 'Datos corregidos')
    }
    if (accion === 'proyecto') {
      return hacer(async () => {
        for (const a of asignActivas) { if (a.projectId !== v1) await api.removeAssignment(a.id) }
        if (asignActivas.some((a) => a.projectId === v1)) return { success: true, message: 'Ya estaba en ese proyecto' }
        return api.assignEmployee(v1, empleado.id, motivo || ficha.cargo) as Promise<{ success: boolean; error?: string; message?: string }>
      }, 'Movido de proyecto')
    }
    if (accion === 'acceso') {
      setTrabajando(true)
      const r = await api.createEmployeeCredentials(empleado.id)
      setTrabajando(false)
      if (r.success && r.data) { onCredenciales(r.data); onCancelar() } else toast.error(r.error || 'No se pudo crear el acceso')
    }
  }

  const valido =
    accion === 'cargo' ? v1.trim() && v1.trim() !== ficha.cargo
      : accion === 'sede' ? v1 && v1 !== ficha.ciudad_actual
        : accion === 'baja' ? /^\d{4}-\d{2}-\d{2}$/.test(v1) && motivo.trim().length >= 3
          : accion === 'proyecto' ? !!v1
            : accion === 'datos' ? v1.trim().length >= 5
              : true

  const titulo: Record<string, string> = {
    cargo: 'Cambiar de cargo', sede: 'Cambiar de sede', baja: 'Dar de baja', reactivar: 'Reactivar',
    proyecto: 'Mover a otro proyecto', datos: 'Corregir nombre o correo', acceso: 'Crear acceso al sistema',
  }

  return (
    <div className={`p-4 border ${accion === 'baja' ? 'border-red-500/60 bg-red-500/5' : 'border-accent-energy/60 bg-slate-900'} space-y-3`}>
      <p className="font-display font-bold text-white">{titulo[accion]}</p>
      {accion === 'cargo' && <>
        <label className="block text-xs text-slate-300">Nuevo cargo (hoy: <b>{ficha.cargo || '—'}</b>)
          <input value={v1} onChange={(e) => setV1(e.target.value)} list="cargos-conocidos" className={input + ' mt-1'} autoFocus />
        </label>
        <datalist id="cargos-conocidos">
          {['Coordinador General', 'Supervisor General', 'Supervisor de Campo', 'Asistente de Supervisión', 'Analista Legal de Reclamos', 'Asistente Administrativo', 'Tramitador / Digitador', 'Validador', 'Operario', 'Técnico electricista'].map((c) => <option key={c} value={c} />)}
        </datalist>
      </>}
      {accion === 'sede' && (
        <label className="block text-xs text-slate-300">Nueva sede (hoy: <b>{ficha.ciudad_actual || '—'}</b>)
          <select value={v1} onChange={(e) => setV1(e.target.value)} className={input + ' mt-1'}>
            <option value="">Elige…</option>
            {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
      {accion === 'proyecto' && (
        <label className="block text-xs text-slate-300">¿A qué proyecto va? {asignActivas.length ? <>Sale de: <b>{asignActivas.map((a) => a.projectName).join(', ')}</b></> : ''}
          <select value={v1} onChange={(e) => setV1(e.target.value)} className={input + ' mt-1'}>
            <option value="">Elige…</option>
            {proyectosVivos.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.city}</option>)}
          </select>
        </label>
      )}
      {accion === 'datos' && <>
        <label className="block text-xs text-slate-300">Apellidos y nombres (formato: Apellidos, Nombres)
          <input value={v1} onChange={(e) => setV1(e.target.value)} className={input + ' mt-1'} />
        </label>
        <label className="block text-xs text-slate-300">Correo (vacío = personal de campo: marca con registro simple en el kiosko)
          <input value={v2} onChange={(e) => setV2(e.target.value)} className={input + ' mt-1'} />
        </label>
      </>}
      {accion === 'baja' && <>
        <p className="text-sm text-red-200 flex gap-2"><FaExclamationTriangle className="mt-0.5 shrink-0" /> Sale del kiosko y de sus proyectos desde el día siguiente. Su asistencia, planillas y documentos se conservan. Se puede revertir con "Reactivar".</p>
        <label className="block text-xs text-slate-300">Último día trabajado
          <input type="date" value={v1} onChange={(e) => setV1(e.target.value)} className={input + ' mt-1'} />
        </label>
      </>}
      {accion === 'acceso' && <p className="text-sm text-slate-300">Se crea un usuario con su correo <b>{empleado.email}</b> y una contraseña temporal para entrar al panel. Tú decides luego sus permisos en Usuarios.</p>}
      {accion !== 'datos' && accion !== 'acceso' && (
        <label className="block text-xs text-slate-300">{accion === 'baja' ? 'Motivo (obligatorio)' : accion === 'proyecto' ? 'Cargo en el proyecto (opcional)' : 'Motivo (opcional)'}
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={input + ' mt-1'} placeholder={accion === 'baja' ? 'Ej.: fin de contrato, renuncia…' : ''} />
        </label>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancelar} className="px-4 py-2 text-sm border border-slate-600 text-slate-200">Cancelar</button>
        <button onClick={confirmar} disabled={!valido || trabajando}
          className={`px-4 py-2 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-40 ${accion === 'baja' ? 'bg-red-500 text-white' : 'bg-accent-energy text-[#111827]'}`}>
          {trabajando ? <FaSpinner className="animate-spin" /> : <FaCheck />} {accion === 'baja' ? 'Sí, dar de baja' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}

function Documentos({ ficha, dni, hacer, trabajando }: { ficha: FichaTrabajador; dni: string; hacer: Hacer; trabajando: boolean }) {
  const toast = useToast()
  const [subiendo, setSubiendo] = useState<TipoDocTrabajador | null>(null)
  const [quitando, setQuitando] = useState<string | null>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  const subir = async (tipo: TipoDocTrabajador, f?: File) => {
    if (!f) return
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) { toast.error('El archivo debe ser PDF, JPG o PNG'); return }
    if (f.size > MAX_DOC) { toast.error(`Pesa ${(f.size / 1048576).toFixed(1)} MB: el máximo es 10 MB`); return }
    setSubiendo(tipo)
    await hacer(async () => api.rrhhSubirDocumento({ dni, tipo, nombre: f.name, mime: f.type, base64: await aBase64(f) }))
    setSubiendo(null)
  }

  return (
    <div className="space-y-3">
      {ficha.carpeta_url && <a href={ficha.carpeta_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-energy hover:underline inline-flex items-center gap-1"><FaFolderOpen /> Abrir su carpeta en Drive</a>}
      {TIPOS_DOC.map((t) => {
        const lista = ficha.documentos.filter((d) => d.tipo === t.v)
        return (
          <div key={t.v} className={`border ${t.clave && !lista.length ? 'border-red-500/50' : 'border-slate-700'}`}>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/60">
              <span className="text-accent-energy">{t.icono}</span>
              <span className="text-white font-semibold text-sm flex-1">{t.t}</span>
              {t.clave && !lista.length && <span className="text-[11px] text-red-300">Falta</span>}
              <button onClick={() => inputs.current[t.v]?.click()} disabled={trabajando}
                className="px-2.5 py-1 text-xs bg-accent-energy text-[#111827] font-semibold inline-flex items-center gap-1 disabled:opacity-50">
                {subiendo === t.v ? <FaSpinner className="animate-spin" /> : <FaUpload />} Subir
              </button>
              <input ref={(el) => { inputs.current[t.v] = el }} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={(e) => { subir(t.v, e.target.files?.[0]); e.target.value = '' }} />
            </div>
            {lista.length > 0 && (
              <ul className="divide-y divide-slate-800">
                {lista.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="flex-1 min-w-0 truncate text-slate-200" title={d.nombre}>{d.nombre}</span>
                    <span className="text-[11px] text-slate-500 shrink-0">{d.fecha}</span>
                    <a href={verArchivo(d.id)} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-energy inline-flex items-center gap-1 shrink-0"><FaExternalLinkAlt /> Ver</a>
                    {quitando === d.id ? (
                      <span className="flex items-center gap-2 shrink-0 text-xs">
                        ¿Quitar?
                        <button onClick={() => hacer(() => api.rrhhArchivarDocumento(dni, d.id)).then(() => setQuitando(null))} className="text-red-300 font-bold">Sí</button>
                        <button onClick={() => setQuitando(null)} className="text-slate-400">No</button>
                      </span>
                    ) : (
                      <button onClick={() => setQuitando(d.id)} title="Quitar (se guarda en _archivados)" className="text-slate-500 hover:text-red-300 shrink-0"><FaArchive /></button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
      <p className="text-[11px] text-slate-500">PDF, JPG o PNG de hasta 10 MB. "Quitar" no borra: mueve el archivo a la carpeta _archivados de la persona.</p>
    </div>
  )
}

const TIPO_HIST: Record<string, string> = {
  ingreso: 'Ingresó', cargo: 'Cambio de cargo', sede: 'Cambio de sede', transferencia: 'Cambio de sede',
  cese: 'Dado de baja', reactivacion: 'Reactivado', documento: 'Documento',
}

function Historial({ ficha }: { ficha: FichaTrabajador }) {
  const lista = [...(ficha.historial || [])].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
  if (!lista.length) return <p className="text-slate-400 text-sm">Todavía no hay movimientos registrados.</p>
  return (
    <ol className="space-y-2">
      {lista.map((h) => (
        <li key={h.id} className="p-3 bg-slate-900 border border-slate-700 text-sm">
          <p className="text-white font-semibold flex items-center gap-2"><FaHistory className="text-accent-energy" /> {TIPO_HIST[h.tipo] || h.tipo}
            <span className="text-slate-500 font-normal text-xs">· {String(h.fecha).slice(0, 16).replace('T', ' ')}{h.usuario ? ` · ${h.usuario}` : ''}</span></p>
          {(h.ubicacion_anterior || h.ubicacion_nueva) && (
            <p className="text-xs mt-1"><span className="text-red-300/80">{h.ubicacion_anterior || '—'}</span> <span className="text-slate-500">→</span> <span className="text-green-300">{h.ubicacion_nueva || '—'}</span></p>
          )}
          {h.descripcion && <p className="text-xs text-slate-400 mt-1">{h.descripcion}</p>}
        </li>
      ))}
    </ol>
  )
}

// ── Alta de trabajador ──────────────────────────────────────────
function NuevoTrabajador({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: () => void }) {
  const toast = useToast()
  const [f, setF] = useState({ dni: '', nombre: '', cargo: '', sede: 'Cusco', email: '', fecha: hoy(), sueldo: '' })
  const [guardando, setGuardando] = useState(false)
  const errores: Record<string, string> = {}
  if (f.dni && !/^\d{8}$/.test(f.dni)) errores.dni = 'El DNI tiene 8 números'
  if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) errores.email = 'Correo no válido'
  if (f.sueldo && Number.isNaN(Number(f.sueldo))) errores.sueldo = 'Solo números'
  const listo = /^\d{8}$/.test(f.dni) && f.nombre.trim().length >= 5 && f.cargo.trim() && !Object.keys(errores).length

  const crear = async () => {
    setGuardando(true)
    const r = await api.createEmployee({ dni: f.dni, name: f.nombre.trim(), position: f.cargo.trim(), city: f.sede, email: f.email.trim(), salary: f.sueldo ? Number(f.sueldo) : undefined, startDate: f.fecha, fecha_inicio: f.fecha } as unknown as Partial<Employee>)
    setGuardando(false)
    if (!r.success) { toast.error(r.error || 'No se pudo crear'); return }
    toast.success('Trabajador creado. Ya puede marcar en el kiosko.')
    onCreado()
  }

  const campo = (k: keyof typeof f, t: string, extra: Record<string, unknown> = {}, ayuda?: string) => (
    <label className="block text-xs text-slate-300">{t}
      <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={input + ' mt-1' + (errores[k] ? ' border-red-500' : '')} {...extra} />
      {errores[k] ? <span className="text-red-300">{errores[k]}</span> : ayuda && <span className="text-slate-500">{ayuda}</span>}
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="w-full max-w-lg bg-[#0f172a] border-2 border-accent-energy">
        <div className="p-5 border-b border-slate-700 flex items-start">
          <div className="flex-1"><p className="rotulo-estencil mb-1">Reclutamiento</p><h2 className="text-xl font-display font-bold text-white">Nuevo trabajador</h2></div>
          <button onClick={onCerrar} className="p-2 text-slate-400"><FaTimes /></button>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          {campo('dni', 'DNI *', { inputMode: 'numeric', maxLength: 8 })}
          {campo('fecha', 'Fecha de ingreso', { type: 'date' })}
          <div className="sm:col-span-2">{campo('nombre', 'Apellidos y nombres *', {}, 'Formato: Apellidos, Nombres')}</div>
          {campo('cargo', 'Cargo *', { list: 'cargos-nuevo' })}
          <datalist id="cargos-nuevo">{['Supervisor de Campo', 'Validador', 'Operario', 'Tramitador / Digitador', 'Analista Legal de Reclamos', 'Asistente Administrativo'].map((c) => <option key={c} value={c} />)}</datalist>
          <label className="block text-xs text-slate-300">Sede
            <select value={f.sede} onChange={(e) => setF({ ...f, sede: e.target.value })} className={input + ' mt-1'}>{SEDES.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <div className="sm:col-span-2">{campo('email', 'Correo (opcional)', {}, 'Sin correo = personal de campo (marca con registro simple en el kiosko)')}</div>
          {campo('sueldo', 'Sueldo (opcional)', { inputMode: 'decimal' }, 'Se puede ajustar luego en Planilla')}
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button onClick={onCerrar} className="px-4 py-2 text-sm border border-slate-600 text-slate-200">Cancelar</button>
          <button onClick={crear} disabled={!listo || guardando} className="px-5 py-2 text-sm bg-accent-energy text-[#111827] font-bold inline-flex items-center gap-2 disabled:opacity-40">
            {guardando ? <FaSpinner className="animate-spin" /> : <FaPlus />} Crear trabajador
          </button>
        </div>
      </div>
    </div>
  )
}
