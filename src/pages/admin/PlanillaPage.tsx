import { useState, useEffect, useMemo } from 'react'
import {
  FaSpinner, FaSync, FaDownload, FaExclamationTriangle, FaCog,
  FaFileInvoiceDollar, FaUserPlus,
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
import { exportarExcel } from '../../utils/excel'
import {
  TIPO_LABELS, ESTADO_LABELS, mesActualISO, finDeMes, inicioTrimestre, hoyISO, nombreMes, Fila,
} from './planilla/planilla.types'
import ConfigPlanillaForm from './planilla/ConfigPlanillaForm'
import FeriadosPanel from './planilla/FeriadosPanel'
import SueldosTable from './planilla/SueldosTable'
import IncidenciasPanel from './planilla/IncidenciasPanel'
import BolsaHorasPanel from './planilla/BolsaHorasPanel'
import NuevoTrabajadorModal, { NuevoTrabajadorDraft } from './planilla/NuevoTrabajadorModal'
import BajaTrabajadorModal from './planilla/BajaTrabajadorModal'

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
  const [nuevoDraft, setNuevoDraft] = useState<NuevoTrabajadorDraft>({
    dni: '', nombre: '', cargo: '', sueldo: '', fecha_inicio: hoyISO(), usa_rmv: false, sede: 'Principal', email: '',
  })
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)

  // Baja de trabajador (cese)
  const [modalBaja, setModalBaja] = useState<SueldoTrabajador | null>(null)
  const [fechaFinDraft, setFechaFinDraft] = useState(hoyISO())
  const [guardandoBaja, setGuardandoBaja] = useState(false)

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

  const filas: Fila[] = useMemo(() => {
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

  const darDeBajaHandler = async () => {
    if (!modalBaja) return
    setGuardandoBaja(true)
    const res = await api.darDeBajaTrabajador(modalBaja.dni, fechaFinDraft)
    setGuardandoBaja(false)
    if (res.success) {
      const borradas = res.data?.incidencias_eliminadas || 0
      toast.success(
        `${modalBaja.nombre} dado de baja (último día ${fechaFinDraft}). Sale del kiosko` +
        (borradas ? ` y se eliminaron ${borradas} incidencia(s) pendiente(s) posteriores.` : '.')
      )
      setModalBaja(null)
      loadData()
    } else {
      toast.error('Error: ' + res.error)
    }
  }

  const reactivarHandler = async (trabajador: SueldoTrabajador) => {
    const res = await api.reactivarTrabajador(trabajador.dni)
    if (res.success) {
      toast.success(`${trabajador.nombre} reactivado — vuelve a aparecer en el kiosko`)
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
  const exportarExcelPlanilla = () => {
    exportarExcel(`planilla_${mes}.xlsx`, [
      {
        nombre: 'Resumen',
        columnas: [
          { titulo: 'Trabajador', ancho: 32 }, { titulo: 'Cargo', ancho: 26 }, { titulo: 'Correo', ancho: 34 },
          { titulo: 'Sueldo (S/)', formato: '#,##0.00' },
          { titulo: 'Tardanzas' }, { titulo: 'Min. acumulados' },
          { titulo: 'Faltas injust.' }, { titulo: 'Faltas just.' },
          { titulo: 'Omisiones' }, { titulo: 'Salidas antic. s/aut.' },
          { titulo: 'Bolsa 5pm (h)', formato: '0.00' }, { titulo: 'Pendientes' },
          { titulo: 'Descuento confirmado (S/)', formato: '#,##0.00' },
          { titulo: 'Descuento proyectado (S/)', formato: '#,##0.00' },
          { titulo: 'Alerta disciplinaria', ancho: 28 },
        ],
        filas: filas.map((f) => [
          f.trabajador.nombre, f.trabajador.cargo, f.trabajador.email || null, f.sueldo,
          f.resumen.tardanzas, f.resumen.minutosAcumulados,
          f.resumen.faltasInjustificadas, f.resumen.faltasJustificadas,
          f.resumen.omisiones, f.resumen.salidasAnticipadas,
          Number(f.bolsa.toFixed(2)), f.resumen.pendientes,
          Number(f.resumen.descuentoConfirmado.toFixed(2)),
          Number(f.resumen.descuentoProyectado.toFixed(2)),
          f.disciplina.etiqueta || null,
        ]),
      },
      {
        nombre: 'Detalle incidencias',
        columnas: [
          { titulo: 'Trabajador', ancho: 32 }, { titulo: 'Fecha', ancho: 12 },
          { titulo: 'Tipo', ancho: 18 }, { titulo: 'Evento', ancho: 16 },
          { titulo: 'Minutos' }, { titulo: 'Grave' }, { titulo: 'Estado', ancho: 14 },
          { titulo: 'Descuento parcial (S/)', formato: '#,##0.00' }, { titulo: 'Nota', ancho: 40 },
        ],
        filas: filas.flatMap((f) => f.incMes.map((i) => [
          f.trabajador.nombre, String(i.fecha), TIPO_LABELS[i.tipo] || i.tipo, i.evento || null,
          i.minutos ?? null, i.grave ? 'Sí' : 'No', ESTADO_LABELS[i.estado] || i.estado,
          Number(descuentoIncidencia(i, f.sueldo, config).toFixed(2)), i.nota || null,
        ])),
      },
    ])
  }

  const imprimirTrabajador = (fila: Fila) => {
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
              onClick={exportarExcelPlanilla}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 border border-primary-800 text-primary-300 rounded-lg text-sm hover:text-white hover:border-accent-electric/50 transition-colors"
            >
              <FaDownload className="text-xs" />
              Excel
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
        <ConfigPlanillaForm
          show={showConfig}
          configDraft={configDraft}
          setConfigDraft={setConfigDraft}
          savingConfig={savingConfig}
          onCancel={() => setShowConfig(false)}
          onGuardar={guardarConfig}
        />

        {/* Feriados / días no laborables */}
        <FeriadosPanel />

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
          <SueldosTable
            filas={filas}
            config={config}
            esMesActual={esMesActual}
            totalProyectado={totalProyectado}
            expanded={expanded}
            setExpanded={setExpanded}
            editandoSueldo={editandoSueldo}
            setEditandoSueldo={setEditandoSueldo}
            sueldoDraft={sueldoDraft}
            setSueldoDraft={setSueldoDraft}
            guardarSueldo={guardarSueldo}
            abrirRevision={abrirRevision}
            onAbrir5pm={(trabajador) => { setModal5pm(trabajador); setFecha5pm(hoyISO()) }}
            onAbrirMuestreo={(trabajador) => setModalMuestreo(trabajador)}
            onAbrirBaja={(trabajador) => { setModalBaja(trabajador); setFechaFinDraft(hoyISO()) }}
            onReactivar={reactivarHandler}
            imprimirTrabajador={imprimirTrabajador}
          />
        )}

        {/* ── Modal revisión ── */}
        <IncidenciasPanel
          revisando={revisando}
          revEstado={revEstado}
          setRevEstado={setRevEstado}
          revNota={revNota}
          setRevNota={setRevNota}
          revSustento={revSustento}
          setRevSustento={setRevSustento}
          guardandoRev={guardandoRev}
          onCerrar={() => setRevisando(null)}
          onGuardar={guardarRevision}
        />

        {/* ── Modales bolsa de horas (5pm + muestreo) ── */}
        <BolsaHorasPanel
          modal5pm={modal5pm}
          fecha5pm={fecha5pm}
          setFecha5pm={setFecha5pm}
          nota5pm={nota5pm}
          setNota5pm={setNota5pm}
          onCerrar5pm={() => setModal5pm(null)}
          onAutorizar5pm={autorizar5pmHandler}
          modalMuestreo={modalMuestreo}
          bolsaSaldos={bolsaSaldos}
          horasMuestreo={horasMuestreo}
          setHorasMuestreo={setHorasMuestreo}
          notaMuestreo={notaMuestreo}
          setNotaMuestreo={setNotaMuestreo}
          onCerrarMuestreo={() => setModalMuestreo(null)}
          onMuestreo={muestreoHandler}
          guardandoBolsa={guardandoBolsa}
        />

        {/* ── Modal agregar trabajador ── */}
        <NuevoTrabajadorModal
          show={modalNuevo}
          nuevoDraft={nuevoDraft}
          setNuevoDraft={setNuevoDraft}
          guardandoNuevo={guardandoNuevo}
          config={config}
          onCerrar={() => setModalNuevo(false)}
          onCrear={crearTrabajadorHandler}
        />

        {/* ── Modal baja de trabajador ── */}
        <BajaTrabajadorModal
          trabajador={modalBaja}
          fechaFin={fechaFinDraft}
          setFechaFin={setFechaFinDraft}
          guardando={guardandoBaja}
          onCerrar={() => setModalBaja(null)}
          onConfirmar={darDeBajaHandler}
        />
      </div>
    </AdminLayout>
  )
}
