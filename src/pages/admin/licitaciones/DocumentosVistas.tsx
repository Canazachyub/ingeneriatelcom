import { useMemo, useState } from 'react'
import { FaUserTie, FaFileContract, FaTruck, FaBuilding, FaBook, FaExternalLinkAlt, FaChevronDown, FaFilePdf, FaDownload } from 'react-icons/fa'
import { LIC_LOCAL, LicDocumento, LicPropuesta } from '../../../api/appScriptApi'
import { fecha, money, ocultarDni } from './licUtils'
import { licUrlArchivo } from '../../../api/licLocal'

// ============================================================
// Documentos "con contexto" (pedido del dueño, 28/09/2026):
//  · Nada de recortes sueltos: cada documento dice de qué PROPUESTA COMPLETA
//    salió y en qué páginas, y se abre la propuesta entera en esa página.
//  · Organizado por lo que importa: Personal clave (CV, títulos, certificados),
//    Experiencia (por contrato), Vehículos y equipos, Empresa.
//  · Los anexos (formatos que solo sirvieron para armar la oferta) NO se
//    listan como documentos: quedan dentro del índice de cada propuesta.
//  · Un mismo documento usado en varias propuestas se muestra UNA vez
//    ("usado en 5 propuestas") en lugar de repetido.
// ============================================================

export type Vista = 'personal' | 'experiencia' | 'equipos' | 'empresa' | 'propuestas'

export const VISTAS: { id: Vista; texto: string; icono: JSX.Element; ayuda: string }[] = [
  { id: 'personal', texto: 'Personal clave', icono: <FaUserTie />, ayuda: 'CV, títulos y certificados de cada profesional.' },
  { id: 'experiencia', texto: 'Experiencia', icono: <FaFileContract />, ayuda: 'Cada contrato con sus constancias, conformidades y facturas.' },
  { id: 'equipos', texto: 'Vehículos y equipos', icono: <FaTruck />, ayuda: 'Contratos de alquiler, tarjetas de propiedad y equipos.' },
  { id: 'empresa', texto: 'Empresa', icono: <FaBuilding />, ayuda: 'Vigencia de poder, consorcios y documentos técnicos de la empresa.' },
  { id: 'propuestas', texto: 'Propuestas completas', icono: <FaBook />, ayuda: 'Cada oferta presentada, completa, con su índice.' },
]

// Categorías del catálogo que van en cada vista (anexo/otro quedan fuera)
const CATEGORIAS_DE: Record<Exclude<Vista, 'propuestas'>, string[]> = {
  personal: ['personal'],
  experiencia: ['experiencia'],
  equipos: ['equipos'],
  empresa: ['empresa', 'tecnico'],
}

