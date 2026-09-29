import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaHardHat, FaPlus, FaPen, FaMapMarkerAlt, FaCalendarAlt, FaUsers, FaExclamationTriangle, FaArrowRight, FaTrophy } from 'react-icons/fa'
import { api, LicContrato, LicPersonal, LicProceso, LicServicio } from '../../../api/appScriptApi'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import FichaEditable, { EtiquetaEdicion, VerArchivados } from './FichaEditable'
import { ESTADOS_SERVICIO } from './licEsquemas'
import { fecha, money } from './licUtils'

// ============================================================
// Servicios en ejecución: los contratos que estamos atendiendo AHORA.
// Una tarjeta por servicio con lo que se pregunta en la oficina: ¿cuánto
// falta?, ¿qué hay que entregar?, ¿quién está?, ¿cuánto se facturó?
// Todo se corrige desde "Editar" (nada se borra: se archiva).
// ============================================================

type Fila = Record<string, unknown>

const ESTADO_ESTILO: Record<string, string> = {
  por_iniciar: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  en_ejecucion: 'bg-green-500/15 text-green-300 border-green-500/40',
  suspendido: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  terminado: 'bg-slate-700 text-slate-300 border-slate-500',
}
const nombreEstado = (v: string) => ESTADOS_SERVICIO.find((e) => e.v === v)?.t || v || 'Sin estado'

const DIA = 86400000
const hoyLocal = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
const aFecha = (s: string) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null }
const diasHasta = (s: string) => { const f = aFecha(s); return f ? Math.round((f.getTime() - hoyLocal().getTime()) / DIA) : null }

