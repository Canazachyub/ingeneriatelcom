import { useEffect, useState, useCallback } from 'react'
import {
  FaChartArea, FaUsers, FaMousePointer, FaEye, FaClock, FaBriefcase, FaEnvelope, FaWhatsapp, FaBook,
  FaExternalLinkAlt, FaSyncAlt, FaMobileAlt, FaDesktop, FaTabletAlt,
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'
import ErrorCarga from '../../components/admin/ErrorCarga'

// ============================================================
// Analítica web: datos de Google Analytics 4 (propiedad "ingeneriatelcom")
// leídos por el backend (15_analytics.gs, caché de 10 min). Gráficos en SVG
// propio: sin librerías extra. Ver docs/ANALYTICS_SEO.md §6.
// ============================================================

interface Item { nombre: string; valor: number }
interface Datos {
  dias: number
  generado: string
  enTiempoReal: number | null
  totales: {
    usuarios: number; sesiones: number; vistas: number; duracionMedia: number
    usuariosPrevio: number; sesionesPrevio: number; vistasPrevio: number; duracionMediaPrevio: number
  }
  serie: { fecha: string; usuarios: number; sesiones: number }[]
  canales: Item[]
  fuentes: Item[]
  ciudades: Item[]
  paginas: Item[]
  dispositivos: Item[]
  eventos: Record<string, number>
}

const GA_URL = 'https://analytics.google.com/analytics/web/#/a287374688p409187886/reports/intelligenthome'

const numero = (n: number) => n.toLocaleString('es-PE')
const duracion = (seg: number) => {
  const m = Math.floor(seg / 60)
  const s = Math.round(seg % 60)
  return m ? `${m} min ${s} s` : `${s} s`
}

// Traducción de los canales que devuelve GA4
const CANAL: Record<string, string> = {
  'Organic Search': 'Google (búsqueda)', 'Direct': 'Directo', 'Organic Social': 'Redes sociales',
  'Referral': 'Otros sitios', 'Paid Search': 'Anuncios en Google', 'Paid Social': 'Anuncios en redes',
  'Email': 'Correo', 'Unassigned': 'Sin asignar', '(other)': 'Otros',
}
const DISPOSITIVO: Record<string, { nombre: string; icono: JSX.Element }> = {
  mobile: { nombre: 'Celular', icono: <FaMobileAlt /> },
  desktop: { nombre: 'Computadora', icono: <FaDesktop /> },
  tablet: { nombre: 'Tablet', icono: <FaTabletAlt /> },
}
const PAGINA: Record<string, string> = {
  '/': 'Inicio', '/bolsa-trabajo': 'Bolsa de trabajo', '/capacitaciones': 'Capacitaciones',
  '/mi-postulacion': 'Consultar postulación', '/libro-reclamaciones': 'Libro de Reclamaciones',
  '/terminos': 'Términos', '/privacidad': 'Privacidad',
}
const nombrePagina = (p: string) =>
  PAGINA[p] || (p.startsWith('/bolsa-trabajo/') ? `Oferta ${p.split('/').pop()}` : p)

function Variacion({ actual, previo }: { actual: number; previo: number }) {
  if (!previo) return <span className="text-xs text-primary-500">sin período previo</span>
  const pct = Math.round(((actual - previo) / previo) * 100)
  const sube = pct >= 0
  return (
    <span className={`text-xs font-semibold ${sube ? 'text-green-400' : 'text-red-400'}`}>
      {sube ? '▲' : '▼'} {Math.abs(pct)}% vs. período anterior
    </span>
  )
}

function Kpi({ icono, etiqueta, valor, previo, actual }: { icono: JSX.Element; etiqueta: string; valor: string; actual: number; previo: number }) {
  return (
    <div className="placa-acero p-5 pl-6">
      <span aria-hidden="true" className="absolute left-0 top-4 bottom-4 w-1 bg-accent-energy" />
      <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] tracking-[0.25em] uppercase mb-2">
        <span className="text-accent-electric text-sm">{icono}</span>{etiqueta}
      </div>
      <p className="text-3xl font-display font-bold text-white tabular-nums mb-1">{valor}</p>
      <Variacion actual={actual} previo={previo} />
    </div>
  )
}

