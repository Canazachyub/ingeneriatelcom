import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaSpinner, FaSync, FaDownload, FaTimes, FaChevronDown, FaChevronRight,
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaClock, FaCog,
  FaPrint, FaFileInvoiceDollar, FaPen, FaUserPlus, FaHourglassHalf,
} from 'react-icons/fa'
import AdminLayout from '../../components/admin/AdminLayout'
import { api } from '../../api/appScriptApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  ConfigPlanilla, CONFIG_DEFAULT, Incidencia, SueldoTrabajador,
  resumenMensual, calcularDisciplina, descuentoIncidencia, formatoSoles,
  valorDia, valorMinuto, sueldoEfectivo,
} from '../../utils/planilla'

const TIPO_LABELS: Record<string, string> = {
  tardanza: 'Tardanza',
  salida_anticipada: 'Salida anticipada',
  omision: 'Omisión de marcado',
  falta: 'Falta',
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  justificada: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  injustificada: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente de sustento',
  justificada: 'Justificada',
  injustificada: 'Injustificada',
}

const mesActualISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const finDeMes = (mes: string) => {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const inicioTrimestre = (mes: string) => {
  const [y, m] = mes.split('-').map(Number)
  const qm = Math.floor((m - 1) / 3) * 3 + 1
  return `${y}-${String(qm).padStart(2, '0')}-01`
}

const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const nombreMes = (mes: string) => {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
}

export default function PlanillaPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [mes, setMes] = useState(mesActualISO())
  const [config, setConfig] = useState<ConfigPlanilla>(CONFIG_DEFAULT)
  const [sueldos, setSueldos] = useState<SueldoTrabajador[]>([])
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({})
  const [savingConfig, setSavingConfig] = useState(false)

  // Modal revisión de incidencia
  const [revisando, setRevisando] = useState<Incidencia | null>(null)
  const [revEstado, setRevEstado] = useState<'justificada' | 'injustificada'>('justificada')
  const [revNota, setRevNota] = useState('')
  const [revSustento, setRevSustento] = useState('')
  const [guardandoRev, setGuardandoRev] = useState(false)

  // Edición inline de sueldo
  const [editandoSueldo, setEditandoSueldo] = useState<string | null>(null)
  const [sueldoDraft, setSueldoDraft] = useState('')

  // Bolsa de compensación 5pm
  const [bolsaSaldos, setBolsaSaldos] = useState<Record<string, number>>({})
  const [modal5pm, setModal5pm] = useState<SueldoTrabajador | null>(null)
  const [fecha5pm, setFecha5pm] = useState(hoyISO())
  const [nota5pm, setNota5pm] = useState('')
  const [modalMuestreo, setModalMuestreo] = useState<SueldoTrabajador | null>(null)
  const [horasMuestreo, setHorasMuestreo] = useState('')
  const [notaMuestreo, setNotaMuestreo] = useState('')
  const [guardandoBolsa, setGuardandoBolsa] = useState(false)

  // Alta de trabajador
  const [modalNuevo, setModalNuevo] = useState(false)
  const [nuevoDraft, setNuevoDraft] = useState({
    dni: '', nombre: '', cargo: '', sueldo: '', fecha_inicio: hoyISO(), usa_rmv: false, sede: 'Principal', email: '',
  })
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)

  // Solo el Administrador de Planilla (rol admin o permiso 'planilla') ve montos
  const autorizado = !!user && (
    user.role === 'admin' ||
    (user as unknown as { rol?: string }).rol === 'admin' ||
    (user as unknown as { permisos?: string[] }).permisos?.some(p => p === 'all' || p === 'planilla')
  )

  const loadData = async () => {
    setLoading(true)
    const [cfgRes, suelRes, incRes, bolsaRes] = await Promise.all([
      api.getConfigPlanilla(),
      api.getSueldos(),
      api.getIncidencias({ desde: inicioTrimestre(mes), hasta: finDeMes(mes) }),
      api.getBolsaHoras(),
    ])
    if (cfgRes.success && cfgRes.data) {
      setConfig({ ...CONFIG_DEFAULT, ...(cfgRes.data as unknown as Partial<ConfigPlanilla>) })
    }
    if (suelRes.success && suelRes.data) setSueldos(suelRes.data)
    else if (suelRes.error) toast.error(suelRes.error)
    if (incRes.success && incRes.data) setIncidencias(incRes.data as unknown as Incidencia[])
    if (bolsaRes.success && bolsaRes.data) setBolsaSaldos(bolsaRes.data.saldos || {})
    setLoading(false)
  }

  useEffect(() => { loadData() }, [mes])

  const handleSincronizar = async () => {
    setSyncing(true)
    const hasta = finDeMes(mes) < hoyISO() ? finDeMes(mes) : hoyISO()
    const res = await api.sincronizarIncidencias(`${mes}-01`, hasta)
    setSyncing(false)
    if (res.success && res.data) {
      toast.success(`Sincronizado: ${res.data.creadas} incidencias nuevas, ${res.data.expiradas} expiradas a injustificada`)
      loadData()
    } else {
      toast.error('Error: ' + (res.error || 'no se pudo sincronizar'))
    }
  }

  // ── Cálculos ─────────────────────────────────────────────
  const esMesActual = mes === mesActualISO()

  const filas = useMemo(() => {
    return sueldos.map((t) => {
      const sueldo = sueldoEfectivo(t, config)
      const incTrimestre = incidencias.filter((i) => String(i.dni) === t.dni)
      const incMes = incTrimestre.filter((i) => String(i.fecha).slice(0, 7) === mes)
      const resumen = resumenMensual(incMes, sueldo, config)
      const disciplina = calcularDisciplina(incTrimestre)
      return { trabajador: t, sueldo, incMes, resumen, disciplina, bolsa: bolsaSaldos[t.dni] || 0 }
    })
  }, [sueldos, incidencias, mes, config, bolsaSaldos])

  const totalProyectado = filas.reduce((acc, f) => acc + f.resumen.descuentoProyectado, 0)

  // ── Revisión ─────────────────────────────────────────────
  const abrirRevision = (inc: Incidencia) => {
    setRevisando(inc)
    setRevEstado('justificada')
    setRevNota(inc.nota || '')
    setRevSustento(inc.sustento_url || '')
  }

  const guardarRevision = async () => {
    if (!revisando) return
    if (revEstado === 'justificada' && !revNota.trim() && !revSustento.trim()) {
      toast.error('Para justificar se requiere una nota o sustento adjunto')
      return
    }
    setGuardandoRev(true)
    const res = await api.revisarIncidencia({
      id: revisando.id,
      estado: revEstado,
      nota: revNota,
      sustento_url: revSustento,
      revisado_por: user?.name || 'Admin',
    })
    setGuardandoRev(false)
    if (res.success) {
      toast.success(`Incidencia marcada como ${ESTADO_LABELS[revEstado]}`)
      setRevisando(null)
      loadData()
    } else {
      toast.error('Error: ' + res.error)
    }
  }

  const guardarSueldo = async (dni: string) => {
    const nuevo = parseFloat(sueldoDraft)
    if (isNaN(nuevo) || nuevo <= 0) { toast.error('Sueldo inválido'); return }
    const res = await api.updateSueldo(dni, nuevo)
    if (res.success) {
      setSueldos((prev) => prev.map((s) => (s.dni === dni ? { ...s, sueldo: nuevo } : s)))
      toast.success('Sueldo actualizado')
    } else {
      toast.error('Error: ' + res.error)
    }
    setEditandoSueldo(null)
  }

  const autorizar5pmHandler = async () => {
    if (!modal5pm) return
    setGuardandoBolsa(true)
    const res = await api.autorizarSalida5pm({
      dni: modal5pm.dni,
      fecha: fecha5pm,
      autorizado_por: user?.name || 'Coordinador General',
      nota: nota5pm,
    })
    setGuardandoBolsa(false)
    if (res.success) {
      toast.success(`Salida 5pm autorizada para ${modal5pm.nombre} (${fecha5pm}). Sincroniza incidencias para acreditar la bolsa.`)
      setModal5pm(null)
      setNota5pm('')
    } else {
      toast.error('Error: ' + res.error)
    }
  }

  const muestreoHandler = async () => {
    if (!modalMuestreo) return
    const horas = parseFloat(horasMuestreo)
    if (isNaN(horas) || horas <= 0) { toast.error('Horas inválidas'); return }
    setGuardandoBolsa(true)
    const res = await api.registrarMuestreo({
      dni: modalMuestreo.dni,
      horas,
      nota: notaMuestreo || 'Muestreo trimestral ELSE',
      usuario: user?.name || 'Admin',
    })
    setGuardandoBolsa(false)
    if (res.success && res.data) {
      toast.success(`Bolsa descargada: ${res.data.horas_aplicadas}h aplicadas, saldo ${res.data.saldo_restante}h`)
      setModalMuestreo(null)
      setHorasMuestreo('')
      setNotaMuestreo('')
      loadData()
    } else {
      toast.error('Error: ' + res.error)
    }
  }

  const crearTrabajadorHandler = async () => {
    if (!/^\d{8}$/.test(nuevoDraft.dni)) { toast.error('DNI inválido (8 dígitos)'); return }
    if (!nuevoDraft.nombre.trim() || !nuevoDraft.cargo.trim()) { toast.error('Nombre y cargo son obligatorios'); return }
    if (!nuevoDraft.usa_rmv && (isNaN(parseFloat(nuevoDraft.sueldo)) || parseFloat(nuevoDraft.sueldo) <= 0)) {
      toast.error('Sueldo inválido'); return
    }
    setGuardandoNuevo(true)
    const res = await api.crearTrabajador({
      dni: nuevoDraft.dni,
      nombre: nuevoDraft.nombre.trim(),
      cargo: nuevoDraft.cargo.trim(),
      sueldo: parseFloat(nuevoDraft.sueldo) || 0,
      fecha_inicio: nuevoDraft.fecha_inicio,
      usa_rmv: nuevoDraft.usa_rmv,
      sede: nuevoDraft.sede.trim() || 'Principal',
      email: nuevoDraft.email.trim(),
    })
    setGuardandoNuevo(false)
    if (res.success) {
      toast.success('Trabajador creado — el kiosko de asistencia ya lo reconoce')
      setModalNuevo(false)
      setNuevoDraft({ dni: '', nombre: '', cargo: '', sueldo: '', fecha_inicio: hoyISO(), usa_rmv: false, sede: 'Principal', email: '' })
      loadData()
    } else {
      toast.error('Error: ' + res.error)
    }
  }

  const guardarConfig = async () => {
    setSavingConfig(true)
    const res = await api.updateConfigPlanilla(configDraft)
    setSavingConfig(false)
    if (res.success && res.data) {
      setConfig({ ...CONFIG_DEFAULT, ...(res.data as unknown as Partial<ConfigPlanilla>) })
      setShowConfig(false)
      toast.success('Configuración guardada')
      loadData()
    } else {
      toast.error('Error: ' + res.error)
    }
  }

  // ── Exportar ─────────────────────────────────────────────
  const exportarCSV = () => {
    const filasCSV: string[][] = [
      ['Trabajador', 'Cargo', 'Correo', 'Sueldo (S/)', 'Tardanzas', 'Min. acumulados', 'Faltas injust.',
        'Faltas just.', 'Omisiones', 'Salidas antic. s/aut.', 'Bolsa 5pm (h)', 'Pendientes',
        'Descuento confirmado (S/)', 'Descuento proyectado (S/)', 'Alerta disciplinaria'],
      ...filas.map((f) => [
        f.trabajador.nombre, f.trabajador.cargo, f.trabajador.email || '', String(f.sueldo),
        String(f.resumen.tardanzas), String(f.resumen.minutosAcumulados),
        String(f.resumen.faltasInjustificadas), String(f.resumen.faltasJustificadas),
        String(f.resumen.omisiones), String(f.resumen.salidasAnticipadas),
        f.bolsa.toFixed(2), String(f.resumen.pendientes),
        f.resumen.descuentoConfirmado.toFixed(2), f.resumen.descuentoProyectado.toFixed(2),
        f.disciplina.etiqueta || '',
      ]),
      [],
      ['DETALLE DE INCIDENCIAS'],
      ['Trabajador', 'Fecha', 'Tipo', 'Evento', 'Minutos', 'Grave', 'Estado', 'Descuento parcial (S/)', 'Nota'],
      ...filas.flatMap((f) => f.incMes.map((i) => [
        f.trabajador.nombre, String(i.fecha), TIPO_LABELS[i.tipo] || i.tipo, i.evento || '',
        String(i.minutos ?? ''), i.grave ? 'Sí' : 'No', ESTADO_LABELS[i.estado] || i.estado,
        descuentoIncidencia(i, f.sueldo, config).toFixed(2), i.nota || '',
      ])),
    ]
    const csv = filasCSV.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `planilla_${mes}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const imprimirTrabajador = (fila: (typeof filas)[0]) => {
    const { trabajador: t, resumen: r, incMes, disciplina } = fila
    const sueldoT = fila.sueldo
    const filasDetalle = incMes.map((i) => `
      <tr>
        <td>${i.fecha}</td><td>${TIPO_LABELS[i.tipo] || i.tipo}</td>
        <td>${i.evento || '—'}</td><td>${i.minutos ?? '—'}</td>
        <td>${ESTADO_LABELS[i.estado]}</td>
        <td style="text-align:right">${descuentoIncidencia(i, sueldoT, config).toFixed(2)}</td>
        <td>${i.nota || ''}</td>
      </tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Planilla ${t.nombre} — ${mes}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px}
        h1{font-size:16px;margin:0}h2{font-size:13px;margin:16px 0 6px}
        table{border-collapse:collapse;width:100%;margin-top:6px}
        th,td{border:1px solid #999;padding:4px 8px;text-align:left}
        th{background:#eee}.tot{font-weight:bold}
        .disc{color:#b45309;font-weight:bold}
        .nota{margin-top:14px;font-size:10px;color:#555}
      </style></head><body>
      <h1>Ingeniería Telcom EIRL — Resumen de planilla</h1>
      <p><strong>${t.nombre}</strong> · ${t.cargo} · DNI ${t.dni} · Sueldo ${formatoSoles(sueldoT)}${t.usa_rmv ? ' (RMV, ajuste automático)' : ''}<br>
      ${t.email ? `Correo: ${t.email}<br>` : ''}Periodo: ${nombreMes(mes)} · Valor día: ${formatoSoles(valorDia(sueldoT, config))} · Valor minuto: S/ ${valorMinuto(sueldoT, config).toFixed(4)}</p>
      <h2>Resumen</h2>
      <table><tr><th>Tardanzas</th><th>Min. acum.</th><th>Faltas injust.</th><th>Faltas just.</th><th>Omisiones</th><th>Salidas antic. s/aut.</th><th>Bolsa 5pm (h)</th><th>Descuento referencial</th></tr>
      <tr><td>${r.tardanzas}</td><td>${r.minutosAcumulados}</td><td>${r.faltasInjustificadas}</td><td>${r.faltasJustificadas}</td><td>${r.omisiones}</td><td>${r.salidasAnticipadas}</td><td>${fila.bolsa.toFixed(2)}</td><td class="tot">${formatoSoles(r.descuentoProyectado)}</td></tr></table>
      ${disciplina.etiqueta ? `<p class="disc">Alerta disciplinaria: ${disciplina.etiqueta} (${disciplina.faltasDisciplinarias} falta(s) disciplinaria(s) en el trimestre)</p>` : ''}
      <h2>Detalle de incidencias</h2>
      <table><tr><th>Fecha</th><th>Tipo</th><th>Evento</th><th>Min.</th><th>Estado</th><th>Descuento S/</th><th>Nota</th></tr>${filasDetalle || '<tr><td colspan="7">Sin incidencias</td></tr>'}</table>
      <p class="nota">DESCUENTO REFERENCIAL (aprox.) — La planilla oficial la decide el Administrador de Planilla.
      El descuento nunca excede el tiempo no laborado (cláusula 13ª y Anexo 3 del contrato).
      Generado el ${new Date().toLocaleString('es-PE')}.</p>
      <script>window.print()</script></body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  // ── Render ───────────────────────────────────────────────
  if (!autorizado) {
    return (
      <AdminLayout>
        <div className="text-center py-24">
          <FaExclamationTriangle className="text-4xl text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Acceso restringido</h2>
          <p className="text-gray-400 text-sm">
            Esta sección es exclusiva del rol Administrador de Planilla.
          </p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FaFileInvoiceDollar className="text-accent-electric" />
              Resumen de planilla — <span className="capitalize">{nombreMes(mes)}</span>
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {esMesActual ? 'Proyección al cierre (mes en curso)' : 'Cierre de mes'} ·
              DESCUENTO REFERENCIAL (aprox.) — la planilla oficial la decide el administrador
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={mes}
              min="2026-07"
              onChange={(e) => setMes(e.target.value)}
              className="px-3 py-2 bg-primary-900 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric"
            />
            <button
              onClick={handleSincronizar}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-electric/20 border border-accent-electric/40 text-accent-electric rounded-lg text-sm font-medium hover:bg-accent-electric/30 transition-colors disabled:opacity-50"
            >
              {syncing ? <FaSpinner className="animate-spin text-xs" /> : <FaSync className="text-xs" />}
              Sincronizar incidencias
            </button>
            <button
              onClick={exportarCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 border border-primary-800 text-primary-300 rounded-lg text-sm hover:text-white hover:border-accent-electric/50 transition-colors"
            >
              <FaDownload className="text-xs" />
              CSV
            </button>
            <button
              onClick={() => setModalNuevo(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/25 transition-colors"
            >
              <FaUserPlus className="text-xs" />
              Agregar trabajador
            </button>
            <button
              onClick={() => {
                setConfigDraft({
                  ingreso_manana: String(config.ingreso_manana),
                  salida_manana: String(config.salida_manana),
                  ingreso_tarde: String(config.ingreso_tarde),
                  salida_tarde: String(config.salida_tarde),
                  tolerancia_manana_min: String(config.tolerancia_manana_min),
                  tolerancia_tarde_min: String(config.tolerancia_tarde_min),
                  tardanza_grave_min: String(config.tardanza_grave_min),
                  jornada_horas: String(config.jornada_horas),
                  factor_descanso_semanal: String(config.factor_descanso_semanal),
                  plazo_sustento_horas: String(config.plazo_sustento_horas),
                  divisor_mes: String(config.divisor_mes),
                  rmv: String(config.rmv),
                  salida_autorizada: String(config.salida_autorizada),
                })
                setShowConfig(!showConfig)
              }}
              className="inline-flex items-center gap-2 px-3 py-2 bg-primary-900 border border-primary-800 text-primary-300 rounded-lg text-sm hover:text-white transition-colors"
            >
              <FaCog className="text-xs" />
            </button>
          </div>
        </div>

        {/* Config editable */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-primary-900/60 border border-primary-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Configuración de horario y descuentos (cláusula 13ª / Anexo 3)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {([
                    ['ingreso_manana', 'Ingreso mañana'],
                    ['salida_manana', 'Salida mañana'],
                    ['ingreso_tarde', 'Ingreso tarde'],
                    ['salida_tarde', 'Salida tarde'],
                    ['tolerancia_manana_min', 'Tolerancia mañana (min)'],
                    ['tolerancia_tarde_min', 'Tolerancia tarde (min)'],
                    ['tardanza_grave_min', 'Grave desde (min)'],
                    ['jornada_horas', 'Jornada (horas)'],
                    ['factor_descanso_semanal', 'Factor dominical'],
                    ['plazo_sustento_horas', 'Plazo sustento (h)'],
                    ['divisor_mes', 'Divisor mensual'],
                    ['rmv', 'RMV (S/)'],
                    ['salida_autorizada', 'Salida autorizada'],
                  ] as [string, string][]).map(([k, label]) => (
                    <div key={k}>
                      <label className="block text-xs text-primary-400 mb-1">{label}</label>
                      <input
                        value={configDraft[k] ?? ''}
                        onChange={(e) => setConfigDraft((prev) => ({ ...prev, [k]: e.target.value }))}
                        className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-lg text-sm text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-sm text-primary-400 hover:text-white">
                    Cancelar
                  </button>
                  <button
                    onClick={guardarConfig}
                    disabled={savingConfig}
                    className="px-4 py-2 bg-accent-electric/20 border border-accent-electric/40 text-accent-electric rounded-lg text-sm font-medium hover:bg-accent-electric/30 disabled:opacity-50"
                  >
                    {savingConfig ? 'Guardando...' : 'Guardar configuración'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <FaSpinner className="animate-spin text-3xl text-accent-electric" />
          </div>
        )}

        {!loading && sueldos.length === 0 && (
          <div className="text-center py-16 bg-primary-900/60 border border-primary-800 rounded-2xl">
            <FaExclamationTriangle className="text-3xl text-amber-400 mx-auto mb-3" />
            <p className="text-gray-300 font-medium">La hoja de sueldos no existe todavía</p>
            <p className="text-gray-500 text-sm mt-1">Ejecuta <code className="text-accent-electric">setupPlanillaSheets()</code> en el editor de Apps Script y redespliega</p>
          </div>
        )}

        {/* Tabla resumen */}
        {!loading && sueldos.length > 0 && (
          <div className="bg-primary-900/60 border border-primary-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
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
                                    onClick={() => { setModal5pm(f.trabajador); setFecha5pm(hoyISO()) }}
                                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline"
                                  >
                                    <FaClock className="text-[10px]" /> Autorizar salida 5pm
                                  </button>
                                  <button
                                    onClick={() => setModalMuestreo(f.trabajador)}
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
        )}

        {/* ── Modal revisión ── */}
        <AnimatePresence>
          {revisando && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={(e) => { if (e.target === e.currentTarget) setRevisando(null) }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-md shadow-2xl"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-primary-800">
                  <div>
                    <h3 className="font-bold text-white text-sm">Revisar incidencia</h3>
                    <p className="text-xs text-gray-500">
                      {revisando.nombre} · {revisando.fecha} · {TIPO_LABELS[revisando.tipo]}
                      {revisando.minutos ? ` · ${revisando.minutos} min` : ''}
                    </p>
                  </div>
                  <button onClick={() => setRevisando(null)} className="p-2 text-gray-400 hover:text-white rounded-lg">
                    <FaTimes />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setRevEstado('justificada')}
                      className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all ${
                        revEstado === 'justificada'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-primary-950 border-primary-800 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <FaCheckCircle /> Justificada
                    </button>
                    <button
                      onClick={() => setRevEstado('injustificada')}
                      className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all ${
                        revEstado === 'injustificada'
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                          : 'bg-primary-950 border-primary-800 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <FaTimesCircle /> Injustificada
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs text-primary-400 mb-1.5">
                      Nota {revEstado === 'justificada' ? '(descanso médico, licencia, permiso escrito...) *' : '(opcional)'}
                    </label>
                    <textarea
                      value={revNota}
                      onChange={(e) => setRevNota(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric resize-none"
                      placeholder="Motivo o sustento de la decisión..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-primary-400 mb-1.5">URL del sustento (Drive, opcional)</label>
                    <input
                      value={revSustento}
                      onChange={(e) => setRevSustento(e.target.value)}
                      className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
                    <FaClock className="mt-0.5 shrink-0" />
                    El cambio quedará registrado en el log de auditoría con tu usuario y fecha.
                  </p>
                  <button
                    onClick={guardarRevision}
                    disabled={guardandoRev}
                    className="w-full py-3 bg-accent-electric/20 border border-accent-electric/40 text-accent-electric font-semibold rounded-xl text-sm hover:bg-accent-electric/30 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {guardandoRev && <FaSpinner className="animate-spin" />}
                    Guardar decisión
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Modal autorizar salida 5pm ── */}
        <AnimatePresence>
          {modal5pm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={(e) => { if (e.target === e.currentTarget) setModal5pm(null) }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4"
              >
                <div>
                  <h3 className="font-bold text-white text-sm">Autorizar salida 5:00 p.m.</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{modal5pm.nombre}</p>
                </div>
                <div>
                  <label className="block text-xs text-primary-400 mb-1.5">Fecha</label>
                  <input
                    type="date" value={fecha5pm} onChange={(e) => setFecha5pm(e.target.value)}
                    className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric"
                  />
                </div>
                <div>
                  <label className="block text-xs text-primary-400 mb-1.5">Nota (verificación de avances)</label>
                  <textarea
                    value={nota5pm} onChange={(e) => setNota5pm(e.target.value)} rows={2}
                    className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric resize-none"
                    placeholder="Avances verificados por..."
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  La salida autorizada no genera descuento: la hora no laborada se acredita a la
                  bolsa por compensar (muestreo trimestral ELSE). No genera sobretiempo ni pago extra.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setModal5pm(null)} className="flex-1 py-2.5 text-sm text-primary-400 hover:text-white border border-primary-800 rounded-xl">
                    Cancelar
                  </button>
                  <button
                    onClick={autorizar5pmHandler} disabled={guardandoBolsa}
                    className="flex-1 py-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-semibold rounded-xl text-sm hover:bg-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {guardandoBolsa && <FaSpinner className="animate-spin" />}
                    Autorizar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Modal muestreo ELSE (descarga de bolsa) ── */}
        <AnimatePresence>
          {modalMuestreo && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={(e) => { if (e.target === e.currentTarget) setModalMuestreo(null) }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4"
              >
                <div>
                  <h3 className="font-bold text-white text-sm">Registrar muestreo ELSE</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {modalMuestreo.nombre} · saldo en bolsa: <strong className="text-accent-electric">{(bolsaSaldos[modalMuestreo.dni] || 0).toFixed(2)}h</strong>
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-primary-400 mb-1.5">Horas de muestreo trabajadas</label>
                  <input
                    type="number" min={0.5} step={0.5} value={horasMuestreo}
                    onChange={(e) => setHorasMuestreo(e.target.value)}
                    className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white text-center font-bold focus:outline-none focus:border-accent-electric"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-primary-400 mb-1.5">Nota</label>
                  <input
                    value={notaMuestreo} onChange={(e) => setNotaMuestreo(e.target.value)}
                    className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric"
                    placeholder="Muestreo trimestral ELSE"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  La descarga se limita al saldo disponible: no genera sobretiempo ni pago extra.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setModalMuestreo(null)} className="flex-1 py-2.5 text-sm text-primary-400 hover:text-white border border-primary-800 rounded-xl">
                    Cancelar
                  </button>
                  <button
                    onClick={muestreoHandler} disabled={guardandoBolsa}
                    className="flex-1 py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 font-semibold rounded-xl text-sm hover:bg-amber-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {guardandoBolsa && <FaSpinner className="animate-spin" />}
                    Descargar bolsa
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Modal agregar trabajador ── */}
        <AnimatePresence>
          {modalNuevo && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={(e) => { if (e.target === e.currentTarget) setModalNuevo(false) }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <FaUserPlus className="text-emerald-400" /> Agregar trabajador
                  </h3>
                  <button onClick={() => setModalNuevo(false)} className="text-gray-400 hover:text-white p-1"><FaTimes /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-primary-400 mb-1">DNI *</label>
                    <input
                      value={nuevoDraft.dni} maxLength={8}
                      onChange={(e) => setNuevoDraft((p) => ({ ...p, dni: e.target.value.replace(/\D/g, '') }))}
                      className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-accent-electric"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-primary-400 mb-1">Fecha de inicio *</label>
                    <input
                      type="date" value={nuevoDraft.fecha_inicio}
                      onChange={(e) => setNuevoDraft((p) => ({ ...p, fecha_inicio: e.target.value }))}
                      className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-primary-400 mb-1">Apellidos y nombres *</label>
                    <input
                      value={nuevoDraft.nombre}
                      onChange={(e) => setNuevoDraft((p) => ({ ...p, nombre: e.target.value }))}
                      placeholder="Apellidos, Nombres"
                      className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-primary-400 mb-1">Cargo *</label>
                    <input
                      value={nuevoDraft.cargo}
                      onChange={(e) => setNuevoDraft((p) => ({ ...p, cargo: e.target.value }))}
                      className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-primary-400 mb-1">Sede</label>
                    <input
                      value={nuevoDraft.sede}
                      onChange={(e) => setNuevoDraft((p) => ({ ...p, sede: e.target.value }))}
                      className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-primary-400 mb-1">Correo corporativo (opcional)</label>
                    <input
                      type="email" value={nuevoDraft.email}
                      onChange={(e) => setNuevoDraft((p) => ({ ...p, email: e.target.value }))}
                      placeholder="usuario@ingenieriatelcom.com"
                      className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-primary-400 mb-1">Sueldo (S/)</label>
                    <input
                      type="number" value={nuevoDraft.sueldo} disabled={nuevoDraft.usa_rmv}
                      onChange={(e) => setNuevoDraft((p) => ({ ...p, sueldo: e.target.value }))}
                      placeholder={nuevoDraft.usa_rmv ? `RMV: ${config.rmv}` : '1500'}
                      className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox" checked={nuevoDraft.usa_rmv}
                        onChange={(e) => setNuevoDraft((p) => ({ ...p, usa_rmv: e.target.checked }))}
                        className="accent-cyan-400"
                      />
                      Gana la RMV (ajuste automático)
                    </label>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  El trabajador aparecerá de inmediato en el kiosko de asistencia y en este panel.
                  No se computa asistencia antes de su fecha de inicio.
                </p>
                <button
                  onClick={crearTrabajadorHandler} disabled={guardandoNuevo}
                  className="w-full py-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-semibold rounded-xl text-sm hover:bg-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {guardandoNuevo && <FaSpinner className="animate-spin" />}
                  Crear trabajador
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}