function Barra({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 bg-slate-800 border border-slate-700">
      <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

export function TarjetaServicio({ s, personas, onEditar }: { s: LicServicio; personas: Map<string, string>; onEditar?: () => void }) {
  const ini = aFecha(s.fecha_inicio)
  const fin = aFecha(s.fecha_fin)
  const pctPlazo = ini && fin && fin > ini ? ((hoyLocal().getTime() - ini.getTime()) / (fin.getTime() - ini.getTime())) * 100 : null
  const faltan = diasHasta(s.fecha_fin)
  const diasHito = diasHasta(s.fecha_hito)
  const monto = Number(s.monto) || 0
  const pctFact = monto > 0 ? ((s.facturado || 0) / monto) * 100 : null
  return (
    <div className={`placa-acero p-5 flex flex-col gap-4 ${s.archivado ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-[11px] font-bold border ${ESTADO_ESTILO[s.estado] || ESTADO_ESTILO.terminado}`}>{nombreEstado(s.estado)}</span>
            {s.zona && <span className="text-xs text-slate-300 inline-flex items-center gap-1"><FaMapMarkerAlt className="text-accent-energy" /> {s.zona}</span>}
            <EtiquetaEdicion fila={s as unknown as Fila} />
          </div>
          <h3 className="text-lg font-display font-bold text-white leading-tight">{s.nombre}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {s.entidad}{s.proceso && <> · <Link className="hover:text-accent-energy" to={`/admin/licitaciones/procesos/${encodeURIComponent(s.proceso)}`}>{s.proceso}</Link></>}
            {s.contrato && <> · Contrato {s.contrato}</>}
          </p>
        </div>
        {onEditar && (
          <button onClick={onEditar} className="px-3 py-1.5 text-xs border border-slate-500 text-slate-200 hover:border-accent-energy inline-flex items-center gap-1.5 shrink-0">
            <FaPen /> Editar
          </button>
        )}
      </div>

      {/* Plazo */}
      <div>
        <div className="flex justify-between text-xs text-slate-300 mb-1">
          <span className="inline-flex items-center gap-1.5"><FaCalendarAlt className="text-slate-500" /> {s.fecha_inicio ? fecha(s.fecha_inicio) : '¿Inicio?'} → {s.fecha_fin ? fecha(s.fecha_fin) : '¿Fin?'}</span>
          <span className={faltan !== null && faltan < 30 && s.estado !== 'terminado' ? 'text-amber-300 font-semibold' : ''}>
            {faltan === null ? 'Falta poner las fechas' : faltan < 0 ? `Terminó hace ${-faltan} días` : `Faltan ${faltan} días`}
          </span>
        </div>
        {pctPlazo !== null && <Barra pct={pctPlazo} color="bg-accent-energy" />}
      </div>

      {/* Próxima entrega */}
      {(s.proximo_hito || s.fecha_hito) && (
        <div className={`p-3 border text-sm ${diasHito !== null && diasHito <= 7 ? 'border-red-500/60 bg-red-500/10 text-red-200' : 'border-slate-700 text-slate-200'}`}>
          <p className="flex items-center gap-2">
            {diasHito !== null && diasHito <= 7 && <FaExclamationTriangle />}
            <b>Próxima entrega:</b> {s.proximo_hito || 'sin detalle'}
          </p>
          {s.fecha_hito && (
            <p className="text-xs mt-0.5 opacity-80">
              {fecha(s.fecha_hito)} · {diasHito === null ? '' : diasHito < 0 ? `venció hace ${-diasHito} días` : diasHito === 0 ? 'es HOY' : `en ${diasHito} días`}
            </p>
          )}
        </div>
      )}

      {/* Facturado */}
      <div>
        <div className="flex justify-between text-xs text-slate-300 mb-1">
          <span>Facturado {money(s.facturado || 0)}{s.n_facturas ? ` (${s.n_facturas} facturas)` : ''}</span>
          <span>{monto ? `de ${money(monto)}` : 'Falta el monto del contrato'}</span>
        </div>
        {pctFact !== null && <Barra pct={pctFact} color="bg-green-400" />}
        {!s.contrato && <p className="text-[11px] text-slate-500 mt-1">Pon el N.º de contrato para que se sume lo facturado.</p>}
      </div>

      {/* Equipo */}
      <div className="text-xs text-slate-300">
        <p className="flex items-center gap-1.5 mb-1.5"><FaUsers className="text-slate-500" /> {s.responsable ? <>Responsable: <b className="text-white">{s.responsable}</b></> : 'Sin responsable asignado'}</p>
        {s.personal.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {s.personal.map((dni) => (
              <Link key={dni} to={`/admin/licitaciones/documentos?dni=${dni}`} className="px-2 py-0.5 bg-slate-800 border border-slate-600 hover:border-accent-energy">
                {personas.get(dni) || `DNI ${dni}`}
              </Link>
            ))}
          </div>
        )}
      </div>
      {s.notas && <p className="text-xs text-slate-400 whitespace-pre-line border-t border-slate-800 pt-3">{s.notas}</p>}
    </div>
  )
}

// Elegir de qué licitación ganada sale el servicio (rellena la ficha sola)
function ElegirLicitacion({ ganadas, contratos, yaUsadas, onElegir, onCerrar }: {
  ganadas: LicProceso[]; contratos: LicContrato[]; yaUsadas: Set<string>; onElegir: (inicial: Fila) => void; onCerrar: () => void
}) {
  const desde = (p: LicProceso): Fila => {
    const c = contratos.find((x) => x.proceso === p.nomenclatura)
    return {
      nombre: String(p.objeto || '').replace(/^Servicio de\s+/i, '').slice(0, 80),
      entidad: p.entidad, proceso: p.nomenclatura, estado: 'en_ejecucion',
      monto: c?.monto_contrato || p.nuestro_monto || '', contrato: c?.contrato || '',
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#0f172a] border-2 border-accent-energy">
        <div className="p-5 border-b border-slate-700">
          <p className="rotulo-estencil mb-1">Nuevo servicio · paso 1 de 2</p>
          <h2 className="text-xl font-display font-bold text-white">¿De qué licitación ganada es?</h2>
          <p className="text-sm text-slate-400">Elige una y los datos se llenan solos. Luego revisas y guardas.</p>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-slate-800">
          {ganadas.map((p) => (
            <li key={p.nomenclatura}>
              <button onClick={() => onElegir(desde(p))} className="w-full text-left p-4 hover:bg-slate-800 flex items-center gap-3">
                <FaTrophy className="text-accent-energy shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-white font-semibold">{p.objeto}</span>
                  <span className="block text-xs text-slate-400">{p.entidad} · {p.nomenclatura} · {p.anio}</span>
                </span>
                {yaUsadas.has(p.nomenclatura) && <span className="text-[11px] text-sky-300 shrink-0">ya tiene servicio</span>}
                <FaArrowRight className="text-slate-500 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
        <div className="p-4 border-t border-slate-700 flex gap-3 justify-end">
          <button onClick={onCerrar} className="px-4 py-2 text-sm border border-slate-600 text-slate-200">Cancelar</button>
          <button onClick={() => onElegir({ estado: 'en_ejecucion' })} className="px-4 py-2 text-sm border border-accent-energy text-accent-energy">No viene de una licitación</button>
        </div>
      </div>
    </div>
  )
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<LicServicio[] | null>(null)
  const [procesos, setProcesos] = useState<LicProceso[]>([])
  const [contratos, setContratos] = useState<LicContrato[]>([])
  const [personal, setPersonal] = useState<LicPersonal[]>([])
  const [error, setError] = useState('')
  const [archivados, setArchivados] = useState(false)
  const [verTerminados, setVerTerminados] = useState(false)
  const [editando, setEditando] = useState<LicServicio | null>(null)
  const [eligiendo, setEligiendo] = useState(false)
  const [creando, setCreando] = useState<Fila | null>(null)

  const cargar = async () => {
    setError('')
    const [s, p, c, pe] = await Promise.all([api.licServicios({ archivados }), api.licProcesos(), api.licContratos(), api.licPersonal()])
    if (s.success && s.data) setServicios(s.data)
    else setError(s.error || 'Error desconocido')
    if (p.success && p.data) setProcesos(p.data)
    if (c.success && c.data) setContratos(c.data)
    if (pe.success && pe.data) setPersonal(pe.data)
  }
  useEffect(() => { cargar() }, [archivados]) // eslint-disable-line react-hooks/exhaustive-deps

  const personas = useMemo(() => new Map(personal.map((p) => [String(p.dni), p.nombre])), [personal])
  const ganadas = useMemo(() => procesos.filter((p) => p.resultado === 'ganado').sort((a, b) => String(b.anio).localeCompare(String(a.anio))), [procesos])
  const visibles = (servicios || []).filter((s) => verTerminados || archivados || s.estado !== 'terminado')
  const terminados = (servicios || []).filter((s) => s.estado === 'terminado').length

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <FaHardHat className="text-accent-energy" /> Servicios en ejecución
            </h1>
            <p className="text-primary-400">Los contratos que estamos atendiendo ahora: plazo, entregas, equipo y facturación.</p>
          </div>
          <button onClick={() => setEligiendo(true)} className="btn-primary flex items-center gap-2 shrink-0">
            <FaPlus /> Agregar servicio
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {terminados > 0 && !archivados && (
            <button onClick={() => setVerTerminados(!verTerminados)} className="px-3 py-2 text-xs border border-slate-600 text-slate-300">
              {verTerminados ? 'Ocultar terminados' : `Ver terminados (${terminados})`}
            </button>
          )}
          <VerArchivados activo={archivados} onChange={setArchivados} />
        </div>

        {error ? (
          <ErrorCarga que="los servicios" error={error} onReintentar={cargar} />
        ) : !servicios ? (
          <div className="grid lg:grid-cols-2 gap-4">{[0, 1].map((i) => <div key={i} className="placa-acero h-72 animate-pulse" />)}</div>
        ) : !visibles.length ? (
          <div className="placa-acero p-8 text-center">
            <FaHardHat className="text-4xl text-slate-500 mx-auto mb-3" />
            <p className="text-white font-semibold">Todavía no hay servicios registrados</p>
            <p className="text-slate-400 text-sm mb-4">Agrega cada contrato que estén atendiendo. Toma un minuto y se puede corregir cuando quieras.</p>
            <button onClick={() => setEligiendo(true)} className="btn-primary inline-flex items-center gap-2"><FaPlus /> Agregar el primero</button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {visibles.map((s) => <TarjetaServicio key={s.id} s={s} personas={personas} onEditar={() => setEditando(s)} />)}
          </div>
        )}
      </div>

      {eligiendo && (
        <ElegirLicitacion ganadas={ganadas} contratos={contratos} yaUsadas={new Set((servicios || []).map((s) => s.proceso))}
          onCerrar={() => setEligiendo(false)} onElegir={(inicial) => { setEligiendo(false); setCreando(inicial) }} />
      )}
      {creando && (
        <FichaEditable entidad="servicios" fila={null} inicial={creando} titulo="Nuevo servicio · paso 2 de 2"
          onCerrar={() => setCreando(null)} onGuardado={() => { setCreando(null); cargar() }} />
      )}
      {editando && (
        <FichaEditable entidad="servicios" fila={editando as unknown as Fila}
          onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar() }} />
      )}
    </AdminLayout>
  )
}
