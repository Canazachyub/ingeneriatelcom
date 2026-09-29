import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FaArrowLeft, FaGavel, FaTrophy, FaSave, FaSpinner, FaFolderOpen, FaPen, FaPlus } from 'react-icons/fa'
import { api, LicAccion, LicPostor, LicProceso } from '../../../api/appScriptApi'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import { useToast } from '../../../context/ToastContext'
import { fecha, money, pct, ResultadoBadge, Pestanas } from './licUtils'
import FichaEditable, { EtiquetaEdicion } from './FichaEditable'

const ESTADOS_SEGUIMIENTO = [
  { value: '', label: 'Sin definir' },
  { value: 'pendiente', label: 'Pendiente de revisión' },
  { value: 'en_seguimiento', label: 'En seguimiento' },
  { value: 'a_la_espera', label: 'A la espera de la entidad' },
  { value: 'cerrado', label: 'Cerrado' },
]

function BarraPostor({ p, max, onEditar }: { p: LicPostor; max: number; onEditar: () => void }) {
  const monto = Number(p.monto) || 0
  const ancho = max > 0 ? Math.max(2, (monto / max) * 100) : 0
  return (
    <div className={`p-3 rounded-lg border ${p.es_telcom ? 'border-accent-electric/50 bg-accent-electric/5' : 'border-primary-800 bg-primary-900/40'}`}>
      <div className="flex items-center justify-between gap-3 mb-2 text-sm">
        <span className={`truncate ${p.es_telcom ? 'text-white font-semibold' : 'text-primary-200'}`}>
          {p.es_telcom && <FaTrophy className="inline mr-1.5 text-accent-electric" />}
          {p.razon_social || 'Persona natural'} {p.gano && <span className="ml-1.5 text-[10px] uppercase text-emerald-400">Ganó</span>}
        </span>
        <span className="flex items-center gap-3 shrink-0">
          <EtiquetaEdicion fila={p as unknown as Record<string, unknown>} />
          <span className="text-primary-300 tabular-nums">{money(p.monto)} · {pct(p.pct_vr)}</span>
          <button onClick={onEditar} className="px-2.5 py-1 text-xs border border-primary-700 text-primary-200 hover:border-accent-energy inline-flex items-center gap-1.5">
            <FaPen className="text-[10px]" /> Editar
          </button>
        </span>
      </div>
      <div className="h-2 rounded-full bg-primary-800 overflow-hidden">
        <div className={`h-full rounded-full ${p.es_telcom ? 'bg-accent-electric' : 'bg-primary-600'}`} style={{ width: `${ancho}%` }} />
      </div>
      {(p.consorcio && p.consorcio !== 'No') && <p className="text-[11px] text-primary-500 mt-1.5">Consorcio: {p.consorcio}</p>}
    </div>
  )
}

