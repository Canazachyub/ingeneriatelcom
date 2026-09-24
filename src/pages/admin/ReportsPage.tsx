import { useMemo, useState } from 'react'
import {
  FaChartLine,
  FaUsers,
  FaClock,
  FaBriefcase,
  FaDownload,
  FaSpinner,
  FaFilter,
} from 'react-icons/fa'
import AdminLayout from '../../components/admin/AdminLayout'
import ErrorCarga from '../../components/admin/ErrorCarga'
import { api, Employee } from '../../api/appScriptApi'
import { exportarExcel } from '../../utils/excel'

// ─────────────────────────────────────────────
// Reportes del admin
//  · Asistencias: sobre asistencia V2 (hoja asistencias_v2) vía
//    getAsistenciasV2 con rango real. Antes usaba getAttendances (V1
//    legado, hoja 'Asistencias', siempre vacía) y un rango que el backend
//    ignoraba.
//  · Postulaciones: estados reales del pipeline (pendiente, en_revision,
//    entrevista, contratado, rechazado); filas antiguas sin estado cuentan
//    como pendiente.
//  · Regla del proyecto: una carga fallida muestra ErrorCarga, nunca "vacío".
// ─────────────────────────────────────────────

type TabId = 'asistencias' | 'postulaciones' | 'empleados'

interface MarcaV2 {
  id: string
  dni: string
  nombre?: string
  cargo?: string
  evento: string
  fecha: string
  hora: string
  foto_url?: string
  nota?: string
}

interface Trabajador {
  dni: string
  nombre: string
  cargo: string
  registro_simple?: boolean
}

const EVENTOS_OFICINA = ['ingreso_manana', 'salida_manana', 'ingreso_tarde', 'salida_tarde'] as const
const ETIQUETA_EVENTO: Record<string, string> = {
  ingreso_manana: 'Ingreso mañana',
  salida_manana: 'Salida mañana',
  ingreso_tarde: 'Ingreso tarde',
  salida_tarde: 'Salida tarde',
  ingreso_campo: 'Ingreso (campo)',
  salida_campo: 'Salida (campo)',
}

// Referencia para tardanzas (misma regla que Asistencias: 10 min de
// tolerancia solo en el ingreso de la mañana). Es un indicador del reporte;
// la cifra oficial la da Planilla (sincronizarIncidencias).
const LIMITE_INGRESO_MANANA = 7 * 60 + 40
const LIMITE_INGRESO_TARDE = 14 * 60

const minutos = (hora: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hora || '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN
}
const hhmm = (hora: string) => (hora ? String(hora).slice(0, 5) : '')

