import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaFolderOpen, FaSearch, FaPlus, FaTimes, FaSpinner, FaFilePdf, FaArrowRight, FaCheck } from 'react-icons/fa'
import { api, LicDocumento, LicPropuesta } from '../../../api/appScriptApi'
import { VISTAS, Vista, agrupar, FilaDocumento, VistaPropuestas, PanelDrive } from './DocumentosVistas'
import PersonalDrive from './PersonalDrive'
import FichaEditable, { VerArchivados } from './FichaEditable'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import EmptyState from '../../../components/common/EmptyState'
import TableSkeleton from '../../../components/common/TableSkeleton'
import { useToast } from '../../../context/ToastContext'
import { fecha, Pestanas } from './licUtils'

// De qué es el PDF nuevo (mismas categorías que acepta licSubirDocumento)
const CATEGORIAS_PDF: { v: string; t: string }[] = [
  { v: 'personal', t: 'Personal clave (CV, título, certificado…)' },
  { v: 'experiencia', t: 'Experiencia (contrato, conformidad, factura…)' },
  { v: 'equipos', t: 'Vehículos y equipos' },
  { v: 'empresa', t: 'Empresa (vigencia de poder, RUC…)' },
  { v: 'tecnico', t: 'Técnico' },
  { v: 'otro', t: 'Otro' },
]
const MAX_PDF = 10 * 1024 * 1024

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

function aBase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(((r.result as string) || '').split(',')[1] || '')
    r.onerror = reject
    r.readAsDataURL(archivo)
  })
}

