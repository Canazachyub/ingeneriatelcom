import { useEffect, useState } from 'react'
import { FaAward } from 'react-icons/fa'
import { api, LicExperiencia } from '../../../api/appScriptApi'
import AdminLayout from '../../../components/admin/AdminLayout'
import ErrorCarga from '../../../components/admin/ErrorCarga'
import EmptyState from '../../../components/common/EmptyState'
import TableSkeleton from '../../../components/common/TableSkeleton'
import { fecha, money, pct, Pestanas } from './licUtils'

function EstadoBadge({ estado }: { estado: string }) {
  const e = (estado || '').toLowerCase()
  if (e.indexOf('ejecuci') >= 0) return <span className="px-2 py-1 rounded-full text-xs bg-sky-500/20 text-sky-300">En ejecución</span>
  if (e === 'culminado') return <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300">Culminado</span>
  return <span className="px-2 py-1 rounded-full text-xs bg-primary-700/40 text-primary-300">{estado || 'Sin definir'}</span>
}

export default function LicExperienciaPage() {
  const [lista, setLista] = useState<LicExperiencia[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = async () => {
    setCargando(true)
    setError('')
    const r = await api.licExperiencia()
    setCargando(false)
    if (r.success && r.data) setLista(r.data)
    else setError(r.error || 'Error desconocido')
  }

  useEffect(() => { cargar() }, [])

  const totalAdjudicado = lista.reduce((acc, e) => acc + (Number(e.monto_adjudicado) || 0), 0)
  const totalAcreditable = lista.reduce((acc, e) => acc + (Number(e.acreditable) || 0), 0)

  return (
    <AdminLayout>
      <Pestanas grupo="carpeta" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <FaAward className="text-accent-electric" /> Experiencia
          </h1>
          <p className="text-primary-400">Lo que podemos declarar como experiencia en una propuesta (contratos y órdenes de servicio).</p>
        </div>

        {cargando ? (
          <TableSkeleton rows={5} cols={6} />
        ) : error ? (
          <ErrorCarga que="la experiencia" error={error} onReintentar={cargar} />
        ) : lista.length === 0 ? (
          <EmptyState icon={<FaAward />} title="Todavía no hay experiencia importada" hint="Se completa al importar experiencia.json desde el vault (skill experiencia-seace)." />
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="panel-hud p-4">
                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500">Contratos</p>
                <p className="text-2xl font-display font-bold text-white mt-1">{lista.length}</p>
              </div>
              <div className="panel-hud p-4">
                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500">Total adjudicado</p>
                <p className="text-2xl font-display font-bold text-white mt-1">{money(totalAdjudicado)}</p>
              </div>
              <div className="panel-hud p-4">
                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary-500">Total acreditable</p>
                <p className="text-2xl font-display font-bold text-white mt-1">{money(totalAcreditable)}</p>
              </div>
            </div>

            <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-800 text-left text-primary-400">
                    <th className="px-4 py-3 font-medium">Licitación</th>
                    <th className="px-4 py-3 font-medium">Entidad</th>
                    <th className="px-4 py-3 font-medium text-right">Monto adjudicado</th>
                    <th className="px-4 py-3 font-medium text-right" title="Nuestra parte cuando fue en consorcio">Nuestra parte</th>
                    <th className="px-4 py-3 font-medium text-right" title="Monto que vale como experiencia">Vale como experiencia</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Contrato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-800/60">
                  {lista.map((e, i) => (
                    <tr key={i} className="hover:bg-primary-800/30 transition-colors">
                      <td className="px-4 py-3 text-white max-w-xs">
                        <p className="font-mono text-xs">{e.proceso}</p>
                        <p className="text-primary-500 text-xs mt-0.5 truncate" title={e.objeto}>{e.objeto}</p>
                      </td>
                      <td className="px-4 py-3 text-primary-300 max-w-[200px] truncate" title={e.entidad}>{e.entidad}</td>
                      <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{money(e.monto_adjudicado)}</td>
                      <td className="px-4 py-3 text-right text-primary-200 tabular-nums">{pct(e.pct_telcom)}</td>
                      <td className="px-4 py-3 text-right text-white font-medium tabular-nums">{money(e.acreditable)}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={e.estado} /></td>
                      <td className="px-4 py-3 text-primary-400 text-xs">{fecha(e.fecha_contrato)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
