import { Fragment, useEffect, useState } from 'react'
import { FaUserFriends, FaSearch, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { api, LicCompetidor } from '../../../api/appScriptApi'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import EmptyState from '../../../components/common/EmptyState'
import TableSkeleton from '../../../components/common/TableSkeleton'
import { money, pct } from './licUtils'

export default function LicCompetidoresPage() {
  const [lista, setLista] = useState<LicCompetidor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    setError('')
    const r = await api.licCompetidores()
    setCargando(false)
    if (r.success && r.data) setLista(r.data)
    else setError(r.error || 'Error desconocido')
  }

  useEffect(() => { cargar() }, [])

  const filtrados = lista.filter((c) => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return c.nombre.toLowerCase().includes(q) || c.ruc.includes(q)
  })

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <FaUserFriends className="text-accent-electric" /> Competencia
          </h1>
          <p className="text-primary-400">Empresas que se presentaron en las mismas licitaciones que nosotros.</p>
        </div>

        {!cargando && !error && lista.length > 0 && (
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por razón social o RUC…"
              className="w-full pl-10 pr-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
            />
          </div>
        )}

        {cargando ? (
          <TableSkeleton rows={6} cols={5} />
        ) : error ? (
          <ErrorCarga que="los competidores" error={error} onReintentar={cargar} />
        ) : lista.length === 0 ? (
          <EmptyState icon={<FaUserFriends />} title="Todavía no hay competidores importados" hint="Se calculan al importar los procesos y postores desde el vault." />
        ) : filtrados.length === 0 ? (
          <EmptyState icon={<FaSearch />} title="Sin coincidencias" hint="Prueba limpiar la búsqueda." />
        ) : (
          <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-800 text-left text-primary-400">
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">RUC</th>
                  <th className="px-4 py-3 font-medium text-right">Licitaciones</th>
                  <th className="px-4 py-3 font-medium text-right">Ganados</th>
                  <th className="px-4 py-3 font-medium text-right" title="Su oferta promedio como % del precio base">Ofertan en promedio</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-800/60">
                {filtrados.map((c) => {
                  const abierto = expandido === c.ruc
                  return (
                    <Fragment key={c.ruc}>
                      <tr className="hover:bg-primary-800/30 transition-colors cursor-pointer" onClick={() => setExpandido(abierto ? null : c.ruc)}>
                        <td className="px-4 py-3 text-white">{c.nombre}</td>
                        <td className="px-4 py-3 text-primary-300 font-mono text-xs">{c.ruc}</td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{c.n_procesos}</td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{c.ganados}</td>
                        <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{pct(c.pct_vr_promedio)}</td>
                        <td className="px-4 py-3 text-right text-primary-500">{abierto ? <FaChevronUp /> : <FaChevronDown />}</td>
                      </tr>
                      {abierto && (
                        <tr className="bg-primary-950/50">
                          <td colSpan={6} className="px-4 py-4">
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
                                  <ul className="space-y-1 text-primary-300">{c.ofertas.map((o, i) => <li key={i}>{money(o)}</li>)}</ul>
                                ) : <p className="text-primary-600">—</p>}
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
