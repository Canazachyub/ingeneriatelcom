import {
  FaChevronDown, FaChevronRight, FaCheckCircle, FaPen, FaClock, FaHourglassHalf, FaPrint,
} from 'react-icons/fa'
import { ConfigPlanilla, formatoSoles, valorDia, valorMinuto, descuentoIncidencia, SueldoTrabajador } from '../../../utils/planilla'
import { Fila, TIPO_LABELS, ESTADO_BADGE, ESTADO_LABELS } from './planilla.types'

interface SueldosTableProps {
  filas: Fila[]
  config: ConfigPlanilla
  esMesActual: boolean
  totalProyectado: number
  expanded: string | null
  setExpanded: (dni: string | null) => void
  editandoSueldo: string | null
  setEditandoSueldo: (dni: string | null) => void
  sueldoDraft: string
  setSueldoDraft: (v: string) => void
  guardarSueldo: (dni: string) => void
  abrirRevision: (inc: Fila['incMes'][number]) => void
  onAbrir5pm: (trabajador: SueldoTrabajador) => void
  onAbrirMuestreo: (trabajador: SueldoTrabajador) => void
  imprimirTrabajador: (fila: Fila) => void
}

export default function SueldosTable({
  filas, config, esMesActual, totalProyectado, expanded, setExpanded,
  editandoSueldo, setEditandoSueldo, sueldoDraft, setSueldoDraft, guardarSueldo,
  abrirRevision, onAbrir5pm, onAbrirMuestreo, imprimirTrabajador,
}: SueldosTableProps) {
  return (
    <div className="bg-primary-900/60 border border-primary-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b border-primary-800 bg-primary-950/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Trabajador</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sueldo</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tard.</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Min.</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">F. inj.</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">F. jus.</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Omis.</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">S. ant.</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Bolsa 5pm</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Descuento ref. (aprox.)
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Alerta</th>
              <th className="px-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-800/60">
            {filas.map((f) => {
              const abierto = expanded === f.trabajador.dni
              return (
                <>
                  <tr
                    key={f.trabajador.dni}
                    onClick={() => setExpanded(abierto ? null : f.trabajador.dni)}
                    className="hover:bg-primary-800/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white leading-tight">{f.trabajador.nombre}</div>
                      <div className="text-gray-500 text-xs">{f.trabajador.cargo}</div>
                      {f.trabajador.email && (
                        <div className="text-primary-500 text-[11px] truncate max-w-[220px]">{f.trabajador.email}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {f.trabajador.usa_rmv ? (
                        <span
                          className="text-gray-300 inline-flex items-center gap-1.5"
                          title="Gana la RMV: se ajusta automáticamente con el parámetro rmv de la configuración"
                        >
                          {formatoSoles(f.sueldo)}
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-electric/15 text-accent-electric font-bold">RMV</span>
                        </span>
                      ) : editandoSueldo === f.trabajador.dni ? (
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            value={sueldoDraft}
                            onChange={(e) => setSueldoDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && guardarSueldo(f.trabajador.dni)}
                            className="w-20 px-2 py-1 bg-primary-950 border border-accent-electric rounded text-white text-xs text-center"
                            autoFocus
                          />
                          <button onClick={() => guardarSueldo(f.trabajador.dni)} className="text-emerald-400 text-xs"><FaCheckCircle /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditandoSueldo(f.trabajador.dni); setSueldoDraft(String(f.sueldo)) }}
                          className="text-gray-300 hover:text-white inline-flex items-center gap-1.5 group"
                        >
                          {formatoSoles(f.sueldo)}
                          <FaPen className="text-[9px] text-gray-600 group-hover:text-accent-electric" />
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={f.resumen.tardanzas > 0 ? 'text-amber-400 font-bold' : 'text-gray-600'}>{f.resumen.tardanzas}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-300">{f.resumen.minutosAcumulados}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={f.resumen.faltasInjustificadas > 0 ? 'text-rose-400 font-bold' : 'text-gray-600'}>{f.resumen.faltasInjustificadas}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={f.resumen.faltasJustificadas > 0 ? 'text-emerald-400 font-bold' : 'text-gray-600'}>{f.resumen.faltasJustificadas}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={f.resumen.omisiones > 0 ? 'text-orange-400 font-bold' : 'text-gray-600'}>{f.resumen.omisiones}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={f.resumen.salidasAnticipadas > 0 ? 'text-rose-400 font-bold' : 'text-gray-600'}>{f.resumen.salidasAnticipadas}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={f.bolsa > 0 ? 'text-accent-electric font-bold' : 'text-gray-600'}>
                        {f.bolsa > 0 ? `${f.bolsa.toFixed(1)}h` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold text-white">{formatoSoles(f.resumen.descuentoProyectado)}</div>
                      {f.resumen.pendientes > 0 && (
                        <div className="text-[10px] text-amber-400">
                          incluye {f.resumen.pendientes} pendiente{f.resumen.pendientes !== 1 ? 's' : ''} de sustento
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {f.disciplina.etiqueta && (
                        <span className="inline-block text-xs px-2.5 py-1 rounded-full font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                          {f.disciplina.etiqueta}
                        </span>
                      )}
                      {f.disciplina.alertas.map((a) => (
                        <span key={a} className="inline-block text-[10px] px-2 py-0.5 mt-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 whitespace-nowrap">
                          {a}
                        </span>
                      ))}
                    </td>
                    <td className="px-2 text-gray-500">
                      {abierto ? <FaChevronDown className="text-xs" /> : <FaChevronRight className="text-xs" />}
                    </td>
                  </tr>

                  {/* Detalle expandible */}
                  {abierto && (
                    <tr key={f.trabajador.dni + '-det'}>
                      <td colSpan={12} className="px-4 py-4 bg-primary-950/50">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <p className="text-xs text-gray-400">
                            Valor día: <strong className="text-white">{formatoSoles(valorDia(f.sueldo, config))}</strong> ·
                            Valor minuto: <strong className="text-white">S/ {valorMinuto(f.sueldo, config).toFixed(4)}</strong> ·
                            Disciplina trimestre: <strong className="text-white">{f.disciplina.faltasDisciplinarias} falta(s)</strong> ·
                            Bolsa 5pm: <strong className="text-accent-electric">{f.bolsa.toFixed(2)}h</strong>
                            {f.trabajador.fecha_inicio && <> · Inicio: <strong className="text-white">{f.trabajador.fecha_inicio}</strong></>}
                          </p>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => onAbrir5pm(f.trabajador)}
                              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline"
                            >
                              <FaClock className="text-[10px]" /> Autorizar salida 5pm
                            </button>
                            <button
                              onClick={() => onAbrirMuestreo(f.trabajador)}
                              disabled={f.bolsa <= 0}
                              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline disabled:opacity-40 disabled:no-underline"
                              title={f.bolsa <= 0 ? 'Sin horas en bolsa' : 'Registrar horas de muestreo ELSE'}
                            >
                              <FaHourglassHalf className="text-[10px]" /> Muestreo ELSE
                            </button>
                            <button
                              onClick={() => imprimirTrabajador(f)}
                              className="inline-flex items-center gap-1.5 text-xs text-accent-electric hover:underline"
                            >
                              <FaPrint className="text-[10px]" /> Imprimir / PDF
                            </button>
                          </div>
                        </div>
                        {f.incMes.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">Sin incidencias este mes ✓</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 border-b border-primary-800">
                                <th className="text-left py-2 pr-3">Fecha</th>
                                <th className="text-left py-2 pr-3">Tipo</th>
                                <th className="text-left py-2 pr-3">Evento</th>
                                <th className="text-center py-2 pr-3">Min.</th>
                                <th className="text-left py-2 pr-3">Estado</th>
                                <th className="text-right py-2 pr-3">Descuento parcial</th>
                                <th className="text-left py-2 pr-3">Nota / sustento</th>
                                <th className="py-2" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-primary-800/40">
                              {[...f.incMes].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))).map((inc) => (
                                <tr key={inc.id}>
                                  <td className="py-2 pr-3 text-gray-300">{inc.fecha}</td>
                                  <td className="py-2 pr-3">
                                    <span className="text-white">{TIPO_LABELS[inc.tipo] || inc.tipo}</span>
                                    {inc.grave === true && (
                                      <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">GRAVE</span>
                                    )}
                                  </td>
                                  <td className="py-2 pr-3 text-gray-500">{inc.evento || '—'}</td>
                                  <td className="py-2 pr-3 text-center text-gray-300">{inc.minutos ?? '—'}</td>
                                  <td className="py-2 pr-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ESTADO_BADGE[inc.estado]}`}>
                                      {ESTADO_LABELS[inc.estado]}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-3 text-right font-mono text-white">
                                    {inc.estado === 'justificada'
                                      ? <span className="text-emerald-400">S/ 0.00</span>
                                      : formatoSoles(descuentoIncidencia(inc, f.sueldo, config))}
                                  </td>
                                  <td className="py-2 pr-3 text-gray-500 max-w-[180px] truncate">
                                    {inc.sustento_url ? (
                                      <a href={inc.sustento_url} target="_blank" rel="noopener noreferrer" className="text-accent-electric hover:underline">Ver sustento</a>
                                    ) : (inc.nota || '—')}
                                  </td>
                                  <td className="py-2 text-right">
                                    <button
                                      onClick={() => abrirRevision(inc)}
                                      className="text-xs px-3 py-1 rounded-lg bg-primary-800 text-primary-200 hover:bg-accent-electric/20 hover:text-accent-electric transition-colors"
                                    >
                                      Revisar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-primary-700 bg-primary-950/70">
              <td colSpan={9} className="px-4 py-3 text-right text-xs text-gray-400 uppercase tracking-wider font-semibold">
                Total {esMesActual ? 'proyectado al cierre' : 'del mes'}
              </td>
              <td className="px-4 py-3 text-right font-bold text-accent-electric text-base">
                {formatoSoles(totalProyectado)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-primary-800 text-[11px] text-gray-500 leading-relaxed">
        DESCUENTO REFERENCIAL (aprox.) — el sistema no descuenta automáticamente; solo calcula y muestra.
        El descuento nunca excede el tiempo no laborado. Fórmula: valor_día = sueldo/{config.divisor_mes} ·
        valor_hora = valor_día/{config.jornada_horas} · valor_minuto = valor_hora/60. Falta injustificada =
        valor_día × {(1 + config.factor_descanso_semanal).toFixed(1)} (D. Leg. 713). Los cambios de estado quedan en el log de auditoría.
      </div>
    </div>
  )
}
