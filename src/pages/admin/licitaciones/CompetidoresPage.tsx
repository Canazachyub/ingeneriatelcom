import { Fragment, useEffect, useState } from 'react'
import { FaUserFriends, FaSearch, FaChevronDown, FaChevronUp, FaPlus, FaPen } from 'react-icons/fa'
import { api, LicCompetidor } from '../../../api/appScriptApi'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import EmptyState from '../../../components/common/EmptyState'
import TableSkeleton from '../../../components/common/TableSkeleton'
import { money, pct } from './licUtils'
import FichaEditable, { EtiquetaEdicion, VerArchivados } from './FichaEditable'

const AMENAZA: Record<string, { t: string; c: string }> = {
  alta: { t: 'Muy fuerte', c: 'bg-red-500/15 text-red-300 border-red-500/40' },
  media: { t: 'Normal', c: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  baja: { t: 'Débil', c: 'bg-green-500/15 text-green-300 border-green-500/40' },
}

// Qué ficha está abierta: nueva (null) o la de un competidor
type Abierta = { fila: LicCompetidor | null; inicial?: Record<string, unknown>; clavesFijas?: string[] } | null

export default function LicCompetidoresPage() {
  const [lista, setLista] = useState<LicCompetidor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [archivados, setArchivados] = useState(false)
  const [ficha, setFicha] = useState<Abierta>(null)

  const cargar = async () => {
    setCargando(true)
    setError('')
    const r = await api.licCompetidores({ archivados })
    setCargando(false)
    if (r.success && r.data) setLista(r.data)
    else setError(r.error || 'Error desconocido')
  }

  useEffect(() => { cargar() }, [archivados]) // eslint-disable-line react-hooks/exhaustive-deps

  // Los que solo salen de los postores no tienen ficha propia: al "editar" se crea
  const editar = (c: LicCompetidor) => {
    if (c.origen === 'postores') setFicha({ fila: null, inicial: { ruc: c.ruc, nombre: c.nombre }, clavesFijas: ['ruc'] })
    else setFicha({ fila: c })
  }

  const filtrados = lista.filter((c) => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (c.nombre || '').toLowerCase().includes(q) || String(c.ruc).includes(q) || (c.zona || '').toLowerCase().includes(q)
  })

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <FaUserFriends className="text-accent-electric" /> Competencia
            </h1>
            <p className="text-primary-400">Empresas que se presentan contra nosotros. Anota lo que sabes de cada una.</p>
          </div>
          <button onClick={() => setFicha({ fila: null })} className="btn-primary flex items-center gap-2 shrink-0">
            <FaPlus /> Agregar competidor
          </button>
        </div>

        {!cargando && !error && (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por razón social, RUC o zona…"
                className="w-full pl-10 pr-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
              />
            </div>
            <VerArchivados activo={archivados} onChange={setArchivados} />
          </div>
        )}

        {cargando ? (
          <TableSkeleton rows={6} cols={5} />
        ) : error ? (
          <ErrorCarga que="los competidores" error={error} onReintentar={cargar} />
        ) : lista.length === 0 ? (
          <EmptyState icon={<FaUserFriends />} title="Todavía no hay competidores" hint="Se calculan de los postores de cada licitación, o agrégalos con el botón 'Agregar competidor'." />
        ) : filtrados.length === 0 ? (
          <EmptyState icon={<FaSearch />} title="Sin coincidencias" hint="Prueba limpiar la búsqueda." />
        ) : (
          <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-800 text-left text-primary-400">
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">RUC</th>
                  <th className="px-4 py-3 font-medium">¿Qué tan fuerte?</th>
                  <th className="px-4 py-3 font-medium text-right">Licitaciones</th>
                  <th className="px-4 py-3 font-medium text-right">Ganados</th>
                  <th className="px-4 py-3 font-medium text-right" title="Su oferta promedio como % del precio base">Ofertan en promedio</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-800/60">
                {filtrados.map((c) => {
                  const abierto = expandido === c.ruc
                  const am = c.amenaza ? AMENAZA[c.amenaza] : null
                  return (
                    <Fragment key={c.ruc}>
                      <tr className={`hover:bg-primary-800/30 transition-colors cursor-pointer ${c.archivado ? 'opacity-60' : ''}`} onClick={() => setExpandido(abierto ? null : c.ruc)}>
                        <td className="px-4 py-3 text-white">
                          <span>{c.nombre}</span>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {c.zona && <span className="text-xs text-primary-400">{c.zona}</span>}
                            <EtiquetaEdicion fila={c as unknown as Record<string, unknown>} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-primary-300 font-mono text-xs">{c.ruc}</td>
                        <td className="px-4 py-3">
                          {am ? <span className={`px-2 py-0.5 text-xs border whitespace-nowrap ${am.c}`}>{am.t}</span> : <span className="text-primary-600 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{c.n_procesos}</td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{c.ganados}</td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{pct(c.pct_vr_promedio)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); editar(c) }}
                            className="px-3 py-1.5 mr-3 text-xs border border-primary-700 text-primary-200 hover:border-accent-energy inline-flex items-center gap-1.5"
                          >
                            <FaPen className="text-[10px]" /> Editar
                          </button>
                          <span className="text-primary-500 inline-block align-middle">{abierto ? <FaChevronUp /> : <FaChevronDown />}</span>
                        </td>
                      </tr>
                      {abierto && (
                        <tr className="bg-primary-950/50">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500 mb-1.5">Entidades</p>
                                {c.entidades.length ? (
                                  <ul className="space-y-1 text-primary-300">{c.entidades.map((en) => <li key={en}>{en}</li>)}</ul>
                                ) : <p className="text-primary-600">—</p>}
                              </div>
                              <div>
                                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500 mb-1.5">Procesos en común</p>
                                {c.procesos.length ? (
                                  <ul className="space-y-1 text-primary-300 font-mono text-xs">{c.procesos.map((p) => <li key={p}>{p}</li>)}</ul>
                                ) : <p className="text-primary-600">—</p>}
                              </div>
                              <div>
                                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500 mb-1.5">Ofertas registradas</p>
                                {c.ofertas.length ? (
                                  <ul className="space-y-1.5 text-primary-300">
                                    {c.ofertas.map((o, i) => (
                                      <li key={i}>
                                        <b className="text-white tabular-nums">{money(o.monto)}</b>
                                        {o.pct_vr !== null && o.pct_vr !== undefined && <span className="text-primary-400"> · {pct(o.pct_vr)} del precio base</span>}
                                        <span className="block font-mono text-[11px] text-primary-500">{o.proceso}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : <p className="text-primary-600">—</p>}
                              </div>
                            </div>
                            {(c.fortalezas || c.contacto || c.telefono || c.notas) && (
                              <div className="grid sm:grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-primary-800">
                                {c.fortalezas && (
                                  <div className="sm:col-span-2">
                                    <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500 mb-1.5">Cómo compite</p>
                                    <p className="text-primary-200 whitespace-pre-line">{c.fortalezas}</p>
                                  </div>
                                )}
                                {(c.contacto || c.telefono) && (
                                  <div>
                                    <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500 mb-1.5">Contacto</p>
                                    <p className="text-primary-200">{c.contacto}{c.telefono ? ` · ${c.telefono}` : ''}</p>
                                  </div>
                                )}
                                {c.notas && (
                                  <div className="sm:col-span-3">
                                    <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500 mb-1.5">Notas</p>
                                    <p className="text-primary-200 whitespace-pre-line">{c.notas}</p>
                                  </div>
                                )}
                              </div>
                            )}
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
          entidad="competidores"
          fila={ficha.fila as unknown as Record<string, unknown> | null}
          inicial={ficha.inicial}
          clavesFijas={ficha.clavesFijas}
          titulo={ficha.inicial ? String(ficha.inicial.nombre || '') : undefined}
          onCerrar={() => setFicha(null)}
          onGuardado={() => { setFicha(null); cargar() }}
        />
      )}
    </AdminLayout>
  )
}
