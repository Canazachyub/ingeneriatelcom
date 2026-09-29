import { Fragment, useEffect, useState } from 'react'
import { FaFileContract, FaChevronDown, FaChevronUp, FaExclamationTriangle, FaPen, FaPlus } from 'react-icons/fa'
import { api, LicContrato } from '../../../api/appScriptApi'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import EmptyState from '../../../components/common/EmptyState'
import TableSkeleton from '../../../components/common/TableSkeleton'
import { fecha, money, pct, Pestanas } from './licUtils'
import FichaEditable, { EtiquetaEdicion, VerArchivados } from './FichaEditable'
import type { EntidadLic } from './licEsquemas'

const ESTADO_CONTRATO: Record<string, string> = {
  vigente: 'Vigente',
  culminado: 'Culminado',
  en_liquidacion: 'En liquidación',
}

const VERIFICADO: Record<string, { t: string; c: string }> = {
  si: { t: '✔ Verificada', c: 'text-emerald-300' },
  no: { t: '✖ No coincide', c: 'text-red-300' },
}

function pctFacturado(c: LicContrato): number | null {
  const base = Number(c.monto_adjudicado) || Number(c.monto_contrato) || 0
  const facturado = Number(c.facturado) || 0
  if (!base) return null
  return Math.round((facturado / base) * 1000) / 10
}

// Ficha abierta en el panel lateral (contrato o factura; fila null = crear)
interface FichaAbierta {
  entidad: EntidadLic
  fila: Record<string, unknown> | null
  inicial?: Record<string, unknown>
  clavesFijas?: string[]
  titulo?: string
}

