import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaFolder, FaFolderOpen, FaFilePdf, FaDownload, FaExternalLinkAlt, FaCamera, FaChevronRight, FaArrowLeft, FaSpinner, FaUserTie,
} from 'react-icons/fa'
import { api, LIC_LOCAL, LicDocumento, LicPersonal } from '../../../api/appScriptApi'
import { licSubirFoto, licUrlArchivo } from '../../../api/licLocal'
import { useToast } from '../../../context/ToastContext'
import { fecha, ocultarDni } from './licUtils'
import { nombreTipo, abrirPropuesta } from './DocumentosVistas'

// ============================================================
// "Drive" del personal clave, estilo Terran (pedido del dueño 28/09/2026):
//   Carpetas (una por persona, con foto) → dentro, sus documentos agrupados
//   por el PROCESO en que se presentaron. Cada documento es un PDF individual
//   reutilizable (cortado de la propuesta y verificado página por página):
//   Abrir · Descargar · Ver en la propuesta (contexto).
// La foto se guarda en la carpeta de la persona en el acervo (foto.jpg).
// ============================================================

interface Persona {
  dni: string
  nombre: string
  carpeta: string // 01_GERENCIA/acervo/personal/<DNI - NOMBRE>
  docs: LicDocumento[]
  procesos: string[]
}

const nombreProceso = (p: string) => String(p || '').replace(/^\d{4}\s+/, '')
const anioProceso = (p: string) => (String(p || '').match(/^\d{4}/) || [''])[0]
const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('')