// Gráfico de área SVG de usuarios por día
function GraficoSerie({ serie }: { serie: Datos['serie'] }) {
  if (!serie.length) return <p className="text-primary-500 text-sm py-12 text-center">Aún no hay visitas en este período.</p>
  const W = 800, H = 220, P = 28
  const max = Math.max(1, ...serie.map((d) => d.usuarios))
  const x = (i: number) => P + (serie.length === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (serie.length - 1))
  const y = (v: number) => H - P - (v / max) * (H - 2 * P)
  const linea = serie.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.usuarios).toFixed(1)}`).join(' ')
  const area = `${linea} L${x(serie.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`
  const etiquetas = serie.length <= 8 ? serie.map((_, i) => i) : [0, Math.floor(serie.length / 2), serie.length - 1]
  const fechaCorta = (f: string) => f.slice(8, 10) + '/' + f.slice(5, 7)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Usuarios por día">
      <defs>
        <linearGradient id="gaArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={P} x2={W - P} y1={y(max * t)} y2={y(max * t)} stroke="#1e293b" strokeDasharray="4 4" />
          <text x={4} y={y(max * t) + 4} fill="#64748b" fontSize="11">{Math.round(max * t)}</text>
        </g>
      ))}
      <path d={area} fill="url(#gaArea)" />
      <path d={linea} fill="none" stroke="#00d4ff" strokeWidth="2.5" strokeLinejoin="round" />
      {serie.map((d, i) => (
        <circle key={d.fecha} cx={x(i)} cy={y(d.usuarios)} r={serie.length > 40 ? 0 : 3} fill="#f59e0b">
          <title>{`${fechaCorta(d.fecha)}: ${d.usuarios} usuarios, ${d.sesiones} sesiones`}</title>
        </circle>
      ))}
      {etiquetas.map((i) => (
        <text key={i} x={x(i)} y={H - 6} fill="#64748b" fontSize="11" textAnchor="middle">{fechaCorta(serie[i].fecha)}</text>
      ))}
    </svg>
  )
}

function Barras({ titulo, items, formato = (s: string) => s }: { titulo: string; items: Item[]; formato?: (s: string) => string }) {
  const max = Math.max(1, ...items.map((i) => i.valor))
  return (
    <div className="placa-acero p-5">
      <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-slate-300 mb-4">
        <span className="text-accent-energy mr-2">◆</span>{titulo}
      </p>
      {items.length ? (
        <ul className="space-y-2.5">
          {items.map((it) => (
            <li key={it.nombre}>
              <div className="flex justify-between text-sm mb-1 gap-3">
                <span className="text-slate-200 truncate">{formato(it.nombre)}</span>
                <span className="text-white font-semibold tabular-nums">{numero(it.valor)}</span>
              </div>
              <div className="h-1.5 bg-slate-800">
                <div className="h-full bg-gradient-to-r from-accent-electric to-accent-energy" style={{ width: `${(it.valor / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-primary-500 text-sm">Sin datos todavía.</p>
      )}
    </div>
  )
}

