import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaSpinner,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaDownload,
  FaTimes,
  FaCamera,
  FaFileAlt,
  FaExternalLinkAlt,
  FaFilter,
  FaTable,
  FaChartBar,
  FaCheckCircle,
  FaExclamationTriangle,
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  TRABAJADORES,
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

const driveId = (url?: string): string => {
  if (!url) return ''
  const m = url.match(/\/d\/([^/]+)/)
  return m ? m[1] : ''
}

const driveThumb = (url?: string): string => {
  const id = driveId(url)
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w400` : ''
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

const descargarCSV = (nombre: string, filas: string[][]) => {
  const csv = filas.map((f) => f.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── Página ───────────────────────────────────────────────────

export default function AttendancePage() {
  const hoy = new Date()
  const [tab, setTab] = useState<Tab>('registros')
  const [registros, setRegistros] = useState<RegistroAsistencia[]>([])
  const [justificaciones, setJustificaciones] = useState<Justificacion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtros
  const [filtroDni, setFiltroDni] = useState('')
  const [desde, setDesde] = useState(maxFecha(toLocalISO(inicioSemana(hoy)), FECHA_INICIO_REPORTE))
  const [hasta, setHasta] = useState(toLocalISO(hoy))
  const [filtroEvento, setFiltroEvento] = useState('')

  // Modal foto
  const [fotoModal, setFotoModal] = useState<RegistroAsistencia | null>(null)

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
    const filas = TRABAJADORES
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
            // Falta solo L-V, días ya transcurridos y desde que el sistema opera
            if (dow >= 1 && dow <= 5 && f <= hoyISO && f >= FECHA_OPERATIVO) faltasLV++
          }
        }
        const numJust = justificaciones.filter((j) => String(j.dni) === t.dni).length
        return { trabajador: t, porFecha, diasAsistidos, tardanzas, faltasLV, numJust }
      })

    return { fechas, filas }
  }, [registros, justificaciones, desde, hasta, filtroDni])

  // ── Exportar CSV ───────────────────────────────────────────
  const exportarRegistros = () => {
    const filas: string[][] = [
      ['DNI', 'Nombre', 'Cargo', 'Evento', 'Fecha', 'Hora', 'Puntualidad', 'GPS Lat', 'GPS Lng', 'Precisión (m)', 'Foto'],
      ...registrosOrdenados.map((r) => [
        String(r.dni),
        r.nombre,
        r.cargo,
        EVENTO_LABELS[r.evento] || r.evento,
        r.fecha,
        String(r.hora),
        esTarde(r.evento, String(r.hora)) ? 'Tarde' : 'Puntual',
        String(r.gps_lat ?? ''),
        String(r.gps_lng ?? ''),
        String(r.gps_accuracy ?? ''),
        r.foto_url || '',
      ]),
    ]
    descargarCSV(`asistencias_${desde}_a_${hasta}.csv`, filas)
  }

  const exportarInforme = () => {
    const filas: string[][] = [
      ['DNI', 'Nombre', 'Cargo', 'Días asistidos', 'Tardanzas', 'Faltas (L-V)', 'Justificaciones'],
      ...informe.filas.map((f) => [
        f.trabajador.dni,
        f.trabajador.nombre,
        f.trabajador.cargo,
        String(f.diasAsistidos),
        String(f.tardanzas),
        String(f.faltasLV),
        String(f.numJust),
      ]),
    ]
    descargarCSV(`informe_asistencia_${desde}_a_${hasta}.csv`, filas)
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
          <button
            onClick={tab === 'informe' ? exportarInforme : exportarRegistros}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-electric/20 border border-accent-electric/40 text-accent-electric rounded-lg text-sm font-medium hover:bg-accent-electric/30 transition-colors self-start"
          >
            <FaDownload className="text-xs" />
            Exportar CSV
          </button>
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
            {TRABAJADORES.map((t) => (
              <option key={t.dni} value={t.dni}>{t.nombre}</option>
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
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <FaSpinner className="animate-spin text-3xl text-accent-electric" />
          </div>
        )}

        {/* ── TAB: REGISTROS ── */}
        {!isLoading && tab === 'registros' && (
          registrosOrdenados.length === 0 ? (
            <div className="text-center py-20">
              <FaClock className="text-4xl text-primary-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Sin registros en el rango seleccionado</p>
            </div>
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
                              className="w-14 h-11 rounded-lg overflow-hidden bg-primary-800 border border-primary-700 hover:ring-2 hover:ring-accent-electric transition-all relative group"
                            >
                              {r.foto_url ? (
                                <img
                                  src={driveThumb(r.foto_url)}
                                  alt="Foto asistencia"
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              ) : (
                                <FaCamera className="text-primary-600 mx-auto" />
                              )}
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
                          return (
                            <td key={fecha} className="px-1.5 py-2 text-center">
                              <div className="flex gap-0.5 justify-center">
                                {EVENTOS.map((ev) => {
                                  const reg = evs[ev.key]
                                  const color = reg
                                    ? esTarde(ev.key, String(reg.hora))
                                      ? 'bg-amber-400'
                                      : 'bg-emerald-400'
                                    : preOperativo
                                    ? 'bg-blue-400/25'
                                    : 'bg-gray-700'
                                  const title = reg
                                    ? `${ev.label}: ${String(reg.hora).slice(0, 5)}`
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
            <div className="text-center py-20">
              <FaFileAlt className="text-4xl text-primary-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Sin justificaciones en el rango seleccionado</p>
            </div>
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
                        <a
                          href={j.archivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent-electric hover:underline"
                        >
                          <FaExternalLinkAlt className="text-[10px]" />
                          Ver evidencia
                        </a>
                      ) : (
                        <span className="text-gray-600">Sin evidencia adjunta</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )
        )}

        {/* ── Modal foto ── */}
        <AnimatePresence>
          {fotoModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFotoModal(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-primary-800">
                  <div>
                    <p className="font-semibold text-white text-sm">{fotoModal.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {EVENTO_LABELS[fotoModal.evento] || fotoModal.evento} · {fotoModal.fecha} {String(fotoModal.hora).slice(0, 5)}
                    </p>
                  </div>
                  <button
                    onClick={() => setFotoModal(null)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="bg-black aspect-[4/3] flex items-center justify-center">
                  {fotoModal.foto_url ? (
                    <img
                      src={driveThumb(fotoModal.foto_url).replace('sz=w400', 'sz=w800')}
                      alt="Foto de asistencia"
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <FaCamera className="text-4xl text-primary-700" />
                  )}
                </div>
                <div className="px-5 py-3 flex items-center justify-between text-xs">
                  {mapsLink(fotoModal.gps_lat, fotoModal.gps_lng) ? (
                    <a
                      href={mapsLink(fotoModal.gps_lat, fotoModal.gps_lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent-electric hover:underline"
                    >
                      <FaMapMarkerAlt />
                      {Number(fotoModal.gps_lat).toFixed(5)}, {Number(fotoModal.gps_lng).toFixed(5)}
                      {fotoModal.gps_accuracy ? ` · ±${Math.round(Number(fotoModal.gps_accuracy))}m` : ''}
                    </a>
                  ) : (
                    <span className="text-gray-600">Sin datos GPS</span>
                  )}
                  {fotoModal.foto_url && (
                    <a
                      href={fotoModal.foto_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <FaExternalLinkAlt className="text-[10px]" />
                      Abrir en Drive
                    </a>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}