// ── Paso 1 del alta: el PDF y de qué es ─────────────────────────
// Sube el PDF (opcional) y pasa a la ficha con archivo_vault/categoría ya puestos.
function PasoPdf({ inicial, onCerrar, onListo }: {
  inicial: Record<string, unknown>
  onCerrar: () => void
  onListo: (inicial: Record<string, unknown>) => void
}) {
  const [categoria, setCategoria] = useState(String(inicial.categoria || 'personal'))
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const elegir = (f: File | undefined) => {
    setError('')
    if (!f) return
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { setError('El archivo debe ser PDF'); return }
    if (f.size > MAX_PDF) { setError(`El PDF pesa ${(f.size / 1024 / 1024).toFixed(1)} MB: el máximo es 10 MB`); return }
    setArchivo(f)
  }

  const seguir = async (conPdf: boolean) => {
    const base: Record<string, unknown> = { ...inicial, categoria }
    if (!conPdf || !archivo) { onListo(base); return }
    setSubiendo(true)
    setError('')
    try {
      const r = await api.licSubirDocumento({ categoria, nombre: archivo.name, mime: 'application/pdf', base64: await aBase64(archivo) })
      if (!r.success || !r.data) { setError(r.error || 'No se pudo subir el PDF'); return }
      onListo({ ...base, archivo_vault: r.data.archivo_vault, titulo: base.titulo || archivo.name.replace(/\.pdf$/i, '') })
    } catch {
      setError('No se pudo leer el archivo')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !subiendo) onCerrar() }}>
      <div className="w-full max-w-lg bg-[#0f172a] border-2 border-accent-energy">
        <div className="flex items-start gap-3 p-5 border-b border-slate-700">
          <div className="flex-1">
            <p className="rotulo-estencil mb-1">Nuevo documento · Paso 1 de 2</p>
            <h2 className="text-xl font-display font-bold text-white">¿Qué documento vas a agregar?</h2>
            {inicial.nombre ? <p className="text-sm text-slate-400 mt-1">Para: {String(inicial.nombre)}</p> : null}
          </div>
          <button onClick={onCerrar} disabled={subiendo} className="p-2 text-slate-400 hover:text-white" aria-label="Cerrar"><FaTimes /></button>
        </div>
        <div className="p-5 space-y-5">
          <label className="block text-xs text-slate-300">
            <span className="block mb-1">1. ¿De qué es? <span className="text-accent-energy">*</span></span>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-energy">
              {CATEGORIAS_PDF.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
            </select>
          </label>
          <div className="text-xs text-slate-300">
            <span className="block mb-1">2. El PDF (máx. 10 MB)</span>
            <button type="button" onClick={() => input.current?.click()} disabled={subiendo}
              className={`w-full flex items-center gap-3 px-4 py-4 border-2 border-dashed text-left ${archivo ? 'border-accent-energy bg-accent-energy/5' : 'border-slate-600 hover:border-slate-400'}`}>
              <FaFilePdf className={`text-2xl ${archivo ? 'text-red-300' : 'text-slate-500'}`} />
              <span className="flex-1 min-w-0">
                {archivo
                  ? <><span className="block text-white truncate">{archivo.name}</span><span className="text-slate-400">{(archivo.size / 1024 / 1024).toFixed(1)} MB · pulsa para cambiarlo</span></>
                  : <span className="text-slate-300">Pulsa aquí para elegir el PDF</span>}
              </span>
              {archivo && <FaCheck className="text-accent-energy" />}
            </button>
            <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3 p-4 border-t border-slate-700">
          <button onClick={() => seguir(false)} disabled={subiendo} className="text-xs text-slate-400 hover:text-slate-200 underline">
            No tengo el PDF, solo anotar los datos
          </button>
          <span className="flex-1" />
          <button onClick={() => seguir(true)} disabled={!archivo || subiendo}
            className="px-5 py-2 text-sm bg-accent-energy text-[#111827] font-bold inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
            {subiendo ? <><FaSpinner className="animate-spin" /> Subiendo…</> : <>Siguiente <FaArrowRight /></>}
          </button>
        </div>
      </div>
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
  const [archivados, setArchivados] = useState(false)
  // Ficha abierta: documento a editar, o alta (paso 1: PDF → paso 2: ficha)
  const [editar, setEditar] = useState<LicDocumento | null>(null)
  const [pasoPdf, setPasoPdf] = useState<Record<string, unknown> | null>(null)
  const [nuevo, setNuevo] = useState<Record<string, unknown> | null>(null)

  const cargar = async () => {
    setCargando(true)
    setError('')
    const [r, rp] = await Promise.all([api.licDocumentos({ archivados }), api.licPropuestas()])
    setCargando(false)
    if (rp.success && rp.data) setPropuestas(rp.data)
    if (r.success && r.data) setLista(r.data)
    else setError(r.error || 'Error desconocido')
  }

  useEffect(() => { cargar() }, [archivados]) // eslint-disable-line react-hooks/exhaustive-deps

  const agregar = (inicial: Record<string, unknown> = {}) => setPasoPdf(inicial)

  const estadoDe = (doc: LicDocumento) => <EstadoDoc verificado={doc.verificado || ''} vence={doc.vence || ''} />

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
          <div className="flex items-center gap-2 shrink-0">
            <VerArchivados activo={archivados} onChange={setArchivados} />
            <button onClick={() => agregar()} className="btn-primary flex items-center gap-2">
              <FaPlus /> Agregar documento
            </button>
          </div>
        </div>

        <PanelDrive />

        {!cargando && !error && lista.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              {VISTAS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVista(v.id)}
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
              <button onClick={() => agregar()} className="btn-primary flex items-center gap-2">
                <FaPlus /> Agregar el primero
              </button>
            }
          />
        ) : vista === 'propuestas' ? (
          <VistaPropuestas propuestas={propuestas} documentos={lista} />
        ) : vista === 'personal' ? (
          <PersonalDrive
            lista={lista}
            busqueda={busqueda}
            estadoDe={estadoDe}
            onEditarDoc={setEditar}
            onNuevoDocumento={agregar}
            archivados={archivados}
          />
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
                    <FilaDocumento key={u.doc.id} u={u} estado={estadoDe(u.doc)} onEditar={() => setEditar(u.doc)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {pasoPdf && (
        <PasoPdf
          inicial={pasoPdf}
          onCerrar={() => setPasoPdf(null)}
          onListo={(inicial) => { setPasoPdf(null); setNuevo(inicial) }}
        />
      )}
      {nuevo && (
        <FichaEditable
          entidad="documentos"
          fila={null}
          inicial={nuevo}
          titulo={nuevo.archivo_vault ? 'Paso 2 de 2: datos del documento' : 'Datos del documento (sin PDF)'}
          onCerrar={() => {
            if (nuevo.archivo_vault) toast.info('El PDF quedó subido pero sin ficha: vuelve a "Agregar documento" para registrarlo')
            setNuevo(null)
          }}
          onGuardado={() => { setNuevo(null); cargar() }}
        />
      )}
      {editar && (
        <FichaEditable
          entidad="documentos"
          fila={editar as unknown as Record<string, unknown>}
          onCerrar={() => setEditar(null)}
          onGuardado={() => { setEditar(null); cargar() }}
        />
      )}
    </AdminLayout>
  )
}