export default function LicContratosPage() {
  const [lista, setLista] = useState<LicContrato[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [archivados, setArchivados] = useState(false)
  const [ficha, setFicha] = useState<FichaAbierta | null>(null)

  const cargar = async () => {
    setCargando(true)
    setError('')
    const r = await api.licContratos({ archivados })
    setCargando(false)
    if (r.success && r.data) setLista(r.data)
    else setError(r.error || 'Error desconocido')
  }

  useEffect(() => { cargar() }, [archivados]) // eslint-disable-line react-hooks/exhaustive-deps

  const guardado = () => {
    setFicha(null)
    cargar()
  }

  return (
    <AdminLayout>
      <Pestanas grupo="carpeta" />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <FaFileContract className="text-accent-electric" /> Contratos y facturación
            </h1>
            <p className="text-primary-400">Contratos firmados, cuánto se facturó de cada uno y sus documentos.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <VerArchivados activo={archivados} onChange={setArchivados} />
            <button onClick={() => setFicha({ entidad: 'contratos', fila: null })} className="btn-primary flex items-center gap-2">
              <FaPlus /> Agregar contrato
            </button>
          </div>
        </div>

        {cargando ? (
          <TableSkeleton rows={5} cols={7} />
        ) : error ? (
          <ErrorCarga que="los contratos" error={error} onReintentar={cargar} />
        ) : lista.length === 0 ? (
          <EmptyState icon={<FaFileContract />} title="Todavía no hay contratos" hint="Se llenan al importar contratos.json y facturas.json desde el vault, o con 'Agregar contrato'." />
        ) : (
          <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-800 text-left text-primary-400">
                  <th className="px-4 py-3 font-medium">Contrato</th>
                  <th className="px-4 py-3 font-medium">Licitación</th>
                  <th className="px-4 py-3 font-medium text-right">Monto del contrato</th>
                  <th className="px-4 py-3 font-medium text-right">Facturado</th>
                  <th className="px-4 py-3 font-medium text-right">% facturado</th>
                  <th className="px-4 py-3 font-medium text-right">Facturas</th>
                  <th className="px-4 py-3 font-medium text-right">Docs.</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-800/60">
                {lista.map((c) => {
                  const abierto = expandido === c.contrato
                  const pf = pctFacturado(c)
                  const facturado = c.facturado !== '' && c.facturado != null
                    ? c.facturado
                    : c.facturas.reduce((a, f) => a + (Number(f.monto) || 0), 0)
                  return (
                    <Fragment key={c.contrato}>
                      <tr
                        className={`hover:bg-primary-800/30 transition-colors cursor-pointer ${c.archivado ? 'opacity-60' : ''} ${c.en_seace_telcom === false ? 'bg-amber-500/5' : ''}`}
                        onClick={() => setExpandido(abierto ? null : c.contrato)}
                      >
                        <td className="px-4 py-3">
                          <p className="text-white font-mono text-xs">{c.contrato}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {c.estado && <span className="text-[10px] text-primary-300">{ESTADO_CONTRATO[c.estado] || c.estado}</span>}
                            <EtiquetaEdicion fila={c as unknown as Record<string, unknown>} />
                          </div>
                          {c.en_seace_telcom === false && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-amber-300" title="Experiencia fuera del SEACE de Telcom">
                              <FaExclamationTriangle /> Fuera del SEACE Telcom
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-primary-300 font-mono text-xs">{c.proceso || '—'}</td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">
                          {money(c.monto_contrato)} / {money(c.monto_adjudicado)}
                        </td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{money(facturado)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {pf === null ? '—' : <span className={pf >= 90 ? 'text-emerald-400' : pf >= 50 ? 'text-amber-300' : 'text-primary-300'}>{pct(pf)}</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{c.n_facturas || c.facturas.length}</td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{c.documentos || '—'}</td>
                        <td className="px-4 py-3 text-right text-primary-500">{abierto ? <FaChevronUp /> : <FaChevronDown />}</td>
                      </tr>
                      {abierto && (
                        <tr className="bg-primary-950/50">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
                              <div>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500">
                                    Facturas ({c.facturas.length})
                                  </p>
                                  <button
                                    onClick={() => setFicha({
                                      entidad: 'facturas', fila: null, inicial: { contrato: c.contrato }, clavesFijas: ['contrato'],
                                      titulo: `Factura del contrato ${c.contrato}`,
                                    })}
                                    className="px-2.5 py-1 text-xs bg-accent-energy text-[#111827] font-semibold inline-flex items-center gap-1.5"
                                  >
                                    <FaPlus className="text-[10px]" /> Agregar factura
                                  </button>
                                </div>
                                {c.facturas.length === 0 ? (
                                  <p className="text-primary-600 text-sm">Sin facturas registradas para este contrato.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {c.facturas.map((f) => {
                                      const v = VERIFICADO[f.verificado]
                                      return (
                                        <div key={f.numero} className={`flex flex-wrap items-center gap-3 p-2.5 rounded-lg border border-primary-800 bg-primary-900/40 text-xs ${f.archivado ? 'opacity-60' : ''}`}>
                                          <span className="font-mono text-white w-24 shrink-0">{f.numero}</span>
                                          <span className="text-primary-400 w-24 shrink-0">{fecha(f.fecha)}</span>
                                          <span className="text-primary-200 tabular-nums w-28 shrink-0">{money(f.monto)}</span>
                                          <span className={`w-24 shrink-0 ${v ? v.c : 'text-primary-500'}`}>{v ? v.t : 'Pendiente'}</span>
                                          <span className="flex-1 min-w-[100px] text-primary-400 truncate" title={f.notas}>{f.notas}</span>
                                          <EtiquetaEdicion fila={f as unknown as Record<string, unknown>} />
                                          <button
                                            onClick={() => setFicha({ entidad: 'facturas', fila: f as unknown as Record<string, unknown>, titulo: `Factura ${f.numero}` })}
                                            className="inline-flex items-center gap-1 px-2 py-1 border border-primary-700 text-primary-200 hover:border-accent-energy"
                                          >
                                            <FaPen className="text-[10px]" /> Editar
                                          </button>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500">Datos del contrato</p>
                                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                                  <dt className="text-primary-500">Estado</dt>
                                  <dd className="text-primary-200">{ESTADO_CONTRATO[c.estado] || c.estado || 'Sin definir'}</dd>
                                  <dt className="text-primary-500">Inicio</dt>
                                  <dd className="text-primary-200">{c.fecha_inicio ? fecha(c.fecha_inicio) : '—'}</dd>
                                  <dt className="text-primary-500">Fin</dt>
                                  <dd className="text-primary-200">{c.fecha_fin ? fecha(c.fecha_fin) : '—'}</dd>
                                  <dt className="text-primary-500">Participación</dt>
                                  <dd className="text-primary-200">{c.pct_telcom !== '' && c.pct_telcom != null ? pct(c.pct_telcom) : '—'}</dd>
                                </dl>
                                {c.notas && <p className="text-xs text-primary-300 whitespace-pre-line border-l-2 border-primary-700 pl-2">{c.notas}</p>}
                                <button
                                  onClick={() => setFicha({ entidad: 'contratos', fila: c as unknown as Record<string, unknown>, titulo: `Contrato ${c.contrato}` })}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-energy text-[#111827] font-semibold text-xs"
                                >
                                  <FaPen /> Editar contrato
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ficha && (
        <FichaEditable
          entidad={ficha.entidad}
          fila={ficha.fila}
          inicial={ficha.inicial}
          clavesFijas={ficha.clavesFijas}
          titulo={ficha.titulo}
          onCerrar={() => setFicha(null)}
          onGuardado={guardado}
        />
      )}
    </AdminLayout>
  )
}