export default function AnaliticaPage() {
  const [dias, setDias] = useState(28)
  const [datos, setDatos] = useState<Datos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    const r = await api.getAnalytics(dias)
    setCargando(false)
    if (r.success && r.data) setDatos(r.data as unknown as Datos)
    else setError(r.error || 'Error desconocido')
  }, [dias])

  useEffect(() => { cargar() }, [cargar])

  const t = datos?.totales
  const ev = datos?.eventos || {}

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <FaChartArea className="text-accent-electric" /> Analítica web
            </h1>
            <p className="text-primary-400">
              Visitas de ingeneriatelcom.com según Google Analytics.
              {datos && <> Actualizado {new Date(datos.generado).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} (se renueva cada 10 min).</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[7, 28, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDias(d)}
                className={`px-3 py-2 text-sm font-semibold border transition-colors ${dias === d ? 'bg-accent-energy text-[#111827] border-accent-energy' : 'border-slate-600 text-slate-300 hover:border-slate-400'}`}
              >
                {d} días
              </button>
            ))}
            <button onClick={cargar} className="px-3 py-2 border border-slate-600 text-slate-300 hover:border-slate-400" aria-label="Actualizar">
              <FaSyncAlt className={cargando ? 'animate-spin' : ''} />
            </button>
            <a href={GA_URL} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-sm border border-slate-600 text-slate-300 hover:border-slate-400 inline-flex items-center gap-2">
              Abrir Google Analytics <FaExternalLinkAlt className="text-xs" />
            </a>
          </div>
        </div>

        {error ? (
          <ErrorCarga que="los datos de Google Analytics" error={error} onReintentar={cargar} />
        ) : !datos || !t ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="placa-acero h-32 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* En tiempo real */}
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-60" />
                <span className="relative w-2.5 h-2.5 rounded-full bg-green-400" />
              </span>
              <b className="text-white text-lg tabular-nums">{datos.enTiempoReal ?? '—'}</b> personas en la web ahora (últimos 30 min)
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Kpi icono={<FaUsers />} etiqueta="Usuarios" valor={numero(t.usuarios)} actual={t.usuarios} previo={t.usuariosPrevio} />
              <Kpi icono={<FaMousePointer />} etiqueta="Sesiones" valor={numero(t.sesiones)} actual={t.sesiones} previo={t.sesionesPrevio} />
              <Kpi icono={<FaEye />} etiqueta="Páginas vistas" valor={numero(t.vistas)} actual={t.vistas} previo={t.vistasPrevio} />
              <Kpi icono={<FaClock />} etiqueta="Tiempo medio" valor={duracion(t.duracionMedia)} actual={t.duracionMedia} previo={t.duracionMediaPrevio} />
            </div>

            <div className="placa-acero p-5">
              <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-slate-300 mb-3">
                <span className="text-accent-energy mr-2">◆</span>Usuarios por día · últimos {datos.dias} días
              </p>
              <GraficoSerie serie={datos.serie} />
            </div>

            {/* Resultados: lo que importa al negocio */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { k: 'postulacion_enviada', t: 'Postulaciones enviadas', i: <FaBriefcase /> },
                { k: 'generate_lead', t: 'Mensajes de contacto', i: <FaEnvelope /> },
                { k: 'clic_contacto', t: 'Clics a WhatsApp / teléfono / correo', i: <FaWhatsapp /> },
                { k: 'libro_reclamaciones', t: 'Reclamos registrados', i: <FaBook /> },
              ].map((e) => (
                <div key={e.k} className="placa-acero p-5 flex items-center gap-4">
                  <span className="w-11 h-11 shrink-0 flex items-center justify-center bg-accent-energy/15 border border-accent-energy/50 text-accent-energy text-lg">{e.i}</span>
                  <div>
                    <p className="text-2xl font-display font-bold text-white tabular-nums">{numero(ev[e.k] || 0)}</p>
                    <p className="text-xs text-slate-400 leading-snug">{e.t}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Barras titulo="De dónde llegan (canal)" items={datos.canales} formato={(s) => CANAL[s] || s} />
              <Barras titulo="Sitio de origen" items={datos.fuentes} formato={(s) => (s === '(direct)' ? 'Directo (escribieron la dirección)' : s)} />
              <Barras titulo="Ciudades" items={datos.ciudades} formato={(s) => (s === '(not set)' ? 'Sin identificar' : s)} />
              <Barras titulo="Páginas más vistas" items={datos.paginas} formato={nombrePagina} />
            </div>

            <div className="placa-acero p-5">
              <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-slate-300 mb-4">
                <span className="text-accent-energy mr-2">◆</span>Dispositivos
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                {datos.dispositivos.map((d) => {
                  const total = datos.dispositivos.reduce((a, b) => a + b.valor, 0) || 1
                  const info = DISPOSITIVO[d.nombre] || { nombre: d.nombre, icono: <FaDesktop /> }
                  return (
                    <div key={d.nombre} className="flex items-center gap-3">
                      <span className="text-2xl text-accent-electric">{info.icono}</span>
                      <div>
                        <p className="text-white font-semibold">{info.nombre} · {Math.round((d.valor / total) * 100)}%</p>
                        <p className="text-xs text-slate-400">{numero(d.valor)} usuarios</p>
                      </div>
                    </div>
                  )
                })}
                {!datos.dispositivos.length && <p className="text-primary-500 text-sm">Sin datos todavía.</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
