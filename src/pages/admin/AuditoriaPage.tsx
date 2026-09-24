import { Fragment, useEffect, useMemo, useState } from 'react'
import { FaHistory, FaFileExcel, FaSearch, FaChevronDown, FaChevronRight, FaInfoCircle } from 'react-icons/fa'
import AdminLayout from '../../components/admin/AdminLayout'
import ErrorCarga from '../../components/admin/ErrorCarga'
import TableSkeleton from '../../components/common/TableSkeleton'
import { api, RegistroAuditoria } from '../../api/appScriptApi'
import { useToast } from '../../context/ToastContext'
import { exportarExcel } from '../../utils/excel'

// Auditoría (nivel admin). El router del backend registra automáticamente
// toda escritura del panel (auth/admin): quién, qué, cuándo, con qué datos
// (sin contraseñas ni archivos) y el resultado. El kiosko no se audita aquí:
// sus marcas ya quedan con foto y GPS en asistencias_v2.

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function fechaLegible(ts: string): string {
  const d = new Date(ts)
  return isNaN(d.getTime()) ? ts : d.toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function detalleBonito(detalle: string): string {
  try { return JSON.stringify(JSON.parse(detalle), null, 2) } catch { return detalle }
}

const inputCls =
  'w-full px-3 py-2 bg-primary-950/70 border border-primary-700/70 text-white placeholder-primary-500 text-sm focus:outline-none focus:border-accent-electric'

export default function AuditoriaPage() {
  const toast = useToast()
  const hoy = new Date()
  const [desde, setDesde] = useState(isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7)))
  const [hasta, setHasta] = useState(isoLocal(hoy))
  const [usuario, setUsuario] = useState('')
  const [accion, setAccion] = useState('')

  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [cargando, setCargando] = useState(true)
  // Falló la carga ≠ no hay registros (ver ErrorCarga)
  const [errorCarga, setErrorCarga] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    setErrorCarga('')
    const r = await api.getAuditoria({ desde, hasta, usuario: usuario.trim() || undefined, accion: accion || undefined, limite: 500 })
    setCargando(false)
    if (r.success && r.data) setRegistros(r.data)
    else {
      setRegistros([])
      setErrorCarga(r.error || 'Error desconocido')
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar() }, [])

  const acciones = useMemo(() => Array.from(new Set(registros.map((r) => r.accion))).sort(), [registros])

  const exportar = async () => {
    if (!registros.length) return toast.warning('No hay registros para exportar')
    await exportarExcel(`auditoria_${desde}_a_${hasta}`, [{
      nombre: 'Auditoría',
      columnas: [
        { titulo: 'Fecha y hora' }, { titulo: 'Usuario' }, { titulo: 'ID usuario' },
        { titulo: 'Acción' }, { titulo: 'Resultado' }, { titulo: 'Detalle', ancho: 80 },
      ],
      filas: registros.map((r) => [fechaLegible(r.timestamp), r.usuario, r.usuario_id, r.accion, r.resultado, r.detalle]),
    }])
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl">
        <header>
          <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent-electric/80">Sistema</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-3">
            <FaHistory className="text-accent-electric" /> Auditoría
          </h1>
          <p className="text-xs text-primary-400 mt-2 flex items-start gap-2">
            <FaInfoCircle className="mt-0.5 text-accent-electric shrink-0" />
            Registro automático de toda acción que modifica datos desde el panel (quién, qué, cuándo y el resultado).
            El kiosko de asistencia no se registra aquí: sus marcas ya guardan foto y GPS.
          </p>
        </header>

        {/* Filtros */}
        <div className="panel-hud p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <label htmlFor="a-desde" className="block font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mb-1">Desde</label>
            <input id="a-desde" type="date" className={inputCls} value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label htmlFor="a-hasta" className="block font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mb-1">Hasta</label>
            <input id="a-hasta" type="date" className={inputCls} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div>
            <label htmlFor="a-usuario" className="block font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mb-1">Usuario</label>
            <input id="a-usuario" className={inputCls} value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Nombre o ID" />
          </div>
          <div>
            <label htmlFor="a-accion" className="block font-mono text-[10px] tracking-[0.2em] uppercase text-primary-400 mb-1">Acción</label>
            <select id="a-accion" className={inputCls} value={accion} onChange={(e) => setAccion(e.target.value)}>
              <option value="">Todas</option>
              {acciones.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="col-span-2 md:col-span-1 flex gap-2">
            <button onClick={cargar} className="btn-primary btn-hud flex-1 inline-flex items-center justify-center gap-2">
              <FaSearch /> Buscar
            </button>
            <button onClick={exportar} aria-label="Exportar a Excel" title="Exportar a Excel"
              className="px-3 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
              <FaFileExcel />
            </button>
          </div>
        </div>

        {cargando ? (
          <TableSkeleton rows={8} cols={5} />
        ) : errorCarga ? (
          <ErrorCarga que="la auditoría" error={errorCarga} onReintentar={cargar} />
        ) : registros.length === 0 ? (
          <p className="text-primary-400 text-sm py-10 text-center">Sin acciones registradas en este rango.</p>
        ) : (
          <div className="panel-hud overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-800 text-left font-mono text-[10px] tracking-[0.15em] uppercase text-primary-400">
                  <th className="px-3 py-3 w-8" />
                  <th className="px-3 py-3">Fecha y hora</th>
                  <th className="px-3 py-3">Usuario</th>
                  <th className="px-3 py-3">Acción</th>
                  <th className="px-3 py-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => {
                  const esOk = String(r.resultado).toLowerCase() === 'ok'
                  const abiertoAqui = abierto === r.id
                  return (
                    <Fragment key={r.id}>
                      <tr className="border-b border-primary-800/60 hover:bg-primary-900/40 cursor-pointer"
                        onClick={() => setAbierto(abiertoAqui ? null : r.id)} aria-expanded={abiertoAqui}>
                        <td className="px-3 py-2.5 text-primary-500">{abiertoAqui ? <FaChevronDown /> : <FaChevronRight />}</td>
                        <td className="px-3 py-2.5 text-primary-200 whitespace-nowrap">{fechaLegible(r.timestamp)}</td>
                        <td className="px-3 py-2.5 text-white">{r.usuario || r.usuario_id || '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-accent-electric">{r.accion}</td>
                        <td className={`px-3 py-2.5 text-xs font-semibold ${esOk ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {esOk ? 'OK' : r.resultado}
                        </td>
                      </tr>
                      {abiertoAqui && (
                        <tr className="border-b border-primary-800/60 bg-primary-950/60">
                          <td />
                          <td colSpan={4} className="px-3 py-3">
                            <pre className="text-[11px] text-primary-200 whitespace-pre-wrap break-all max-h-80 overflow-y-auto font-mono">
                              {detalleBonito(r.detalle)}
                            </pre>
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
