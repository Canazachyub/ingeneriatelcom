import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaGavel, FaSearch, FaChevronRight } from 'react-icons/fa'
import { api, LicProceso } from '../../../api/appScriptApi'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import EmptyState from '../../../components/common/EmptyState'
import TableSkeleton from '../../../components/common/TableSkeleton'
import { money, pct, ResultadoBadge, Pestanas } from './licUtils'

export default function LicProcesosPage() {
  const [lista, setLista] = useState<LicProceso[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroAnio, setFiltroAnio] = useState('')
  const [filtroEntidad, setFiltroEntidad] = useState('')
  const [filtroResultado, setFiltroResultado] = useState('')

  const cargar = async () => {
    setCargando(true)
    setError('')
    const r = await api.licProcesos()
    setCargando(false)
    if (r.success && r.data) setLista(r.data)
    else setError(r.error || 'Error desconocido')
  }

  useEffect(() => { cargar() }, [])

  const anios = useMemo(() => Array.from(new Set(lista.map((p) => p.anio).filter(Boolean))).sort().reverse(), [lista])
  const entidades = useMemo(() => Array.from(new Set(lista.map((p) => p.entidad).filter(Boolean))).sort(), [lista])
  const resultados = useMemo(() => Array.from(new Set(lista.map((p) => p.resultado).filter(Boolean))).sort(), [lista])

  const filtrados = lista.filter((p) => {
    if (filtroAnio && p.anio !== filtroAnio) return false
    if (filtroEntidad && p.entidad !== filtroEntidad) return false
    if (filtroResultado && p.resultado !== filtroResultado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!p.nomenclatura.toLowerCase().includes(q) && !(p.objeto || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <AdminLayout>
      <Pestanas grupo="licitaciones" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <FaGavel className="text-accent-electric" /> Lista de licitaciones
          </h1>
          <p className="text-primary-400">Todas las licitaciones en las que participamos o que seguimos. Haz clic en una para ver el detalle.</p>
        </div>

        {!cargando && !error && lista.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nomenclatura u objeto…"
                className="w-full pl-10 pr-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
              />
            </div>
            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
            >
              <option value="">Todos los años</option>
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={filtroEntidad}
              onChange={(e) => setFiltroEntidad(e.target.value)}
              className="px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric max-w-[220px]"
            >
              <option value="">Todas las entidades</option>
              {entidades.map((en) => <option key={en} value={en}>{en}</option>)}
            </select>
            <select
              value={filtroResultado}
              onChange={(e) => setFiltroResultado(e.target.value)}
              className="px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
            >
              <option value="">Todos los resultados</option>
              {resultados.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
          </div>
        )}

        {cargando ? (
          <TableSkeleton rows={6} cols={6} />
        ) : error ? (
          <ErrorCarga que="los procesos" error={error} onReintentar={cargar} />
        ) : lista.length === 0 ? (
          <EmptyState
            icon={<FaGavel />}
            title="Todavía no hay procesos importados"
            hint="Impórtalos desde Licitaciones → Indicadores con los JSON que exporta el vault."
          />
        ) : filtrados.length === 0 ? (
          <EmptyState icon={<FaSearch />} title="Sin coincidencias" hint="Prueba limpiar los filtros." />
        ) : (
          <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-800 text-left text-primary-400">
                  <th className="px-4 py-3 font-medium">Licitación</th>
                  <th className="px-4 py-3 font-medium">Año</th>
                  <th className="px-4 py-3 font-medium">Entidad</th>
                  <th className="px-4 py-3 font-medium text-right" title="Valor referencial: el presupuesto que fija la entidad">Precio base</th>
                  <th className="px-4 py-3 font-medium text-right" title="Nuestra oferta como % del precio base">Nuestra oferta</th>
                  <th className="px-4 py-3 font-medium">Resultado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-800/60">
                {filtrados.map((p) => (
                  <tr key={p.nomenclatura} className="hover:bg-primary-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/admin/licitaciones/procesos/${encodeURIComponent(p.nomenclatura)}`} className="text-white font-mono text-xs hover:text-accent-electric">
                        {p.nomenclatura}
                      </Link>
                      <p className="text-primary-500 text-xs mt-0.5 max-w-xs truncate">{p.objeto}</p>
                    </td>
                    <td className="px-4 py-3 text-primary-300">{p.anio}</td>
                    <td className="px-4 py-3 text-primary-300 max-w-[220px] truncate" title={p.entidad}>{p.entidad}</td>
                    <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{money(p.vr)}</td>
                    <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{pct(p.nuestro_pct_vr)}</td>
                    <td className="px-4 py-3"><ResultadoBadge resultado={p.resultado} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/licitaciones/procesos/${encodeURIComponent(p.nomenclatura)}`} className="text-primary-500 hover:text-accent-electric">
                        <FaChevronRight />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