const TIPO: Record<string, string> = {
  'certificado-trabajo': 'Certificado de trabajo', 'constancia-trabajo': 'Constancia de trabajo', bachiller: 'Grado de bachiller',
  titulo: 'Título profesional', colegiatura: 'Colegiatura', 'habilidad-cip': 'Habilidad CIP', cv: 'Currículum',
  contrato: 'Contrato', factura: 'Factura', liquidacion: 'Liquidación', 'constancia-prestacion': 'Constancia de prestación',
  'orden-servicio': 'Orden de servicio', conformidad: 'Conformidad', 'vigencia-poder': 'Vigencia de poder',
  'promesa-consorcio': 'Promesa de consorcio', metodologia: 'Metodología', 'declaracion-jurada': 'Declaración jurada', carta: 'Carta',
}
export const nombreTipo = (t: string) => TIPO[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ') : 'Documento')

// Tipos que son el MISMO papel aunque se hayan extraído de varias propuestas
const TIPOS_UNICOS_POR_ENTIDAD = ['contrato', 'orden-servicio', 'promesa-consorcio', 'conformidad', 'liquidacion']

// "2026 CP SER-SM-37-2026-ELSE-1" → "CP SER-SM-37-2026-ELSE-1"
const nombreProceso = (p: string | null | undefined) => String(p || '').replace(/^\d{4}\s+/, '')

// Abre la propuesta completa en la página indicada (el visor de Chrome la
// muestra sin cargarla entera en memoria; algunas pesan 150 MB+)
export function abrirPropuesta(archivo: string | null | undefined, pagina?: number | null) {
  if (!archivo) return
  const url = `/__lic/archivo?ruta=${encodeURIComponent(archivo)}${pagina ? `#page=${pagina}` : ''}`
  window.open(url, '_blank', 'noopener')
}

interface Grupo {
  titulo: string
  subtitulo?: string
  docs: DocUnico[]
}

// Documento ya sin duplicados: representante + todas sus apariciones
export interface DocUnico {
  doc: LicDocumento
  ids: string[]
  apariciones: NonNullable<LicDocumento['apariciones']>
}

function unificar(docs: LicDocumento[]): DocUnico[] {
  const mapa = new Map<string, DocUnico>()
  docs.forEach((d) => {
    const clave = TIPOS_UNICOS_POR_ENTIDAD.includes(d.tipo) && d.entidad
      ? `${d.tipo}|${d.entidad}|${d.tipo === 'contrato' && /consorcio/i.test(d.titulo) ? 'consorcio' : ''}`
      : d.id
    const previo = mapa.get(clave)
    if (previo) {
      previo.ids.push(d.id)
      previo.apariciones.push(...(d.apariciones || []))
    } else {
      mapa.set(clave, { doc: d, ids: [d.id], apariciones: [...(d.apariciones || [])] })
    }
  })
  return [...mapa.values()]
}

export function agrupar(lista: LicDocumento[], vista: Exclude<Vista, 'propuestas'>, busqueda: string): Grupo[] {
  const q = busqueda.trim().toLowerCase()
  const docs = lista.filter((d) => CATEGORIAS_DE[vista].includes(d.categoria)).filter((d) =>
    !q || [d.titulo, d.nombre, d.entidad, d.dni, d.tipo].some((x) => String(x || '').toLowerCase().includes(q)))

  const porClave = new Map<string, LicDocumento[]>()
  const claveDe = (d: LicDocumento) =>
    vista === 'personal' ? (d.nombre || 'Sin nombre')
      : vista === 'experiencia' ? (d.entidad?.startsWith('contrato:') ? d.entidad.slice(9) : d.entidad || 'Otros')
        : nombreTipo(d.tipo)
  docs.forEach((d) => {
    const k = claveDe(d)
    porClave.set(k, [...(porClave.get(k) || []), d])
  })
  return [...porClave.entries()]
    .map(([k, ds]) => ({
      titulo: vista === 'experiencia' && !/otros/i.test(k) ? `Contrato ${k}` : k,
      subtitulo: vista === 'personal' ? ocultarDni(ds.find((d) => d.dni)?.dni) : undefined,
      docs: unificar(ds).sort((a, b) => String(a.doc.fecha || '').localeCompare(String(b.doc.fecha || ''))),
    }))
    .sort((a, b) => b.docs.length - a.docs.length)
}

// ── Fila de documento ───────────────────────────────────────────
interface FilaProps {
  u: DocUnico
  estado: JSX.Element
  abierto: boolean
  onEditar: () => void
  edicion: JSX.Element
}

export function FilaDocumento({ u, estado, abierto, onEditar, edicion }: FilaProps) {
  const [verTodas, setVerTodas] = useState(false)
  const d = u.doc
  // Una aparición por propuesta (la misma propuesta puede listar el papel 2 veces)
  const apar = useMemo(() => {
    const vistos = new Set<string>()
    return u.apariciones.filter((a) => {
      const k = `${a.archivo}|${a.desde}`
      if (vistos.has(k)) return false
      vistos.add(k)
      return true
    })
  }, [u.apariciones])
  const principal = apar[apar.length - 1] // la más reciente (propuestas ordenadas por año)
  return (
    <li className="border-b border-primary-800/60 last:border-b-0">
      <div className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-accent-energy font-semibold">{nombreTipo(d.tipo)}</p>
          <p className="text-white leading-snug">{d.titulo || nombreTipo(d.tipo)}</p>
          <p className="text-xs text-primary-400 mt-0.5">
            {d.fecha ? fecha(d.fecha) : 'Sin fecha'}
            {d.monto !== '' && d.monto != null ? ` · ${money(d.monto)}` : ''}
            {principal && <> · Viene de la propuesta <b className="text-primary-200">{nombreProceso(principal.proceso)}</b>{principal.desde ? `, págs. ${principal.desde}–${principal.hasta}` : ''}</>}
            {apar.length > 1 && (
              <button onClick={() => setVerTodas(!verTodas)} className="ml-2 text-accent-electric hover:underline">
                (usado en {apar.length} propuestas)
              </button>
            )}
          </p>
          {verTodas && (
            <ul className="mt-2 space-y-1">
              {apar.map((a, i) => (
                <li key={i}>
                  <button onClick={() => abrirPropuesta(a.archivo, a.desde)} disabled={!LIC_LOCAL} className="text-xs text-primary-300 hover:text-accent-energy disabled:opacity-60">
                    ▸ {nombreProceso(a.proceso)}, págs. {a.desde}–{a.hasta}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {estado}
          {LIC_LOCAL && d.archivo_vault && (
            <>
              <a
                href={licUrlArchivo(d.archivo_vault)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs bg-accent-energy text-[#111827] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                title="Abre este documento como PDF individual"
              >
                <FaFilePdf /> Abrir PDF
              </a>
              <a
                href={licUrlArchivo(d.archivo_vault, { descargar: true, nombre: `${nombreTipo(d.tipo)} - ${d.titulo || d.id}.pdf`.replace(/[\/:*?"<>|]/g, '').slice(0, 150) })}
                className="px-2.5 py-1.5 text-xs border border-primary-700 text-primary-200 hover:border-accent-energy"
                title="Descargar para reutilizar"
              >
                <FaDownload />
              </a>
            </>
          )}
          {LIC_LOCAL && principal?.archivo && (
            <button
              onClick={() => abrirPropuesta(principal.archivo, principal.desde)}
              className="px-2.5 py-1.5 text-xs border border-primary-700 text-primary-200 hover:border-accent-energy inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Abre la propuesta completa en la página de este documento"
            >
              En la propuesta <FaExternalLinkAlt className="text-[10px]" />
            </button>
          )}
          <button onClick={onEditar} className="px-3 py-1.5 text-xs border border-primary-700 text-primary-200 hover:border-accent-energy">
            {abierto ? 'Cerrar' : 'Editar'}
          </button>
        </div>
      </div>
      {abierto && <div className="px-4 pb-4">{edicion}</div>}
    </li>
  )
}

// ── Propuestas completas con su índice ──────────────────────────
export function VistaPropuestas({ propuestas, documentos = [] }: { propuestas: LicPropuesta[]; documentos?: LicDocumento[] }) {
  const archivoDe = useMemo(() => new Map(documentos.map((d) => [d.id, d.archivo_vault])), [documentos])
  const [abierta, setAbierta] = useState<string | null>(null)
  const [conAnexos, setConAnexos] = useState(false)
  const ordenadas = [...propuestas].sort((a, b) => b.anio.localeCompare(a.anio))
  if (!ordenadas.length) return <p className="text-primary-400">No hay propuestas completas en el vault.</p>
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-primary-300">
        <input type="checkbox" checked={conAnexos} onChange={(e) => setConAnexos(e.target.checked)} className="accent-amber-400" />
        Mostrar también los anexos y formatos en el índice
      </label>
      {ordenadas.map((p) => {
        const secciones = p.secciones.filter((s) => conAnexos || !['anexo', 'otro'].includes(s.categoria))
        const esta = abierta === p.archivo
        return (
          <div key={p.archivo} className="placa-acero">
            <div className="flex flex-col md:flex-row md:items-center gap-3 p-4">
              <button onClick={() => setAbierta(esta ? null : p.archivo)} className="flex-1 text-left flex items-center gap-3">
                <FaChevronDown className={`text-accent-energy transition-transform ${esta ? '' : '-rotate-90'}`} />
                <span>
                  <span className="block text-white font-semibold">{p.nomenclatura}</span>
                  <span className="block text-xs text-slate-400">
                    Año {p.anio} · {p.tamano_mb} MB · {secciones.length} documentos útiles dentro
                  </span>
                </span>
              </button>
              {LIC_LOCAL && (
                <button onClick={() => abrirPropuesta(p.archivo)} className="px-4 py-2 text-sm bg-accent-energy text-[#111827] font-semibold inline-flex items-center gap-2 whitespace-nowrap">
                  Abrir propuesta completa <FaExternalLinkAlt className="text-xs" />
                </button>
              )}
            </div>
            {esta && (
              <ol className="border-t border-slate-700 divide-y divide-slate-800">
                {secciones.map((s) => (
                  <li key={s.id + s.desde} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="w-24 shrink-0 font-mono text-xs text-slate-400">págs. {s.desde}–{s.hasta}</span>
                    <span className="flex-1 min-w-0">
                      <span className="text-xs text-accent-energy mr-2">{nombreTipo(s.tipo)}</span>
                      <span className="text-slate-200">{s.titulo}</span>
                    </span>
                    {LIC_LOCAL && archivoDe.get(s.id) && (
                      <a href={licUrlArchivo(archivoDe.get(s.id)!)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs bg-accent-energy text-[#111827] font-semibold whitespace-nowrap inline-flex items-center gap-1">
                        <FaFilePdf /> PDF
                      </a>
                    )}
                    {LIC_LOCAL && (
                      <button onClick={() => abrirPropuesta(p.archivo, s.desde)} className="text-xs text-accent-electric hover:underline whitespace-nowrap">
                        Ir a la página →
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )
      })}
    </div>
  )
}