// Fecha local (no UTC): en Lima, toISOString() adelanta el día después de las 19:00
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const ESTADOS_POSTULACION = [
  { key: 'pendiente', label: 'Pendiente', color: 'text-amber-300 border-amber-500/40 bg-amber-500/10' },
  { key: 'en_revision', label: 'En revisión', color: 'text-sky-300 border-sky-500/40 bg-sky-500/10' },
  { key: 'entrevista', label: 'Entrevista', color: 'text-violet-300 border-violet-500/40 bg-violet-500/10' },
  { key: 'contratado', label: 'Contratado', color: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' },
  { key: 'rechazado', label: 'Rechazado', color: 'text-rose-300 border-rose-500/40 bg-rose-500/10' },
] as const

const normalizarEstado = (raw: unknown): string => {
  const s = String(raw ?? '').toLowerCase().trim()
  const mapa: Record<string, string> = {
    '': 'pendiente', pendiente: 'pendiente', pending: 'pendiente', nuevo: 'pendiente',
    en_revision: 'en_revision', revision: 'en_revision', revisado: 'en_revision', reviewing: 'en_revision', review: 'en_revision',
    entrevista: 'entrevista', interview: 'entrevista',
    contratado: 'contratado', aceptado: 'contratado', accepted: 'contratado', hired: 'contratado', approved: 'contratado',
    rechazado: 'rechazado', rejected: 'rechazado',
  }
  return mapa[s] ?? 'pendiente'
}
const etiquetaEstado = (k: string) => ESTADOS_POSTULACION.find((e) => e.key === k)?.label ?? k

// ─────────────────────────────────────────────
// UI compartida (tema oscuro del admin)
// ─────────────────────────────────────────────

const inputCls =
  'px-3 py-2 bg-primary-950/70 border border-primary-700/60 rounded-lg text-white text-sm focus:outline-none focus:border-accent-electric'
const btnGenerar =
  'flex items-center gap-2 px-4 py-2 bg-accent-electric text-primary-950 hover:brightness-110 disabled:opacity-50 rounded-lg text-sm font-semibold transition'
const btnExportar =
  'flex items-center gap-2 px-4 py-2 border border-accent-electric/50 text-accent-electric hover:bg-accent-electric/10 rounded-lg text-sm font-medium transition ml-auto'

function StatCard({ label, value, color = 'text-accent-electric' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="panel-hud px-5 py-4">
      <p className="font-mono text-[10px] text-primary-400 uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className={`text-2xl font-display font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function Vacio({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-primary-400">
      <FaChartLine className="text-4xl mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

function Cargando() {
  return (
    <div className="flex justify-center py-16">
      <FaSpinner className="animate-spin text-accent-electric text-3xl" />
    </div>
  )
}

function Tabla({ cabeceras, children }: { cabeceras: string[]; children: React.ReactNode }) {
  return (
    <div className="panel-hud overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary-700/60 bg-primary-950/60">
              {cabeceras.map((c) => (
                <th key={c} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-primary-400 whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}
const filaCls = 'border-b border-primary-800/60 hover:bg-primary-800/30 transition-colors'

// ─────────────────────────────────────────────
// Tab 1: Asistencias (V2)
// ─────────────────────────────────────────────

interface FilaDia {
  dni: string
  nombre: string
  cargo: string
  fecha: string
  eventos: Record<string, string> // evento -> primera hora HH:mm
  campo: number
  manuales: number
  tardanza: boolean
  omisiones: number
  feriado: string
}

interface FilaResumen {
  dni: string
  nombre: string
  cargo: string
  dias: number
  marcas: number
  manuales: number
  tardanzas: number
  omisiones: number
}

function AsistenciasTab() {
  const hoy = new Date()
  const [desde, setDesde] = useState(isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)))
  const [hasta, setHasta] = useState(isoLocal(hoy))
  const [dni, setDni] = useState('')
  const [vista, setVista] = useState<'resumen' | 'detalle'>('resumen')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [marcas, setMarcas] = useState<MarcaV2[] | null>(null)
  const [roster, setRoster] = useState<Trabajador[]>([])
  const [feriados, setFeriados] = useState<Record<string, string>>({})

  const handleGenerar = async () => {
    if (desde > hasta) {
      setError('La fecha "desde" es posterior a "hasta"')
      setMarcas(null)
      return
    }
    setLoading(true)
    setError('')
    setMarcas(null)
    const [asis, trab, fer] = await Promise.all([
      api.getAsistenciasV2({ desde, hasta, dni: dni || undefined }),
      roster.length ? Promise.resolve(null) : api.getTrabajadores(true),
      Object.keys(feriados).length ? Promise.resolve(null) : api.getFeriados(),
    ])
    if (trab && trab.success && trab.data) setRoster(trab.data as Trabajador[])
    if (fer && fer.success && fer.data) {
      const mapa: Record<string, string> = {}
      fer.data.forEach((f) => { mapa[f.fecha] = f.descripcion })
      setFeriados(mapa)
    }
    if (asis.success && asis.data) {
      setMarcas(asis.data as unknown as MarcaV2[])
    } else {
      setError(asis.error || 'Error desconocido')
    }
    setLoading(false)
  }

  const { dias, resumen } = useMemo(() => {
    if (!marcas) return { dias: [] as FilaDia[], resumen: [] as FilaResumen[] }
    const porDni = new Map(roster.map((t) => [String(t.dni), t]))
    const grupos = new Map<string, FilaDia>()
    for (const m of marcas) {
      const clave = `${m.dni}|${m.fecha}`
      const t = porDni.get(String(m.dni))
      let g = grupos.get(clave)
      if (!g) {
        g = {
          dni: String(m.dni),
          nombre: t?.nombre || m.nombre || `DNI ${m.dni}`,
          cargo: t?.cargo || m.cargo || '',
          fecha: String(m.fecha),
          eventos: {},
          campo: 0,
          manuales: 0,
          tardanza: false,
          omisiones: 0,
          feriado: feriados[String(m.fecha)] || '',
        }
        grupos.set(clave, g)
      }
      const hora = hhmm(m.hora)
      if (m.evento === 'ingreso_campo' || m.evento === 'salida_campo') {
        g.campo++
      } else if (!g.eventos[m.evento] || hora < g.eventos[m.evento]) {
        g.eventos[m.evento] = hora
      }
      if (!m.foto_url) g.manuales++
    }
    const dias = Array.from(grupos.values())
    for (const d of dias) {
      const im = minutos(d.eventos.ingreso_manana)
      const it = minutos(d.eventos.ingreso_tarde)
      d.tardanza = (im > LIMITE_INGRESO_MANANA) || (it > LIMITE_INGRESO_TARDE)
      const esCampo = porDni.get(d.dni)?.registro_simple
      const marcasOficina = EVENTOS_OFICINA.filter((e) => d.eventos[e]).length
      d.omisiones = esCampo || d.feriado || marcasOficina === 0 ? 0 : 4 - marcasOficina
    }
    dias.sort((a, b) => (a.fecha === b.fecha ? a.nombre.localeCompare(b.nombre) : b.fecha.localeCompare(a.fecha)))

    const acc = new Map<string, FilaResumen>()
    for (const d of dias) {
      const r = acc.get(d.dni) ?? { dni: d.dni, nombre: d.nombre, cargo: d.cargo, dias: 0, marcas: 0, manuales: 0, tardanzas: 0, omisiones: 0 }
      r.dias++
      r.marcas += Object.keys(d.eventos).length + d.campo
      r.manuales += d.manuales
      r.tardanzas += d.tardanza ? 1 : 0
      r.omisiones += d.omisiones
      acc.set(d.dni, r)
    }
    const resumen = Array.from(acc.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
    return { dias, resumen }
  }, [marcas, roster, feriados])

  const exportar = () => {
    exportarExcel(`reporte_asistencia_${desde}_a_${hasta}.xlsx`, [
      {
        nombre: 'Resumen',
        columnas: [
          { titulo: 'DNI', ancho: 12 }, { titulo: 'Nombre', ancho: 32 }, { titulo: 'Cargo', ancho: 26 },
          { titulo: 'Días con marca' }, { titulo: 'Marcas' }, { titulo: 'Manuales' },
          { titulo: 'Tardanzas (ref.)' }, { titulo: 'Omisiones (ref.)' },
        ],
        filas: resumen.map((r) => [r.dni, r.nombre, r.cargo, r.dias, r.marcas, r.manuales, r.tardanzas, r.omisiones]),
      },
      {
        nombre: 'Detalle por día',
        columnas: [
          { titulo: 'Fecha', ancho: 12 }, { titulo: 'DNI', ancho: 12 }, { titulo: 'Nombre', ancho: 32 },
          ...EVENTOS_OFICINA.map((e) => ({ titulo: ETIQUETA_EVENTO[e], ancho: 14 })),
          { titulo: 'Marcas de campo' }, { titulo: 'Manuales' }, { titulo: 'Tardanza (ref.)' },
          { titulo: 'Omisiones (ref.)' }, { titulo: 'Feriado', ancho: 24 },
        ],
        filas: dias.map((d) => [
          d.fecha, d.dni, d.nombre,
          ...EVENTOS_OFICINA.map((e) => d.eventos[e] || null),
          d.campo || null, d.manuales || null, d.tardanza ? 'Sí' : null, d.omisiones || null, d.feriado || null,
        ]),
      },
    ])
  }

  const totalTardanzas = resumen.reduce((s, r) => s + r.tardanzas, 0)
  const totalManuales = resumen.reduce((s, r) => s + r.manuales, 0)

  return (
    <div className="space-y-5">
      <div className="panel-hud p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-primary-400 mb-1">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-primary-400 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-primary-400 mb-1">Trabajador</label>
            <select value={dni} onChange={(e) => setDni(e.target.value)} className={inputCls}>
              <option value="">Todos</option>
              {roster.map((t) => (
                <option key={t.dni} value={t.dni}>{t.nombre}</option>
              ))}
            </select>
          </div>
          <button onClick={handleGenerar} disabled={loading} className={btnGenerar}>
            {loading ? <FaSpinner className="animate-spin" /> : <FaFilter />}
            {loading ? 'Cargando...' : 'Generar'}
          </button>
          {resumen.length > 0 && (
            <button onClick={exportar} className={btnExportar}>
              <FaDownload /> Exportar Excel
            </button>
          )}
        </div>
        <p className="text-xs text-primary-500 mt-3">
          Tardanzas y omisiones son referenciales (tolerancia de 10 min en el ingreso de la mañana). La cifra oficial
          sale de Planilla → Sincronizar incidencias.
        </p>
      </div>

      {marcas !== null && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Marcas" value={marcas.length} />
          <StatCard label="Trabajadores" value={resumen.length} color="text-emerald-300" />
          <StatCard label="Tardanzas (ref.)" value={totalTardanzas} color="text-amber-300" />
          <StatCard label="Marcas manuales" value={totalManuales} color="text-sky-300" />
        </div>
      )}

      {loading && <Cargando />}

      {!loading && error && <ErrorCarga que="las asistencias" error={error} onReintentar={handleGenerar} />}

      {!loading && !error && marcas !== null && marcas.length === 0 && (
        <Vacio message="No hay marcas en el rango seleccionado" />
      )}

      {!loading && !error && dias.length > 0 && (
        <>
          <div className="flex gap-2">
            {(['resumen', 'detalle'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${
                  vista === v
                    ? 'border-accent-electric/60 bg-accent-electric/10 text-accent-electric'
                    : 'border-primary-700/60 text-primary-300 hover:text-white'
                }`}
              >
                {v === 'resumen' ? 'Resumen por trabajador' : 'Detalle por día'}
              </button>
            ))}
          </div>

          {vista === 'resumen' ? (
            <Tabla cabeceras={['Trabajador', 'DNI', 'Días con marca', 'Marcas', 'Manuales', 'Tardanzas', 'Omisiones']}>
              {resumen.map((r) => (
                <tr key={r.dni} className={filaCls}>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{r.nombre}</p>
                    <p className="text-xs text-primary-400">{r.cargo}</p>
                  </td>
                  <td className="px-4 py-3 text-primary-300 font-mono">{r.dni}</td>
                  <td className="px-4 py-3 text-white tabular-nums">{r.dias}</td>
                  <td className="px-4 py-3 text-primary-200 tabular-nums">{r.marcas}</td>
                  <td className="px-4 py-3 text-sky-300 tabular-nums">{r.manuales || '—'}</td>
                  <td className="px-4 py-3 text-amber-300 tabular-nums">{r.tardanzas || '—'}</td>
                  <td className="px-4 py-3 text-rose-300 tabular-nums">{r.omisiones || '—'}</td>
                </tr>
              ))}
            </Tabla>
          ) : (
            <Tabla cabeceras={['Fecha', 'Trabajador', ...EVENTOS_OFICINA.map((e) => ETIQUETA_EVENTO[e]), 'Campo', 'Notas']}>
              {dias.map((d) => (
                <tr key={`${d.dni}|${d.fecha}`} className={filaCls}>
                  <td className="px-4 py-3 text-primary-300 font-mono whitespace-nowrap">{d.fecha}</td>
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{d.nombre}</td>
                  {EVENTOS_OFICINA.map((e) => {
                    const h = d.eventos[e]
                    const tarde =
                      (e === 'ingreso_manana' && minutos(h) > LIMITE_INGRESO_MANANA) ||
                      (e === 'ingreso_tarde' && minutos(h) > LIMITE_INGRESO_TARDE)
                    return (
                      <td key={e} className={`px-4 py-3 font-mono tabular-nums ${!h ? 'text-primary-600' : tarde ? 'text-amber-300' : 'text-primary-100'}`}>
                        {h || '—'}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-primary-300 tabular-nums">{d.campo || '—'}</td>
                  <td className="px-4 py-3 text-xs text-primary-400">
                    {[d.feriado && `Feriado: ${d.feriado}`, d.manuales && `${d.manuales} manual(es)`, d.omisiones && `${d.omisiones} omisión(es)`]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </td>
                </tr>
              ))}
            </Tabla>
          )}
        </>
      )}

      {!loading && !error && marcas === null && <Vacio message="Elige el rango y presiona Generar" />}
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab 2: Postulaciones
// ─────────────────────────────────────────────

interface Postulacion {
  id: string
  puesto: string
  nombre: string
  dni: string
  email: string
  telefono: string
  estado: string
  pretension: string
  fecha: string
}

function PostulacionesTab() {
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [puestoFiltro, setPuestoFiltro] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<Postulacion[] | null>(null)

  const handleGenerar = async () => {
    setLoading(true)
    setError('')
    setData(null)
    const res = await api.getApplicationsAdmin()
    if (res.success && res.data) {
      const filas = (res.data as unknown as Record<string, unknown>[]).map((a) => {
        const f = a.createdAt || a.fecha_postulacion
        return {
          id: String(a.id ?? ''),
          puesto: String(a.jobTitle || a.titulo_convocatoria || 'Sin puesto'),
          nombre: String(a.fullName || a.nombre_completo || ''),
          dni: String(a.dni ?? ''),
          email: String(a.email ?? ''),
          telefono: String(a.phone || a.telefono || ''),
          estado: normalizarEstado(a.status ?? a.estado),
          pretension: String(a.expectedSalary || a.pretension_salarial || ''),
          fecha: f ? String(f).slice(0, 10) : '',
        }
      })
      setData(filas)
    } else {
      setError(res.error || 'Error desconocido')
    }
    setLoading(false)
  }

  const puestos = useMemo(() => Array.from(new Set((data ?? []).map((d) => d.puesto))).sort(), [data])
  const filtradas = (data ?? []).filter(
    (d) => (!estadoFiltro || d.estado === estadoFiltro) && (!puestoFiltro || d.puesto === puestoFiltro)
  )
  const porEstado = (data ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.estado] = (acc[d.estado] ?? 0) + 1
    return acc
  }, {})
  const porPuesto = (data ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.puesto] = (acc[d.puesto] ?? 0) + 1
    return acc
  }, {})

  const exportar = () => {
    exportarExcel(`reporte_postulaciones_${isoLocal(new Date())}.xlsx`, [
      {
        nombre: 'Postulaciones',
        columnas: [
          { titulo: 'Fecha', ancho: 12 }, { titulo: 'Puesto', ancho: 34 }, { titulo: 'Nombre', ancho: 30 },
          { titulo: 'DNI', ancho: 12 }, { titulo: 'Correo', ancho: 30 }, { titulo: 'Teléfono', ancho: 16 },
          { titulo: 'Estado', ancho: 14 }, { titulo: 'Pretensión', ancho: 12 },
        ],
        filas: filtradas.map((d) => [d.fecha || null, d.puesto, d.nombre, d.dni, d.email, d.telefono || null, etiquetaEstado(d.estado), d.pretension || null]),
      },
      {
        nombre: 'Por convocatoria',
        columnas: [{ titulo: 'Convocatoria', ancho: 40 }, ...ESTADOS_POSTULACION.map((e) => ({ titulo: e.label })), { titulo: 'Total' }],
        filas: puestos.map((p) => {
          const del = (data ?? []).filter((d) => d.puesto === p)
          return [p, ...ESTADOS_POSTULACION.map((e) => del.filter((d) => d.estado === e.key).length), del.length]
        }),
      },
    ])
  }

  return (
    <div className="space-y-5">
      <div className="panel-hud p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-primary-400 mb-1">Estado</label>
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className={inputCls}>
              <option value="">Todos</option>
              {ESTADOS_POSTULACION.map((e) => (
                <option key={e.key} value={e.key}>{e.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-primary-400 mb-1">Convocatoria</label>
            <select value={puestoFiltro} onChange={(e) => setPuestoFiltro(e.target.value)} className={`${inputCls} max-w-xs`}>
              <option value="">Todas</option>
              {puestos.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <button onClick={handleGenerar} disabled={loading} className={btnGenerar}>
            {loading ? <FaSpinner className="animate-spin" /> : <FaFilter />}
            {loading ? 'Cargando...' : 'Generar'}
          </button>
          {filtradas.length > 0 && (
            <button onClick={exportar} className={btnExportar}>
              <FaDownload /> Exportar Excel
            </button>
          )}
        </div>
      </div>

      {data !== null && !loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Total" value={data.length} />
            {ESTADOS_POSTULACION.map((e) => (
              <StatCard key={e.key} label={e.label} value={porEstado[e.key] ?? 0} color={e.color.split(' ')[0]} />
            ))}
          </div>
          {Object.keys(porPuesto).length > 0 && (
            <div className="panel-hud p-4">
              <p className="font-mono text-[10px] text-primary-400 uppercase tracking-[0.2em] mb-3">Por convocatoria</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(porPuesto)
                  .sort((a, b) => b[1] - a[1])
                  .map(([p, n]) => (
                    <button
                      key={p}
                      onClick={() => setPuestoFiltro(puestoFiltro === p ? '' : p)}
                      className={`px-3 py-1 rounded-full text-xs border transition ${
                        puestoFiltro === p
                          ? 'border-accent-electric text-accent-electric bg-accent-electric/10'
                          : 'border-primary-700/60 text-primary-200 hover:border-accent-electric/50'
                      }`}
                    >
                      {p}: {n}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {loading && <Cargando />}
      {!loading && error && <ErrorCarga que="las postulaciones" error={error} onReintentar={handleGenerar} />}
      {!loading && !error && data !== null && filtradas.length === 0 && (
        <Vacio message="No hay postulaciones con los filtros seleccionados" />
      )}

      {!loading && !error && filtradas.length > 0 && (
        <Tabla cabeceras={['Fecha', 'Postulante', 'Puesto', 'Contacto', 'Estado', 'Pretensión']}>
          {filtradas.map((d) => {
            const est = ESTADOS_POSTULACION.find((e) => e.key === d.estado)
            return (
              <tr key={d.id} className={filaCls}>
                <td className="px-4 py-3 text-primary-300 font-mono whitespace-nowrap">{d.fecha || '—'}</td>
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{d.nombre || '—'}</p>
                  <p className="text-xs text-primary-400 font-mono">DNI {d.dni}</p>
                </td>
                <td className="px-4 py-3 text-primary-200">{d.puesto}</td>
                <td className="px-4 py-3 text-xs text-primary-300">
                  <p>{d.email}</p>
                  {d.telefono && <p>{d.telefono}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${est?.color ?? ''}`}>
                    {etiquetaEstado(d.estado)}
                  </span>
                </td>
                <td className="px-4 py-3 text-primary-300">{d.pretension ? `S/ ${d.pretension}` : '—'}</td>
              </tr>
            )
          })}
        </Tabla>
      )}

      {!loading && !error && data === null && <Vacio message="Presiona Generar para cargar las postulaciones" />}
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab 3: Empleados
// ─────────────────────────────────────────────

const ESTADO_EMPLEADO: Record<string, string> = { active: 'Activo', inactive: 'Inactivo', on_leave: 'Permiso' }

function EmpleadosTab() {
  const [ciudadFiltro, setCiudadFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<Employee[] | null>(null)

  const handleGenerar = async () => {
    setLoading(true)
    setError('')
    setData(null)
    const res = await api.getEmployees()
    if (res.success && res.data) setData(res.data)
    else setError(res.error || 'Error desconocido')
    setLoading(false)
  }

  const ciudades = data ? Array.from(new Set(data.map((e) => e.city).filter(Boolean))).sort() : []
  const filtrados = (data ?? []).filter(
    (e) => (!ciudadFiltro || e.city === ciudadFiltro) && (!estadoFiltro || e.status === estadoFiltro)
  )
  const activos = (data ?? []).filter((e) => e.status === 'active').length
  const porCiudad = (data ?? []).reduce<Record<string, number>>((acc, e) => {
    if (e.city) acc[e.city] = (acc[e.city] ?? 0) + 1
    return acc
  }, {})

  const exportar = () => {
    exportarExcel(`reporte_empleados_${isoLocal(new Date())}.xlsx`, [
      {
        nombre: 'Empleados',
        columnas: [
          { titulo: 'Nombre', ancho: 32 }, { titulo: 'DNI', ancho: 12 }, { titulo: 'Cargo', ancho: 26 },
          { titulo: 'Área', ancho: 20 }, { titulo: 'Ciudad', ancho: 16 }, { titulo: 'Estado', ancho: 10 },
          { titulo: 'Fecha de ingreso', ancho: 14 },
        ],
        filas: filtrados.map((e) => [
          e.name, e.dni, e.position || null, e.department || null, e.city || null,
          ESTADO_EMPLEADO[e.status] ?? e.status, e.startDate ? String(e.startDate).slice(0, 10) : null,
        ]),
      },
    ])
  }

  return (
    <div className="space-y-5">
      <div className="panel-hud p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-primary-400 mb-1">Ciudad</label>
            <select value={ciudadFiltro} onChange={(e) => setCiudadFiltro(e.target.value)} className={inputCls}>
              <option value="">Todas</option>
              {ciudades.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-primary-400 mb-1">Estado</label>
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className={inputCls}>
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="on_leave">En permiso</option>
            </select>
          </div>
          <button onClick={handleGenerar} disabled={loading} className={btnGenerar}>
            {loading ? <FaSpinner className="animate-spin" /> : <FaFilter />}
            {loading ? 'Cargando...' : 'Generar'}
          </button>
          {filtrados.length > 0 && (
            <button onClick={exportar} className={btnExportar}>
              <FaDownload /> Exportar Excel
            </button>
          )}
        </div>
      </div>

      {data !== null && !loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total empleados" value={data.length} />
            <StatCard label="Activos" value={activos} color="text-emerald-300" />
            <StatCard label="Mostrando" value={filtrados.length} color="text-sky-300" />
          </div>
          {Object.keys(porCiudad).length > 0 && (
            <div className="panel-hud p-4">
              <p className="font-mono text-[10px] text-primary-400 uppercase tracking-[0.2em] mb-3">Por ciudad</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(porCiudad)
                  .sort((a, b) => b[1] - a[1])
                  .map(([c, n]) => (
                    <span key={c} className="px-3 py-1 rounded-full text-xs border border-primary-700/60 text-primary-200">
                      {c}: {n}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && <Cargando />}
      {!loading && error && <ErrorCarga que="los empleados" error={error} onReintentar={handleGenerar} />}
      {!loading && !error && data !== null && filtrados.length === 0 && (
        <Vacio message="No hay empleados con los filtros seleccionados" />
      )}

      {!loading && !error && filtrados.length > 0 && (
        <Tabla cabeceras={['Nombre', 'DNI', 'Cargo', 'Área', 'Ciudad', 'Estado', 'Ingreso']}>
          {filtrados.map((e, i) => (
            <tr key={e.id ?? i} className={filaCls}>
              <td className="px-4 py-3 text-white font-medium">{e.name}</td>
              <td className="px-4 py-3 text-primary-300 font-mono">{e.dni}</td>
              <td className="px-4 py-3 text-primary-200">{e.position || '—'}</td>
              <td className="px-4 py-3 text-primary-200">{e.department || '—'}</td>
              <td className="px-4 py-3 text-primary-200">{e.city || '—'}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    e.status === 'active'
                      ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                      : e.status === 'on_leave'
                      ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                      : 'border-rose-500/40 text-rose-300 bg-rose-500/10'
                  }`}
                >
                  {ESTADO_EMPLEADO[e.status] ?? e.status}
                </span>
              </td>
              <td className="px-4 py-3 text-primary-300 font-mono whitespace-nowrap">
                {e.startDate ? String(e.startDate).slice(0, 10) : '—'}
              </td>
            </tr>
          ))}
        </Tabla>
      )}

      {!loading && !error && data === null && <Vacio message="Presiona Generar para cargar la lista de empleados" />}
    </div>
  )
}

// ─────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: typeof FaClock }[] = [
  { id: 'asistencias', label: 'Asistencias', icon: FaClock },
  { id: 'postulaciones', label: 'Postulaciones', icon: FaBriefcase },
  { id: 'empleados', label: 'Empleados', icon: FaUsers },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('asistencias')

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent-electric/70 mb-1">Centro de reportes</p>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <FaChartLine className="text-accent-electric" />
            Reportes
          </h1>
          <p className="text-primary-300 mt-1">Genera y exporta reportes de asistencia, postulaciones y personal</p>
        </div>

        <div className="flex gap-1 panel-hud p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const activo = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activo
                    ? 'bg-accent-electric/10 text-accent-electric border border-accent-electric/50'
                    : 'text-primary-300 hover:text-white hover:bg-primary-800/40 border border-transparent'
                }`}
              >
                <Icon className="text-base" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'asistencias' && <AsistenciasTab />}
        {activeTab === 'postulaciones' && <PostulacionesTab />}
        {activeTab === 'empleados' && <EmpleadosTab />}
      </div>
    </AdminLayout>
  )
}