export default function LicProcesoDetallePage() {
  const { nom } = useParams<{ nom: string }>()
  const toast = useToast()
  const [proceso, setProceso] = useState<LicProceso | null>(null)
  const [postores, setPostores] = useState<LicPostor[]>([])
  const [acciones, setAcciones] = useState<LicAccion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [estadoSeguimiento, setEstadoSeguimiento] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  // Ficha abierta: datos de la licitación, un postor existente o uno nuevo
  const [ficha, setFicha] = useState<null | { tipo: 'proceso' } | { tipo: 'postor'; fila: LicPostor | null }>(null)

  const cargar = async () => {
    if (!nom) return
    setCargando(true)
    setError('')
    const r = await api.licProceso(nom)
    setCargando(false)
    if (r.success && r.data) {
      setProceso(r.data.proceso)
      setPostores(r.data.postores)
      setAcciones(r.data.acciones)
      setEstadoSeguimiento(r.data.proceso.estado_seguimiento || '')
      setNotas(r.data.proceso.notas || '')
    } else {
      setError(r.error || 'Error desconocido')
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar() }, [nom])

  const guardar = async () => {
    if (!nom) return
    setGuardando(true)
    const r = await api.licActualizarProceso({ nomenclatura: nom, estado_seguimiento: estadoSeguimiento, notas })
    setGuardando(false)
    if (r.success) { toast.success('Seguimiento actualizado'); cargar() }
    else toast.error(r.error || 'No se pudo guardar')
  }

  const maxMonto = Math.max(1, ...postores.map((p) => Number(p.monto) || 0))

  return (
    <AdminLayout>
      <Pestanas grupo="licitaciones" />
      <div className="space-y-6">
        <Link to="/admin/licitaciones/procesos" className="inline-flex items-center gap-2 text-sm text-primary-400 hover:text-white">
          <FaArrowLeft /> Volver a Procesos
        </Link>

        {cargando ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/2 bg-primary-800/60 rounded" />
            <div className="h-40 bg-primary-800/40 rounded-xl" />
          </div>
        ) : error ? (
          <ErrorCarga que="el proceso" error={error} onReintentar={cargar} />
        ) : !proceso ? null : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3 font-mono">
                  <FaGavel className="text-accent-electric shrink-0" /> {proceso.nomenclatura}
                </h1>
                <p className="text-primary-400 mt-1 max-w-2xl">{proceso.objeto}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <EtiquetaEdicion fila={proceso as unknown as Record<string, unknown>} />
                <ResultadoBadge resultado={proceso.resultado} />
                <button onClick={() => setFicha({ tipo: 'proceso' })} className="px-3 py-2 text-sm bg-accent-energy text-[#111827] font-semibold inline-flex items-center gap-2">
                  <FaPen className="text-xs" /> Editar datos de la licitación
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                ['Entidad', proceso.entidad],
                ['Año', proceso.anio],
                ['Línea', proceso.linea || '—'],
                ['Ley', proceso.ley || '—'],
                ['Valor referencial', money(proceso.vr)],
                ['Nuestro monto', money(proceso.nuestro_monto)],
                ['Nuestra oferta (% del precio base)', pct(proceso.nuestro_pct_vr)],
                ['N.° de postores', proceso.n_postores || '—'],
              ].map(([label, valor]) => (
                <div key={label} className="panel-hud p-4">
                  <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500">{label}</p>
                  <p className="text-white mt-1 truncate" title={String(valor)}>{valor}</p>
                </div>
              ))}
            </div>

            {proceso.carpeta_vault && (
              <p className="flex items-center gap-2 text-xs text-primary-500">
                <FaFolderOpen /> Carpeta en el vault: <code className="text-primary-400">{proceso.carpeta_vault}</code>
              </p>
            )}

            {proceso.notas_vault && (
              <div className="panel-hud p-5">
                <h2 className="font-display font-semibold text-white mb-2">Notas del análisis (vault)</h2>
                <p className="text-primary-300 text-sm whitespace-pre-line">{proceso.notas_vault.replace(/ · /g, '\n')}</p>
              </div>
            )}

            <div className="panel-hud p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-display font-semibold text-white">Postores ({postores.length})</h2>
                <button onClick={() => setFicha({ tipo: 'postor', fila: null })} className="px-3 py-1.5 text-sm border border-accent-energy text-accent-energy hover:bg-accent-energy hover:text-[#111827] inline-flex items-center gap-2">
                  <FaPlus className="text-xs" /> Agregar postor
                </button>
              </div>
              {postores.length === 0 ? (
                <p className="text-primary-500 text-sm">Sin postores registrados para este proceso.</p>
              ) : (
                <div className="space-y-2.5">
                  {postores.map((p, i) => <BarraPostor key={p.ruc || i} p={p} max={maxMonto} onEditar={() => setFicha({ tipo: 'postor', fila: p })} />)}
                </div>
              )}
            </div>

            <div className="panel-hud p-5">
              <h2 className="font-display font-semibold text-white mb-4">Acciones del procedimiento ({acciones.length})</h2>
              {acciones.length === 0 ? (
                <p className="text-primary-500 text-sm">Sin acciones registradas (postergaciones, nulidades, etc.).</p>
              ) : (
                <ol className="space-y-3 border-l border-primary-800 pl-4">
                  {acciones.map((a, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-accent-electric" />
                      <p className="text-sm text-white">{a.accion}</p>
                      <p className="text-xs text-primary-500">{a.fecha}{a.motivo ? ` · ${a.motivo}` : ''}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="panel-hud p-5 space-y-4">
              <h2 className="font-display font-semibold text-white">Seguimiento (editable desde el panel)</h2>
              <div>
                <label className="block text-sm font-medium text-primary-200 mb-1">Estado de seguimiento</label>
                <select
                  value={estadoSeguimiento}
                  onChange={(e) => setEstadoSeguimiento(e.target.value)}
                  className="w-full sm:w-72 px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                >
                  {ESTADOS_SEGUIMIENTO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-200 mb-1">Notas</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={4}
                  placeholder="Observaciones del proceso, lecciones aprendidas, pendientes…"
                  className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric resize-none"
                />
              </div>
              <button onClick={guardar} disabled={guardando} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                {guardando ? <FaSpinner className="animate-spin" /> : <FaSave />} Guardar seguimiento
              </button>
            </div>

            {(fecha(proceso.actualizado) !== '—') && (
              <p className="text-xs text-primary-600">Última edición del seguimiento: {fecha(proceso.actualizado)}</p>
            )}
          </>
        )}
      </div>

      {ficha && proceso && (
        ficha.tipo === 'proceso' ? (
          <FichaEditable
            entidad="procesos"
            fila={proceso as unknown as Record<string, unknown>}
            onCerrar={() => setFicha(null)}
            onGuardado={() => { setFicha(null); cargar() }}
          />
        ) : (
          <FichaEditable
            entidad="postores"
            fila={ficha.fila as unknown as Record<string, unknown> | null}
            inicial={{ nomenclatura: proceso.nomenclatura }}
            clavesFijas={['nomenclatura']}
            titulo={ficha.fila ? undefined : `Agregar postor a ${proceso.nomenclatura}`}
            onCerrar={() => setFicha(null)}
            onGuardado={() => { setFicha(null); cargar() }}
          />
        )
      )}
    </AdminLayout>
  )
}
