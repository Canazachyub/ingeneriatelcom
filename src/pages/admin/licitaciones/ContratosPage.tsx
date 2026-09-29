import { Fragment, useEffect, useState } from 'react'
import { FaFileContract, FaChevronDown, FaChevronUp, FaExclamationTriangle, FaSave, FaSpinner } from 'react-icons/fa'
import { api, LicContrato } from '../../../api/appScriptApi'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import EmptyState from '../../../components/common/EmptyState'
import TableSkeleton from '../../../components/common/TableSkeleton'
import { useToast } from '../../../context/ToastContext'
import { fecha, money, pct, Pestanas } from './licUtils'

const ESTADOS_CONTRATO = [
  { value: '', label: 'Sin definir' },
  { value: 'vigente', label: 'Vigente' },
  { value: 'culminado', label: 'Culminado' },
  { value: 'en_liquidacion', label: 'En liquidación' },
]

function pctFacturado(c: LicContrato): number | null {
  const base = Number(c.monto_adjudicado) || Number(c.monto_contrato) || 0
  const facturado = Number(c.facturado) || 0
  if (!base) return null
  return Math.round((facturado / base) * 1000) / 10
}

export default function LicContratosPage() {
  const toast = useToast()
  const [lista, setLista] = useState<LicContrato[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [estadoEdit, setEstadoEdit] = useState<Record<string, { estado: string; notas: string }>>({})
  const [guardandoContrato, setGuardandoContrato] = useState<string | null>(null)
  const [facturaEdit, setFacturaEdit] = useState<Record<string, { verificado: string; notas: string }>>({})
  const [guardandoFactura, setGuardandoFactura] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    setError('')
    const r = await api.licContratos()
    setCargando(false)
    if (r.success && r.data) setLista(r.data)
    else setError(r.error || 'Error desconocido')
  }

  useEffect(() => { cargar() }, [])

  const valorContrato = (c: LicContrato, campo: 'estado' | 'notas') => estadoEdit[c.contrato]?.[campo] ?? c[campo] ?? ''
  const marcarContrato = (contrato: string, cambios: Partial<{ estado: string; notas: string }>) => {
    setEstadoEdit((prev) => {
      const base = prev[contrato] || { estado: '', notas: '' }
      return { ...prev, [contrato]: { ...base, ...cambios } }
    })
  }
  const guardarContrato = async (c: LicContrato) => {
    const cambios = estadoEdit[c.contrato]
    if (!cambios) return
    setGuardandoContrato(c.contrato)
    const r = await api.licActualizarContrato({ contrato: c.contrato, ...cambios })
    setGuardandoContrato(null)
    if (r.success) {
      setLista((prev) => prev.map((x) => (x.contrato === c.contrato ? { ...x, ...cambios } : x)))
      setEstadoEdit((prev) => { const { [c.contrato]: _q, ...resto } = prev; return resto })
      toast.success('Contrato actualizado')
    } else {
      toast.error(r.error || 'No se pudo guardar')
    }
  }

  const claveFactura = (contrato: string, numero: string) => `${contrato}\u0001${numero}`
  const valorFactura = (contrato: string, numero: string, actual: { verificado: string; notas: string }, campo: 'verificado' | 'notas') =>
    facturaEdit[claveFactura(contrato, numero)]?.[campo] ?? actual[campo] ?? ''
  const marcarFactura = (contrato: string, numero: string, cambios: Partial<{ verificado: string; notas: string }>) => {
    const k = claveFactura(contrato, numero)
    setFacturaEdit((prev) => {
      const base = prev[k] || { verificado: '', notas: '' }
      return { ...prev, [k]: { ...base, ...cambios } }
    })
  }
  const guardarFactura = async (contrato: string, numero: string) => {
    const k = claveFactura(contrato, numero)
    const cambios = facturaEdit[k]
    if (!cambios) return
    setGuardandoFactura(k)
    const r = await api.licActualizarFactura({ contrato, numero, ...cambios })
    setGuardandoFactura(null)
    if (r.success) {
      setLista((prev) => prev.map((c) => (c.contrato !== contrato ? c : {
        ...c,
        facturas: c.facturas.map((f) => (f.numero === numero ? { ...f, ...cambios } : f)),
      })))
      setFacturaEdit((prev) => { const { [k]: _q, ...resto } = prev; return resto })
      toast.success('Factura actualizada')
    } else {
      toast.error(r.error || 'No se pudo guardar')
    }
  }

  return (
    <AdminLayout>
      <Pestanas grupo="carpeta" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <FaFileContract className="text-accent-electric" /> Contratos y facturación
          </h1>
          <p className="text-primary-400">Contratos firmados, cuánto se facturó de cada uno y sus documentos.</p>
        </div>

        {cargando ? (
          <TableSkeleton rows={5} cols={7} />
        ) : error ? (
          <ErrorCarga que="los contratos" error={error} onReintentar={cargar} />
        ) : lista.length === 0 ? (
          <EmptyState icon={<FaFileContract />} title="Todavía no hay contratos importados" hint="Se llena al importar contratos.json y facturas.json desde el vault." />
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
                  return (
                    <Fragment key={c.contrato}>
                      <tr
                        className={`hover:bg-primary-800/30 transition-colors cursor-pointer ${!c.en_seace_telcom ? 'bg-amber-500/5' : ''}`}
                        onClick={() => setExpandido(abierto ? null : c.contrato)}
                      >
                        <td className="px-4 py-3">
                          <p className="text-white font-mono text-xs">{c.contrato}</p>
                          {!c.en_seace_telcom && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-amber-300" title="Experiencia fuera del SEACE de Telcom">
                              <FaExclamationTriangle /> Fuera del SEACE Telcom
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-primary-300 font-mono text-xs">{c.proceso || '—'}</td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">
                          {money(c.monto_contrato)} / {money(c.monto_adjudicado)}
                        </td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{money(c.facturado)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {pf === null ? '—' : <span className={pf >= 90 ? 'text-emerald-400' : pf >= 50 ? 'text-amber-300' : 'text-primary-300'}>{pct(pf)}</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{c.n_facturas || c.facturas.length}</td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{c.documentos}</td>
                        <td className="px-4 py-3 text-right text-primary-500">{abierto ? <FaChevronUp /> : <FaChevronDown />}</td>
                      </tr>
                      {abierto && (
                        <tr className="bg-primary-950/50">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
                              <div>
                                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500 mb-2">
                                  Facturas ({c.facturas.length})
                                </p>
                                {c.facturas.length === 0 ? (
                                  <p className="text-primary-600 text-sm">Sin facturas registradas para este contrato.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {c.facturas.map((f) => {
                                      const k = claveFactura(c.contrato, f.numero)
                                      const tieneCambios = !!facturaEdit[k]
                                      return (
                                        <div key={f.numero} className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg border border-primary-800 bg-primary-900/40 text-xs">
                                          <span className="font-mono text-white w-24 shrink-0">{f.numero}</span>
                                          <span className="text-primary-400 w-24 shrink-0">{fecha(f.fecha)}</span>
                                          <span className="text-primary-200 tabular-nums w-28 shrink-0">{money(f.monto)}</span>
                                          <select
                                            value={valorFactura(c.contrato, f.numero, f, 'verificado')}
                                            onChange={(e) => marcarFactura(c.contrato, f.numero, { verificado: e.target.value })}
                                            className="bg-primary-800 border border-primary-700 rounded px-2 py-1 text-white"
                                          >
                                            <option value="">Pendiente</option>
                                            <option value="si">Verificado</option>
                                            <option value="no">No coincide</option>
                                          </select>
                                          <input
                                            type="text"
                                            value={valorFactura(c.contrato, f.numero, f, 'notas')}
                                            onChange={(e) => marcarFactura(c.contrato, f.numero, { notas: e.target.value })}
                                            placeholder="Notas…"
                                            className="flex-1 min-w-[100px] bg-primary-800 border border-primary-700 rounded px-2 py-1 text-white placeholder-primary-500"
                                          />
                                          {tieneCambios && (
                                            <button
                                              onClick={() => guardarFactura(c.contrato, f.numero)}
                                              disabled={guardandoFactura === k}
                                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accent-electric/20 text-accent-electric hover:bg-accent-electric/30 disabled:opacity-60"
                                            >
                                              {guardandoFactura === k ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                            </button>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500">Seguimiento del contrato</p>
                                <select
                                  value={valorContrato(c, 'estado')}
                                  onChange={(e) => marcarContrato(c.contrato, { estado: e.target.value })}
                                  className="w-full px-3 py-1.5 bg-primary-800 border border-primary-700 rounded-lg text-white text-sm"
                                >
                                  {ESTADOS_CONTRATO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <textarea
                                  value={valorContrato(c, 'notas')}
                                  onChange={(e) => marcarContrato(c.contrato, { notas: e.target.value })}
                                  rows={3}
                                  placeholder="Notas del contrato…"
                                  className="w-full px-3 py-1.5 bg-primary-800 border border-primary-700 rounded-lg text-white text-sm placeholder-primary-500 resize-none"
                                />
                                {!!estadoEdit[c.contrato] && (
                                  <button
                                    onClick={() => guardarContrato(c)}
                                    disabled={guardandoContrato === c.contrato}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-electric/20 text-accent-electric hover:bg-accent-electric/30 text-xs disabled:opacity-60"
                                  >
                                    {guardandoContrato === c.contrato ? <FaSpinner className="animate-spin" /> : <FaSave />} Guardar
                                  </button>
                                )}
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
    </AdminLayout>
  )
}
