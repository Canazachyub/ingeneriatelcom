import { useState, useEffect, useMemo } from 'react'
import {
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaDownload,
  FaCamera,
  FaFileAlt,
  FaExternalLinkAlt,
  FaFilter,
  FaTable,
  FaChartBar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserClock,
  FaTimes,
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'
import FileViewerModal from '../../components/admin/FileViewerModal'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import { useToast } from '../../context/ToastContext'
import { exportarExcel } from '../../utils/excel'
import {
  TrabajadorFijo,
  EVENTOS,
  EVENTO_LABELS,
  tipoEvento,
  RegistroAsistencia,
  Justificacion,
} from '../../data/trabajadores'

type Tab = 'registros' | 'informe' | 'justificaciones'

// Cláusula 13ª: 10 min de tolerancia SOLO en el ingreso de la mañana;
// el ingreso de la tarde no tiene tolerancia
const TOLERANCIA_POR_EVENTO: Record<string, number> = {
  ingreso_manana: 10,
  ingreso_tarde: 0,
}

// El sistema entró en operación el 02/07/2026. Los días previos
// no cuentan como falta (periodo justificado por implementación).
const FECHA_INICIO_REPORTE = '2026-07-01'
const FECHA_OPERATIVO = '2026-07-02'

const maxFecha = (a: string, b: string) => (a >= b ? a : b)

// ── Helpers ──────────────────────────────────────────────────

const toLocalISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const inicioSemana = (d: Date) => {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

const mapsLink = (lat?: string | number, lng?: string | number) =>
  lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : ''

const horaAMinutos = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// Puntualidad solo aplica a ingresos; tolerancia según el evento
const esTarde = (evento: string, hora: string): boolean => {
  const cfg = EVENTOS.find((e) => e.key === evento)
  if (!cfg || cfg.tipo !== 'ingreso' || !hora) return false
  return horaAMinutos(hora) > cfg.horaMinutos + (TOLERANCIA_POR_EVENTO[evento] ?? 0)
}

// ── Página ───────────────────────────────────────────────────

export default function AttendancePage() {
  const toast = useToast()
  const hoy = new Date()
  const [tab, setTab] = useState<Tab>('registros')
  const [registros, setRegistros] = useState<RegistroAsistencia[]>([])
  const [justificaciones, setJustificaciones] = useState<Justificacion[]>([])
  const [trabajadores, setTrabajadores] = useState<TrabajadorFijo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtros
  const [filtroDni, setFiltroDni] = useState('')
  const [desde, setDesde] = useState(maxFecha(toLocalISO(inicioSemana(hoy)), FECHA_INICIO_REPORTE))
  const [hasta, setHasta] = useState(toLocalISO(hoy))
  const [filtroEvento, setFiltroEvento] = useState('')

  // Modal foto / justificación (visor seguro: archivos privados en Drive)
  const [fotoModal, setFotoModal] = useState<RegistroAsistencia | null>(null)
  const [justModal, setJustModal] = useState<Justificacion | null>(null)

  // Registro manual (marca que el trabajador no pudo hacer: error del sistema, etc.)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualDni, setManualDni] = useState('')
  const [manualEvento, setManualEvento] = useState('')
  const [manualFecha, setManualFecha] = useState(toLocalISO(new Date()))
  const [manualHora, setManualHora] = useState('')
  const [manualNota, setManualNota] = useState('')
  const [manualSaving, setManualSaving] = useState(false)

  // Roster de trabajadores (hoja 'sueldos' vía endpoint público, sin montos).
  // Fuente única de verdad: altas/bajas del panel de Planilla se reflejan sin redeploy.
  // Se piden CON cesados: su historial de marcas sigue existiendo y hay que
  // poder filtrarlo, y el registro manual debe permitir corregir días que sí
  // laboraron antes de la baja. El kiosko en cambio solo recibe los activos.
  useEffect(() => {
    api.getTrabajadores(true).then((res) => {
      if (res.success && res.data) {
        setTrabajadores(res.data)
      } else {
        toast.error(res.error || 'No se pudo cargar la lista de trabajadores')
      }
    }).catch(() => {
      // Los errores de red ya se muestran globalmente vía ApiErrorBridge
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Feriados / días no laborables (fecha -> descripción): no cuentan como falta
  const [feriados, setFeriados] = useState<Record<string, string>>({})
  useEffect(() => {
    api.getFeriados().then((res) => {
      if (res.success && res.data) {
        const map: Record<string, string> = {}
        res.data.forEach((f) => { map[f.fecha] = f.descripcion })
        setFeriados(map)
      }
    }).catch(() => { /* sin feriados: el informe funciona igual */ })
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    const filtros = {
      dni: filtroDni || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      evento: filtroEvento || undefined,
    }
    const [asisRes, justRes] = await Promise.all([
      api.getAsistenciasV2(filtros),
      api.getJustificaciones({ dni: filtroDni || undefined, desde: desde || undefined, hasta: hasta || undefined }),
    ])
    if (asisRes.success && asisRes.data) {
      setRegistros(asisRes.data as unknown as RegistroAsistencia[])
    } else {
      setRegistros([])
    }
    if (justRes.success && justRes.data) {
      setJustificaciones(justRes.data as unknown as Justificacion[])
    } else {
      setJustificaciones([])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [filtroDni, desde, hasta, filtroEvento])

  // Rangos rápidos (nunca antes del inicio del reporte)
  const setRangoSemana = () => {
    setDesde(maxFecha(toLocalISO(inicioSemana(new Date())), FECHA_INICIO_REPORTE))
    setHasta(toLocalISO(new Date()))
  }
  const setRangoSemanaPasada = () => {
    const ini = inicioSemana(new Date())
    ini.setDate(ini.getDate() - 7)
    const fin = new Date(ini)
    fin.setDate(fin.getDate() + 6)
    setDesde(maxFecha(toLocalISO(ini), FECHA_INICIO_REPORTE))
    setHasta(toLocalISO(fin))
  }
  const setRangoMes = () => {
    const d = new Date()
    setDesde(maxFecha(toLocalISO(new Date(d.getFullYear(), d.getMonth(), 1)), FECHA_INICIO_REPORTE))
    setHasta(toLocalISO(d))
  }

  // ── Registro manual ────────────────────────────────────────
  const trabajadorManual = trabajadores.find((t) => t.dni === manualDni)
  const eventosManual = trabajadorManual?.registro_simple
    ? [
        { key: 'ingreso_campo', label: 'Ingreso (campo)' },
        { key: 'salida_campo', label: 'Salida (campo)' },
      ]
    : EVENTOS.map((e) => ({ key: e.key, label: e.label }))

  const abrirManual = () => {
    setManualDni('')
    setManualEvento('')
    setManualFecha(toLocalISO(new Date()))
    setManualHora('')
    setManualNota('')
    setManualOpen(true)
  }

  const handleRegistrarManual = async () => {
    if (!manualDni || !manualEvento || !manualFecha || !manualHora) {
      toast.error('Completa trabajador, evento, fecha y hora')
      return
    }
    if (!manualNota.trim()) {
      toast.error('La observación es obligatoria (queda como evidencia del registro manual)')
      return
    }
    setManualSaving(true)
    try {
      const res = await api.registrarAsistenciaManual({
        dni: manualDni,
        evento: manualEvento,
        fecha: manualFecha,
        hora: manualHora,
        nota: manualNota.trim(),
      })
      if (res.success) {
        toast.success(`Registrado: ${res.data?.nombre || ''} · ${EVENTO_LABELS[manualEvento] || manualEvento} ${manualFecha} ${manualHora}`)
        setManualOpen(false)
        loadData()
      } else {
        toast.error(res.error || 'No se pudo registrar')
      }
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.')
    } finally {
      setManualSaving(false)
    }
  }

  const registrosOrdenados = useMemo(
    () =>
      [...registros].sort((a, b) =>
        `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
      ),
    [registros]
  )

  // ── Informe: resumen por trabajador ────────────────────────
  const informe = useMemo(() => {
    // fechas del rango (máx 62 días para no desbordar)
    const fechas: string[] = []
    const d0 = new Date(desde + 'T00:00:00')
    const d1 = new Date(hasta + 'T00:00:00')
    for (let d = new Date(d0); d <= d1 && fechas.length < 62; d.setDate(d.getDate() + 1)) {
      fechas.push(toLocalISO(d))
    }

    // index: dni → fecha → evento → registro
    const idx: Record<string, Record<string, Record<string, RegistroAsistencia>>> = {}
    for (const r of registros) {
      const dni = String(r.dni)
      if (!idx[dni]) idx[dni] = {}
      if (!idx[dni][r.fecha]) idx[dni][r.fecha] = {}
      idx[dni][r.fecha][r.evento] = r
    }

    const hoyISO = toLocalISO(new Date())
    const filas = trabajadores
      // Los de campo (registro_simple) quedan fuera del informe de faltas/tardanzas:
      // solo bitácora. Sus registros sí aparecen en la pestaña "Registros".
      .filter((t) => !t.registro_simple && (!filtroDni || t.dni === filtroDni))
      .map((t) => {
        const porFecha = idx[t.dni] || {}
        let diasAsistidos = 0
        let tardanzas = 0
        let faltasLV = 0
        for (const f of fechas) {
          const evs = porFecha[f]
          if (evs && Object.keys(evs).length > 0) {
            diasAsistidos++
            for (const [ev, reg] of Object.entries(evs)) {
              if (esTarde(ev, String(reg.hora))) tardanzas++
            }
          } else {
            const dow = new Date(f + 'T00:00:00').getDay()
            // Falta solo L-V, días ya transcurridos, desde que el sistema opera
            // y que no sean feriado / día no laborable
            if (dow >= 1 && dow <= 5 && f <= hoyISO && f >= FECHA_OPERATIVO && !feriados[f]) faltasLV++
          }
        }
        const numJust = justificaciones.filter((j) => String(j.dni) === t.dni).length
        return { trabajador: t, porFecha, diasAsistidos, tardanzas, faltasLV, numJust }
      })

    return { fechas, filas }
  }, [registros, justificaciones, desde, hasta, filtroDni, trabajadores, feriados])

// ── Exportar Excel ─────────────────────────────────────────
  const exportarRegistros = () => {
    exportarExcel(`asistencias_${desde}_a_${hasta}.xlsx`, [
      {
        nombre: 'Registros',
        columnas: [
          { titulo: 'DNI', ancho: 12 }, { titulo: 'Nombre', ancho: 32 }, { titulo: 'Cargo', ancho: 26 },
          { titulo: 'Evento', ancho: 16 }, { titulo: 'Fecha', ancho: 12 }, { titulo: 'Hora', ancho: 9 },
          { titulo: 'Puntualidad', ancho: 12 },
          { titulo: 'GPS Lat', ancho: 12 }, { titulo: 'GPS Lng', ancho: 12 }, { titulo: 'Precisión (m)' },
          { titulo: 'Origen', ancho: 10 }, { titulo: 'Nota', ancho: 36 }, { titulo: 'Foto', ancho: 50 },
        ],
        filas: registrosOrdenados.map((r) => [
          String(r.dni), r.nombre, r.cargo,
          EVENTO_LABELS[r.evento] || r.evento, r.fecha, String(r.hora),
          esTarde(r.evento, String(r.hora)) ? 'Tarde' : 'Puntual',
          r.gps_lat !== '' && r.gps_lat != null ? Number(r.gps_lat) : null,
          r.gps_lng !== '' && r.gps_lng != null ? Number(r.gps_lng) : null,
          r.gps_accuracy !== '' && r.gps_accuracy != null ? Number(r.gps_accuracy) : null,
          r.foto_url ? 'Kiosko' : 'Manual',
          r.nota || null,
          r.foto_url || null,
        ]),
      },
    ])
  }

  const exportarInforme = () => {
    exportarExcel(`informe_asistencia_${desde}_a_${hasta}.xlsx`, [
      {
        nombre: 'Informe',
        columnas: [
          { titulo: 'DNI', ancho: 12 }, { titulo: 'Nombre', ancho: 32 }, { titulo: 'Cargo', ancho: 26 },
          { titulo: 'Días asistidos' }, { titulo: 'Tardanzas' },
          { titulo: 'Faltas (L-V)' }, { titulo: 'Justificaciones' },
        ],
        filas: informe.filas.map((f) => [
          f.trabajador.dni, f.trabajador.nombre, f.trabajador.cargo,
          f.diasAsistidos, f.tardanzas, f.faltasLV, f.numJust,
        ]),
      },
    ])
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Asistencias</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Registros con foto y GPS · Informes semanales y mensuales
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={abrirManual}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-energy/15 border border-accent-energy/40 text-accent-energy rounded-lg text-sm font-medium hover:bg-accent-energy/25 transition-colors"
            >
              <FaUserClock className="text-xs" />
              Registrar manual
            </button>
            <button
              onClick={tab === 'informe' ? exportarInforme : exportarRegistros}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-electric/20 border border-accent-electric/40 text-accent-electric rounded-lg text-sm font-medium hover:bg-accent-electric/30 transition-colors"
            >
              <FaDownload className="text-xs" />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-primary-900 border border-primary-800 rounded-xl p-1 w-fit">
          {([
            { key: 'registros', label: 'Registros', icon: FaTable },
            { key: 'informe', label: 'Informe', icon: FaChartBar },
            { key: 'justificaciones', label: `Justificaciones (${justificaciones.length})`, icon: FaFileAlt },
          ] as { key: Tab; label: string; icon: typeof FaTable }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-accent-electric/20 text-accent-electric'
                  : 'text-primary-300 hover:text-white'
              }`}
            >
              <t.icon className="text-xs" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <FaFilter className="text-primary-500 text-sm" />
          <select
            value={filtroDni}
            onChange={(e) => setFiltroDni(e.target.value)}
            className="px-3 py-2 bg-primary-900 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric transition-colors"
          >
            <option value="">Todos los trabajadores</option>
            {trabajadores.map((t) => (
              <option key={t.dni} value={t.dni}>
                {t.nombre}{t.activo === false ? ' (cesado)' : ''}
              </option>
            ))}
          </select>
          {tab === 'registros' && (
            <select
              value={filtroEvento}
              onChange={(e) => setFiltroEvento(e.target.value)}
              className="px-3 py-2 bg-primary-900 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric transition-colors"
            >
              <option value="">Todos los eventos</option>
              {EVENTOS.map((ev) => (
                <option key={ev.key} value={ev.key}>{ev.label}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-primary-500 text-xs" />
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-2 bg-primary-900 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric transition-colors"
            />
            <span className="text-primary-500 text-xs">a</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-2 bg-primary-900 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={setRangoSemana} className="px-3 py-1.5 rounded-lg text-xs bg-primary-900 border border-primary-800 text-primary-300 hover:text-white hover:border-accent-electric/50 transition-colors">
              Esta semana
            </button>
            <button onClick={setRangoSemanaPasada} className="px-3 py-1.5 rounded-lg text-xs bg-primary-900 border border-primary-800 text-primary-300 hover:text-white hover:border-accent-electric/50 transition-colors">
              Semana pasada
            </button>
            <button onClick={setRangoMes} className="px-3 py-1.5 rounded-lg text-xs bg-primary-900 border border-primary-800 text-primary-300 hover:text-white hover:border-accent-electric/50 transition-colors">
              Este mes
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && <TableSkeleton rows={7} cols={7} />}

        {/* ── TAB: REGISTROS ── */}
        {!isLoading && tab === 'registros' && (
          registrosOrdenados.length === 0 ? (
            <EmptyState
              icon={<FaClock />}
              title="Sin marcas en este rango"
              hint="Cambia el rango de fechas o los filtros para ver otros registros"
            />
          ) : (
            <div className="bg-primary-900/60 border border-primary-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-primary-800 bg-primary-950/60">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Foto</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Trabajador</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Evento</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Fecha</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Hora</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Puntualidad</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">GPS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-800/60">
                    {registrosOrdenados.map((r) => {
                      const cfg = EVENTOS.find((e) => e.key === r.evento)
                      const tarde = esTarde(r.evento, String(r.hora))
                      const gps = mapsLink(r.gps_lat, r.gps_lng)
                      return (
                        <tr key={r.id} className="hover:bg-primary-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setFotoModal(r)}
                              disabled={!r.foto_url}
                              title={r.foto_url ? 'Ver foto de asistencia' : 'Sin foto'}
                              className="w-14 h-11 rounded-lg overflow-hidden bg-primary-800 border border-primary-700 hover:ring-2 hover:ring-accent-electric transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <FaCamera className="text-primary-400" />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-white leading-tight">{r.nombre}</div>
                            <div className="text-gray-500 text-xs">{r.cargo}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              tipoEvento(r.evento) === 'ingreso'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                            }`}>
                              {EVENTO_LABELS[r.evento] || r.evento}
                              {!cfg && <span className="ml-1 opacity-60">· campo</span>}
                              {!r.foto_url && (
                                <span className="ml-1 opacity-80" title={r.nota ? `Registro manual: ${r.nota}` : 'Registro manual (sin foto)'}>
                                  · manual
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-300 hidden sm:table-cell">{r.fecha}</td>
                          <td className="px-4 py-3 text-center font-mono text-white">{String(r.hora).slice(0, 5)}</td>
                          <td className="px-4 py-3 text-center">
                            {cfg?.tipo === 'ingreso' ? (
                              tarde ? (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                                  <FaExclamationTriangle className="text-[10px]" /> Tarde
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                                  <FaCheckCircle className="text-[10px]" /> Puntual
                                </span>
                              )
                            ) : (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center hidden md:table-cell">
                            {gps ? (
                              <a
                                href={gps}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-accent-electric hover:underline"
                              >
                                <FaMapMarkerAlt className="text-[10px]" />
                                Ver mapa
                              </a>
                            ) : (
                              <span className="text-gray-600 text-xs">Sin GPS</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-primary-800 text-xs text-gray-500">
                {registrosOrdenados.length} registro{registrosOrdenados.length !== 1 ? 's' : ''} · {desde} a {hasta}
              </div>
            </div>
          )
        )}

        {/* ── TAB: INFORME ── */}
        {!isLoading && tab === 'informe' && (
          <div className="space-y-4">
            {/* Resumen por trabajador */}
            <div className="bg-primary-900/60 border border-primary-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-primary-800 bg-primary-950/60">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Trabajador</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Días asistidos</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tardanzas</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Faltas (L-V)</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Justif.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-800/60">
                    {informe.filas.map((f) => (
                      <tr key={f.trabajador.dni} className="hover:bg-primary-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white leading-tight">{f.trabajador.nombre}</div>
                          <div className="text-gray-500 text-xs">{f.trabajador.cargo}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-emerald-400 font-bold">{f.diasAsistidos}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={f.tardanzas > 0 ? 'text-amber-400 font-bold' : 'text-gray-600'}>
                            {f.tardanzas}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={f.faltasLV > 0 ? 'text-rose-400 font-bold' : 'text-gray-600'}>
                            {f.faltasLV}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={f.numJust > 0 ? 'text-accent-electric font-bold' : 'text-gray-600'}>
                            {f.numJust}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matriz día × eventos */}
            <div className="bg-primary-900/60 border border-primary-800 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-white mb-1">Detalle por día</h3>
              <p className="text-xs text-gray-500 mb-4">
                Cada celda muestra los 4 eventos: <span className="text-emerald-400">●</span> puntual ·{' '}
                <span className="text-amber-400">●</span> tarde · <span className="text-gray-600">●</span> sin registro ·{' '}
                <span className="text-violet-400/60">●</span> feriado / no laborable ·{' '}
                <span className="text-blue-400/50">●</span> justificado (antes de la implementación)
              </p>
              <div className="overflow-x-auto">
                <table className="text-xs">
                  <thead>
                    <tr>
                      <th className="text-left pr-4 pb-2 text-gray-400 font-medium sticky left-0 bg-primary-900/95 min-w-[160px]">Trabajador</th>
                      {informe.fechas.map((f) => {
                        const d = new Date(f + 'T00:00:00')
                        const dow = d.getDay()
                        const finde = dow === 0 || dow === 6
                        return (
                          <th key={f} className={`px-1.5 pb-2 font-mono font-normal text-center ${finde ? 'text-primary-600' : 'text-gray-400'}`}>
                            {f.slice(8)}/{f.slice(5, 7)}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {informe.filas.map((f) => (
                      <tr key={f.trabajador.dni} className="border-t border-primary-800/40">
                        <td className="pr-4 py-2 text-gray-300 sticky left-0 bg-primary-900/95 whitespace-nowrap">
                          {f.trabajador.nombre.split(',')[0]}
                        </td>
                        {informe.fechas.map((fecha) => {
                          const evs = f.porFecha[fecha] || {}
                          const preOperativo = fecha < FECHA_OPERATIVO
                          const feriado = feriados[fecha]
                          return (
                            <td key={fecha} className="px-1.5 py-2 text-center">
                              <div className="flex gap-0.5 justify-center">
                                {EVENTOS.map((ev) => {
                                  const reg = evs[ev.key]
                                  const color = reg
                                    ? esTarde(ev.key, String(reg.hora))
                                      ? 'bg-amber-400'
                                      : 'bg-emerald-400'
                                    : feriado
                                    ? 'bg-violet-400/40'
                                    : preOperativo
                                    ? 'bg-blue-400/25'
                                    : 'bg-gray-700'
                                  const title = reg
                                    ? `${ev.label}: ${String(reg.hora).slice(0, 5)}`
                                    : feriado
                                    ? `${ev.label}: no laborable (${feriado})`
                                    : preOperativo
                                    ? `${ev.label}: justificado (antes de la implementación)`
                                    : `${ev.label}: sin registro`
                                  return (
                                    <span key={ev.key} title={title} className={`w-2 h-2 rounded-full ${color}`} />
                                  )
                                })}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: JUSTIFICACIONES ── */}
        {!isLoading && tab === 'justificaciones' && (
          justificaciones.length === 0 ? (
            <EmptyState
              icon={<FaFileAlt />}
              title="Sin justificaciones en este rango"
              hint="Cambia el rango de fechas o los filtros para ver otras justificaciones"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...justificaciones]
                .sort((a, b) => String(b.timestamp || b.fecha).localeCompare(String(a.timestamp || a.fecha)))
                .map((j) => (
                  <div key={j.id} className="bg-primary-900/60 border border-primary-800 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-medium text-white leading-tight">{j.nombre}</p>
                        <p className="text-gray-500 text-xs">{j.cargo} · DNI {j.dni}</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-400/15 text-amber-300 border border-amber-400/25 whitespace-nowrap">
                        {j.motivo}
                      </span>
                    </div>
                    {j.descripcion && (
                      <p className="text-sm text-gray-300 mb-3 leading-snug">{j.descripcion}</p>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        <FaCalendarAlt className="inline mr-1" />
                        {j.fecha}
                      </span>
                      {j.archivo_url ? (
                        <button
                          onClick={() => setJustModal(j)}
                          className="inline-flex items-center gap-1 text-accent-electric hover:underline"
                        >
                          <FaExternalLinkAlt className="text-[10px]" />
                          Ver evidencia
                        </button>
                      ) : (
                        <span className="text-gray-600">Sin evidencia adjunta</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )
        )}

        {/* ── Modal foto (visor seguro: el archivo ya no es ANYONE_WITH_LINK — C6) ── */}
        {fotoModal && fotoModal.foto_url && (
          <FileViewerModal
            fileUrl={fotoModal.foto_url}
            title={`${fotoModal.nombre} · ${EVENTO_LABELS[fotoModal.evento] || fotoModal.evento} · ${fotoModal.fecha} ${String(fotoModal.hora).slice(0, 5)}`}
            onClose={() => setFotoModal(null)}
          />
        )}
        {fotoModal && mapsLink(fotoModal.gps_lat, fotoModal.gps_lng) && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-primary-900 border border-primary-700 rounded-xl px-4 py-2 shadow-2xl">
            <a
              href={mapsLink(fotoModal.gps_lat, fotoModal.gps_lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent-electric hover:underline"
            >
              <FaMapMarkerAlt />
              {Number(fotoModal.gps_lat).toFixed(5)}, {Number(fotoModal.gps_lng).toFixed(5)}
              {fotoModal.gps_accuracy ? ` · ±${Math.round(Number(fotoModal.gps_accuracy))}m` : ''}
            </a>
          </div>
        )}

        {/* ── Modal justificación (visor seguro) ── */}
        {justModal && justModal.archivo_url && (
          <FileViewerModal
            fileUrl={justModal.archivo_url}
            title={`${justModal.nombre} · ${justModal.motivo} · ${justModal.fecha}`}
            onClose={() => setJustModal(null)}
          />
        )}

        {/* ── Modal registro manual ── */}
        {manualOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !manualSaving && setManualOpen(false)}>
            <div
              className="w-full max-w-md bg-primary-900 border border-primary-700 rounded-2xl p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FaUserClock className="text-accent-energy" />
                  Registrar asistencia manual
                </h3>
                <button
                  onClick={() => !manualSaving && setManualOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
              <p className="text-xs text-gray-400 leading-snug">
                Para marcas que el trabajador no pudo hacer (error del sistema, olvido justificado, etc.).
                Se guarda <span className="text-amber-300">sin foto ni GPS</span> y con la observación como evidencia.
              </p>

              <div className="space-y-3">
                <select
                  value={manualDni}
                  onChange={(e) => { setManualDni(e.target.value); setManualEvento('') }}
                  className="w-full px-3 py-2.5 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric transition-colors"
                >
                  <option value="">Selecciona trabajador…</option>
                  {trabajadores.map((t) => (
                    <option key={t.dni} value={t.dni}>
                      {t.nombre} — {t.cargo}
                      {t.activo === false ? ` (cesado ${t.fecha_fin})` : ''}
                    </option>
                  ))}
                </select>

                <select
                  value={manualEvento}
                  onChange={(e) => setManualEvento(e.target.value)}
                  disabled={!manualDni}
                  className="w-full px-3 py-2.5 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric transition-colors disabled:opacity-50"
                >
                  <option value="">Selecciona evento…</option>
                  {eventosManual.map((ev) => (
                    <option key={ev.key} value={ev.key}>{ev.label}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={manualFecha}
                    max={toLocalISO(new Date())}
                    onChange={(e) => setManualFecha(e.target.value)}
                    className="px-3 py-2.5 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric transition-colors"
                  />
                  <input
                    type="time"
                    value={manualHora}
                    onChange={(e) => setManualHora(e.target.value)}
                    className="px-3 py-2.5 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric transition-colors"
                  />
                </div>

                <textarea
                  value={manualNota}
                  onChange={(e) => setManualNota(e.target.value)}
                  rows={2}
                  placeholder="Observación (obligatoria): ej. El sistema no le permitió registrar a las 2:00 pm"
                  className="w-full px-3 py-2.5 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setManualOpen(false)}
                  disabled={manualSaving}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-primary-700 text-gray-300 hover:text-white hover:border-primary-600 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegistrarManual}
                  disabled={manualSaving}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-accent-energy text-primary-950 hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {manualSaving ? 'Guardando…' : 'Registrar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