// Nombre amigable al descargar: "<PERSONA> - <Tipo> - <fecha>.pdf"
const nombreDescarga = (p: Persona, d: LicDocumento) =>
  `${p.nombre} - ${nombreTipo(d.tipo)}${d.fecha ? ' - ' + d.fecha : ''}.pdf`.replace(/[\\/:*?"<>|]/g, '')

// La foto se reduce y se guarda SIEMPRE como JPG (una sola ruta: foto.jpg)
async function aJpeg(archivo: File): Promise<File> {
  const url = URL.createObjectURL(archivo)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url
    })
    const lado = 600
    const escala = Math.min(1, lado / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b as Blob), 'image/jpeg', 0.88))
    return new File([blob], 'foto.jpg', { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function Foto({ persona, version, grande = false }: { persona: Persona; version: number; grande?: boolean }) {
  const [falla, setFalla] = useState(false)
  useEffect(() => setFalla(false), [version])
  const tam = grande ? 'w-32 h-40' : 'w-full aspect-[4/5]'
  if (!LIC_LOCAL || falla) {
    return (
      <div className={`${tam} flex flex-col items-center justify-center bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-600`}>
        <FaUserTie className={`${grande ? 'text-4xl' : 'text-5xl'} text-slate-500 mb-2`} />
        <span className="font-display font-bold text-2xl text-slate-300">{iniciales(persona.nombre)}</span>
      </div>
    )
  }
  return (
    <img
      src={licUrlArchivo(`${persona.carpeta}/foto.jpg`, { v: version })}
      alt={`Foto de ${persona.nombre}`}
      onError={() => setFalla(true)}
      className={`${tam} object-cover border border-slate-600`}
    />
  )
}

// ── Archivo (PDF individual) ─────────────────────────────────────
function Archivo({ persona, d, pagina, archivoPropuesta, estado, edicion, abierto, onEditar }: {
  persona: Persona
  d: LicDocumento
  pagina?: number | null
  archivoPropuesta?: string | null
  estado: JSX.Element
  edicion: JSX.Element
  abierto: boolean
  onEditar: () => void
}) {
  return (
    <div className="placa-acero flex flex-col">
      <div className="flex items-start gap-3 p-4 pb-3">
        <span className="w-10 h-12 shrink-0 flex items-center justify-center bg-red-500/15 border border-red-500/40 text-red-300 text-xl">
          <FaFilePdf />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent-energy">{nombreTipo(d.tipo)}</p>
          <p className="text-sm text-white leading-snug line-clamp-3" title={d.titulo}>{d.titulo}</p>
          <p className="text-xs text-slate-400 mt-1">{d.fecha ? fecha(d.fecha) : 'Sin fecha'}{d.periodo_desde ? ` · ${fecha(d.periodo_desde)} – ${d.periodo_hasta ? fecha(d.periodo_hasta) : 'actualidad'}` : ''}</p>
        </div>
      </div>
      <div className="px-4 pb-3">{estado}</div>
      <div className="mt-auto grid grid-cols-3 border-t border-slate-700 text-xs">
        <a
          href={LIC_LOCAL ? licUrlArchivo(d.archivo_vault) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2.5 bg-accent-energy text-[#111827] font-bold hover:brightness-110"
          title="Abrir este documento (PDF individual)"
        >
          <FaFilePdf /> Abrir
        </a>
        <a
          href={LIC_LOCAL ? licUrlArchivo(d.archivo_vault, { descargar: true, nombre: nombreDescarga(persona, d) }) : undefined}
          className="flex items-center justify-center gap-1.5 py-2.5 text-slate-200 hover:bg-slate-700/60 border-l border-slate-700"
          title="Descargar para reutilizar en otra propuesta"
        >
          <FaDownload /> Descargar
        </a>
        <button
          onClick={onEditar}
          className="flex items-center justify-center gap-1.5 py-2.5 text-slate-200 hover:bg-slate-700/60 border-l border-slate-700"
        >
          {abierto ? 'Cerrar' : 'Estado'}
        </button>
      </div>
      {archivoPropuesta && (
        <button
          onClick={() => abrirPropuesta(archivoPropuesta, pagina)}
          className="text-[11px] text-slate-400 hover:text-accent-energy py-1.5 border-t border-slate-800 inline-flex items-center justify-center gap-1.5"
        >
          Ver dónde está en la propuesta{pagina ? ` (pág. ${pagina})` : ''} <FaExternalLinkAlt className="text-[9px]" />
        </button>
      )}
      {abierto && <div className="p-3 border-t border-slate-700">{edicion}</div>}
    </div>
  )
}

interface Props {
  lista: LicDocumento[]
  busqueda: string
  estadoDe: (d: LicDocumento) => JSX.Element
  edicionDe: (d: LicDocumento) => JSX.Element
}

export default function PersonalDrive({ lista, busqueda, estadoDe, edicionDe }: Props) {
  const toast = useToast()
  const [fichas, setFichas] = useState<Record<string, LicPersonal>>({})
  const [elegida, setElegida] = useState<string | null>(null)
  const [modo, setModo] = useState<'procesos' | 'todos'>('procesos')
  const [abiertoDoc, setAbiertoDoc] = useState<string | null>(null)
  const [plegados, setPlegados] = useState<Record<string, boolean>>({})
  const [versionFoto, setVersionFoto] = useState(() => Date.now())
  const [subiendo, setSubiendo] = useState(false)
  const inputFoto = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.licPersonal().then((r) => {
      if (r.success && r.data) setFichas(Object.fromEntries(r.data.map((p) => [String(p.dni), p])))
    })
  }, [])

  const personas = useMemo<Persona[]>(() => {
    const mapa = new Map<string, Persona>()
    lista.filter((d) => d.categoria === 'personal').forEach((d) => {
      const clave = d.dni || d.nombre || 'sin-identificar'
      const carpeta = (d.archivo_vault || '').split('/').slice(0, -1).join('/')
      const p = mapa.get(clave) || { dni: d.dni, nombre: d.nombre || 'Sin identificar', carpeta, docs: [], procesos: [] }
      p.docs.push(d)
      ;(d.apariciones || []).forEach((a) => { if (a.proceso && !p.procesos.includes(a.proceso)) p.procesos.push(a.proceso) })
      if (!p.carpeta && carpeta) p.carpeta = carpeta
      mapa.set(clave, p)
    })
    const q = busqueda.trim().toLowerCase()
    return [...mapa.values()]
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || String(p.dni).includes(q)
        || p.docs.some((d) => (d.titulo || '').toLowerCase().includes(q)))
      .sort((a, b) => b.docs.length - a.docs.length)
  }, [lista, busqueda])

  const persona = personas.find((p) => (p.dni || p.nombre) === elegida) || null

  const subirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !persona) return
    setSubiendo(true)
    try {
      const r = await licSubirFoto(persona.carpeta, await aJpeg(f))
      if (r.success) { setVersionFoto(Date.now()); toast.success('Foto actualizada') }
      else toast.error(r.error || 'No se pudo subir la foto')
    } catch {
      toast.error('No se pudo leer la imagen')
    } finally {
      setSubiendo(false)
    }
  }

  // ── Vista: carpetas ─────────────────────────────────────────────
  if (!persona) {
    if (!personas.length) return <p className="text-primary-400">No hay personal con documentos (o la búsqueda no coincide).</p>
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {personas.map((p) => {
          const f = fichas[String(p.dni)]
          return (
            <button
              key={p.dni || p.nombre}
              onClick={() => { setElegida(p.dni || p.nombre); setModo('procesos') }}
              className="placa-acero group text-left p-3 hover:brightness-125 transition"
            >
              <div className="relative">
                <Foto persona={p} version={versionFoto} />
                <span className="absolute top-0 left-0 px-2 py-1 bg-accent-energy text-[#111827] text-[10px] font-bold tracking-widest flex items-center gap-1">
                  <FaFolder /> CARPETA
                </span>
              </div>
              <p className="mt-3 font-display font-bold text-white leading-tight text-sm">{p.nombre}</p>
              <p className="text-xs text-slate-400 font-mono">{ocultarDni(p.dni)}</p>
              <p className="text-xs text-slate-300 mt-1">
                {p.docs.length} documentos · {p.procesos.length} procesos
                {f?.anios_experiencia ? ` · ${f.anios_experiencia} años exp.` : ''}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs text-accent-energy group-hover:translate-x-1 transition">
                Abrir carpeta <FaChevronRight />
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  // ── Vista: carpeta de una persona ───────────────────────────────
  const ficha = fichas[String(persona.dni)]
  const porProceso = persona.procesos
    .slice()
    .sort((a, b) => anioProceso(b).localeCompare(anioProceso(a)))
    .map((proc) => ({
      proc,
      items: persona.docs
        .map((d) => ({ d, a: (d.apariciones || []).find((x) => x.proceso === proc) }))
        .filter((x) => x.a)
        .sort((x, y) => (x.a!.desde || 0) - (y.a!.desde || 0)),
    }))

  const tarjeta = (d: LicDocumento, pag?: number | null, arch?: string | null, clave = d.id) => (
    <Archivo
      key={clave}
      persona={persona}
      d={d}
      pagina={pag}
      archivoPropuesta={arch}
      estado={estadoDe(d)}
      edicion={edicionDe(d)}
      abierto={abiertoDoc === clave}
      onEditar={() => setAbiertoDoc(abiertoDoc === clave ? null : clave)}
    />
  )

  return (
    <div className="space-y-5">
      {/* Ruta tipo Drive */}
      <nav className="flex items-center gap-2 text-sm">
        <button onClick={() => setElegida(null)} className="inline-flex items-center gap-2 text-accent-energy hover:underline">
          <FaArrowLeft /> Personal clave
        </button>
        <FaChevronRight className="text-slate-500 text-xs" />
        <span className="text-white font-semibold">{persona.nombre}</span>
      </nav>

      {/* Ficha de la persona */}
      <div className="placa-acero p-5 flex flex-col sm:flex-row gap-5">
        <div className="shrink-0">
          <Foto persona={persona} version={versionFoto} grande />
          {LIC_LOCAL && (
            <>
              <button
                onClick={() => inputFoto.current?.click()}
                disabled={subiendo}
                className="mt-2 w-32 inline-flex items-center justify-center gap-2 px-2 py-1.5 text-xs border border-slate-500 text-slate-200 hover:border-accent-energy disabled:opacity-60"
              >
                {subiendo ? <FaSpinner className="animate-spin" /> : <FaCamera />} Cambiar foto
              </button>
              <input ref={inputFoto} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={subirFoto} />
            </>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="rotulo-estencil mb-2">Personal clave</p>
          <h2 className="text-2xl font-display font-bold text-white">{persona.nombre}</h2>
          <p className="text-sm text-slate-400 font-mono mb-3">{ocultarDni(persona.dni)}</p>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              [String(persona.docs.length), 'documentos'],
              [String(persona.procesos.length), 'procesos'],
              [ficha?.anios_experiencia ? String(ficha.anios_experiencia) : '—', 'años de experiencia'],
            ].map(([v, t]) => (
              <div key={t} className="bg-slate-900/60 border border-slate-700 px-3 py-2">
                <p className="text-xl font-display font-bold text-white">{v}</p>
                <p className="text-[11px] text-slate-400">{t}</p>
              </div>
            ))}
          </div>
          {ficha?.titulos?.length ? (
            <p className="text-xs text-slate-300 mt-3">🎓 {ficha.titulos.map((t) => t.titulo).filter(Boolean).slice(0, 2).join(' · ')}</p>
          ) : null}
        </div>
      </div>

      {/* Cómo ver los documentos */}
      <div className="flex gap-2">
        {([['procesos', 'Por proceso'], ['todos', 'Todos sus documentos']] as const).map(([m, t]) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`px-4 py-2 text-sm font-semibold border ${modo === m ? 'bg-accent-energy text-[#111827] border-accent-energy' : 'border-slate-600 text-slate-300 hover:border-slate-400'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {modo === 'todos' ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {persona.docs
            .slice()
            .sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')))
            .map((d) => {
              const a = (d.apariciones || [])[0]
              return tarjeta(d, a?.desde, a?.archivo)
            })}
        </div>
      ) : (
        <div className="space-y-3">
          {porProceso.map(({ proc, items }) => {
            const plegado = plegados[proc]
            return (
              <section key={proc} className="border border-slate-700 bg-slate-900/40">
                <button
                  onClick={() => setPlegados((x) => ({ ...x, [proc]: !plegado }))}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-left"
                >
                  {plegado ? <FaFolder className="text-accent-energy text-xl" /> : <FaFolderOpen className="text-accent-energy text-xl" />}
                  <span className="flex-1">
                    <span className="block text-white font-semibold">{nombreProceso(proc)}</span>
                    <span className="block text-xs text-slate-400">Año {anioProceso(proc)} · {items.length} documentos presentados</span>
                  </span>
                  <FaChevronRight className={`text-slate-400 transition-transform ${plegado ? '' : 'rotate-90'}`} />
                </button>
                {!plegado && (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                    {items.map(({ d, a }) => tarjeta(d, a!.desde, a!.archivo, `${proc}|${d.id}`))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
