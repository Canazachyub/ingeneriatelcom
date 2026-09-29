import { Link, useLocation } from 'react-router-dom'
import { FaTrophy, FaBan, FaQuestion } from 'react-icons/fa'
import { LicImportPayload } from '../../../api/appScriptApi'

// Helpers compartidos por las páginas de Licitaciones. Los nombres de campo
// que manejan son los del JSON que exporta el vault (ver exportar_web.py):
// sin capa de normalización, a propósito (ver docs/PLAN_LICITACIONES_ADMIN.md).

export const money = (n: unknown): string => {
  const num = Number(n)
  if (n === '' || n === null || n === undefined || Number.isNaN(num)) return '—'
  return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const pct = (n: unknown): string => {
  const num = Number(n)
  if (n === '' || n === null || n === undefined || Number.isNaN(num)) return '—'
  return `${num.toFixed(1)} %`
}

export const fecha = (v: string | undefined | null): string => {
  if (!v) return '—'
  // Admite 'yyyy-MM-dd', ISO completo o 'dd/MM/yyyy' (procesos históricos)
  // Fechas sin hora ('2024-04-07' o '07/04/2024'): se arman en hora LOCAL.
  // new Date('2024-04-07') las toma como UTC y en Perú (UTC-5) salían un día antes.
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v) || (/^(\d{2})\/(\d{2})\/(\d{4})$/.test(v)
    ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.split('/').reverse().join('-')) : null)
  const d = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(v)
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('es-PE')
}

export function ResultadoBadge({ resultado }: { resultado?: string }) {
  const r = (resultado || '').toLowerCase().trim()
  if (r === 'ganado') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
        <FaTrophy /> Ganado
      </span>
    )
  }
  if (r.startsWith('no-presentamos') || r === 'no presentado') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-primary-700/40 text-primary-300">
        <FaBan /> No presentado
      </span>
    )
  }
  if (r === 'perdido' || r === 'no-ganado' || r === 'no ganado') {
    return <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">No ganado</span>
  }
  if (!r) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-primary-800/60 text-primary-400">
        <FaQuestion /> Sin definir
      </span>
    )
  }
  return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/15 text-yellow-300 capitalize">{r}</span>
}

/** Lee varios archivos File (input multiple) y arma el payload de licImportar
 *  emparejando por nombre de archivo (procesos.json, postores.json, ...). */
export async function leerArchivosImportacion(files: FileList | File[]): Promise<{ payload: LicImportPayload; leidos: string[]; ignorados: string[] }> {
  const claves: (keyof LicImportPayload)[] = [
    'procesos', 'postores', 'acciones', 'competidores', 'experiencia', 'documentos',
    'personal', 'contratos', 'facturas',
  ]
  const payload: LicImportPayload = {}
  const leidos: string[] = []
  const ignorados: string[] = []

  for (const file of Array.from(files)) {
    const nombre = file.name.toLowerCase().replace(/\.json$/, '')
    const clave = claves.find((c) => c === nombre)
    if (!clave) {
      if (nombre !== 'indicadores') ignorados.push(file.name) // indicadores.json se recalcula en el backend
      continue
    }
    const texto = await file.text()
    const json = JSON.parse(texto)
    if (!Array.isArray(json)) throw new Error(`${file.name} no es una lista JSON válida`)
    payload[clave] = json
    leidos.push(file.name)
  }
  return { payload, leidos, ignorados }
}

// ── Estructura simple de la sección ─────────────────────────────
// La sección se organiza en 4 bloques con nombres de uso diario (no de
// SEACE). Cada bloque que agrupa varias pantallas muestra estas pestañas
// arriba, para que nunca haga falta buscar en el menú.

export const LINEAS: Record<string, string> = {
  A: 'Supervisión de medidores',
  B: 'Reclamos de usuarios',
  C: 'Supervisión de campo y pérdidas',
  D: 'Apoyo técnico Proc. 227 y NTCSE',
  E: 'Información NTCSE (Osinergmin)',
  F: 'Recodificación de suministros',
  G: 'Línea G',
  H: 'Línea H',
}

export const nombreLinea = (l?: string | null) => (l ? LINEAS[l.trim()] || `Línea ${l}` : 'Sin línea')

// En listas el DNI se muestra oculto (solo los 3 últimos dígitos). Completo
// solo al editar o buscar. Ley 29733: minimizar datos personales a la vista.
export const ocultarDni = (dni?: string | null) => {
  const d = String(dni || '').trim()
  return d.length > 3 ? `DNI ••••${d.slice(-3)}` : d ? `DNI ${d}` : ''
}

type Grupo = 'licitaciones' | 'carpeta'

const PESTANAS: Record<Grupo, { a: string; texto: string }[]> = {
  licitaciones: [
    { a: '/admin/licitaciones/procesos', texto: 'Lista de licitaciones' },
    { a: '/admin/licitaciones/estadisticas', texto: 'Estadísticas' },
  ],
  carpeta: [
    { a: '/admin/licitaciones/personal', texto: 'Personal' },
    { a: '/admin/licitaciones/documentos', texto: 'Documentos' },
    { a: '/admin/licitaciones/contratos', texto: 'Contratos' },
    { a: '/admin/licitaciones/experiencia', texto: 'Experiencia' },
  ],
}

const TITULO_GRUPO: Record<Grupo, string> = {
  licitaciones: 'Mis licitaciones',
  carpeta: 'Carpeta de la empresa',
}

export function Pestanas({ grupo }: { grupo: Grupo }) {
  const { pathname } = useLocation()
  return (
    <nav aria-label={TITULO_GRUPO[grupo]} className="mb-6">
      <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary-500 mb-2">{TITULO_GRUPO[grupo]}</p>
      <div className="flex flex-wrap gap-2 border-b border-primary-800 pb-3">
        {PESTANAS[grupo].map((p) => {
          const activa = pathname === p.a || pathname.startsWith(p.a + '/')
          return (
            <Link
              key={p.a}
              to={p.a}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${activa
                ? 'bg-accent-energy text-[#111827]'
                : 'bg-primary-900/60 text-primary-300 hover:text-white border border-primary-700'}`}
            >
              {p.texto}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
