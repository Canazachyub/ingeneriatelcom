import { useState } from 'react'
import {
  FaChartLine,
  FaUsers,
  FaClock,
  FaBriefcase,
  FaDownload,
  FaSpinner,
  FaFilter,
} from 'react-icons/fa'
import AdminLayout from '../../components/admin/AdminLayout'
import { api, Employee } from '../../api/appScriptApi'
import { JobApplication } from '../../types/job.types'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type TabId = 'asistencias' | 'postulaciones' | 'empleados'

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeDni: string
  date: string
  checkIn: string
  checkOut: string
  status: string
  hoursWorked?: number
}

// ─────────────────────────────────────────────
// CSV helper
// ─────────────────────────────────────────────

const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
  )
  const csv = '﻿' + [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────

function StatCard({ label, value, color = 'text-cyan-400' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-5 py-4">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <FaChartLine className="text-4xl mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab 1: Asistencias
// ─────────────────────────────────────────────

function AsistenciasTab() {
  const today = new Date().toISOString().split('T')[0]
  const [desde, setDesde] = useState(today)
  const [hasta, setHasta] = useState(today)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AttendanceRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerar = async () => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      // Fetch using date range filter
      const res = await api.getAttendances({ startDate: desde, endDate: hasta })
      if (!res.success || !res.data) {
        setError(res.error ?? 'Error al obtener asistencias')
      } else {
        setData(res.data as AttendanceRecord[])
      }
    } catch {
      setError('Error de red al obtener asistencias')
    } finally {
      setLoading(false)
    }
  }

  const stats = data
    ? {
        total: data.length,
        promedioHoras:
          data.length === 0
            ? 0
            : (
                data.reduce((acc, r) => acc + (r.hoursWorked ?? 0), 0) / data.length
              ).toFixed(1),
        presentes: data.filter(r => !r.checkOut).length,
      }
    : null

  const csvData = (data ?? []).map(r => ({
    Empleado: r.employeeName,
    DNI: r.employeeDni,
    Fecha: r.date,
    Entrada: r.checkIn,
    Salida: r.checkOut,
    Horas: r.hoursWorked ?? '',
    Estado: r.status,
  }))

  return (
    <div className="space-y-5">
      {/* Filters row */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={e => setDesde(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            onClick={handleGenerar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaFilter />}
            {loading ? 'Cargando...' : 'Generar'}
          </button>
          {data && data.length > 0 && (
            <button
              onClick={() => exportToCSV(csvData as Record<string, unknown>[], 'asistencias')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors ml-auto"
            >
              <FaDownload />
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total registros" value={stats.total} color="text-cyan-400" />
          <StatCard label="Promedio horas" value={stats.promedioHoras} color="text-blue-400" />
          <StatCard label="Actualmente dentro" value={stats.presentes} color="text-emerald-400" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {loading && (
        <div className="flex justify-center py-16">
          <FaSpinner className="animate-spin text-cyan-400 text-3xl" />
        </div>
      )}

      {!loading && data !== null && data.length === 0 && (
        <EmptyState message="No se encontraron registros de asistencia para el periodo seleccionado" />
      )}

      {!loading && data && data.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900/60">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Empleado</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">DNI</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Fecha</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Entrada</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Salida</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Horas</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr
                    key={r.id ?? i}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">{r.employeeName}</td>
                    <td className="px-4 py-3 text-gray-300">{r.employeeDni}</td>
                    <td className="px-4 py-3 text-gray-300">{r.date}</td>
                    <td className="px-4 py-3 text-emerald-400">{r.checkIn || '—'}</td>
                    <td className="px-4 py-3 text-orange-400">{r.checkOut || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {r.hoursWorked != null ? `${r.hoursWorked}h` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'presente' || r.status === 'dentro'
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : r.status === 'ausente'
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && data === null && !error && (
        <EmptyState message="Selecciona un rango de fechas y presiona Generar" />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab 2: Postulaciones
// ─────────────────────────────────────────────

const APP_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'review', label: 'En revisión' },
  { value: 'preseleccionado', label: 'Preseleccionado' },
  { value: 'interview', label: 'Entrevista' },
  { value: 'evaluation', label: 'Evaluación' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'rejected', label: 'Rechazado' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/50 text-yellow-300',
  pendiente: 'bg-yellow-900/50 text-yellow-300',
  review: 'bg-blue-900/50 text-blue-300',
  revisado: 'bg-blue-900/50 text-blue-300',
  preseleccionado: 'bg-indigo-900/50 text-indigo-300',
  interview: 'bg-purple-900/50 text-purple-300',
  entrevista: 'bg-purple-900/50 text-purple-300',
  evaluation: 'bg-orange-900/50 text-orange-300',
  evaluacion: 'bg-orange-900/50 text-orange-300',
  approved: 'bg-emerald-900/50 text-emerald-300',
  aprobado: 'bg-emerald-900/50 text-emerald-300',
  hired: 'bg-emerald-900/50 text-emerald-300',
  contratado: 'bg-emerald-900/50 text-emerald-300',
  rejected: 'bg-red-900/50 text-red-300',
  rechazado: 'bg-red-900/50 text-red-300',
  no_seleccionado: 'bg-red-900/50 text-red-300',
}

function PostulacionesTab() {
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<JobApplication[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerar = async () => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const res = await api.getApplicationsAdmin()
      if (!res.success || !res.data) {
        setError(res.error ?? 'Error al obtener postulaciones')
      } else {
        setData(res.data)
      }
    } catch {
      setError('Error de red al obtener postulaciones')
    } finally {
      setLoading(false)
    }
  }

  const filtered = (data ?? []).filter(
    r => !statusFilter || r.status === statusFilter
  )

  // Count by status
  const countByStatus = (data ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  const csvData = filtered.map(r => ({
    Candidato: r.fullName,
    DNI: r.dni,
    Email: r.email,
    Puesto: r.jobTitle,
    Estado: r.status,
    PretensionSalarial: r.expectedSalary ?? '',
    Fecha: r.createdAt,
  }))

  return (
    <div className="space-y-5">
      {/* Filters row */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            >
              {APP_STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaFilter />}
            {loading ? 'Cargando...' : 'Generar'}
          </button>
          {filtered.length > 0 && (
            <button
              onClick={() => exportToCSV(csvData as Record<string, unknown>[], 'postulaciones')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors ml-auto"
            >
              <FaDownload />
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {data !== null && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total" value={data.length} color="text-purple-400" />
          <StatCard label="Pendientes" value={countByStatus['pending'] ?? countByStatus['pendiente'] ?? 0} color="text-yellow-400" />
          <StatCard label="En revisión" value={countByStatus['review'] ?? countByStatus['revisado'] ?? 0} color="text-blue-400" />
          <StatCard label="Aprobados" value={(countByStatus['approved'] ?? 0) + (countByStatus['aprobado'] ?? 0) + (countByStatus['hired'] ?? 0)} color="text-emerald-400" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {loading && (
        <div className="flex justify-center py-16">
          <FaSpinner className="animate-spin text-purple-400 text-3xl" />
        </div>
      )}

      {!loading && data !== null && filtered.length === 0 && (
        <EmptyState message="No se encontraron postulaciones con los filtros seleccionados" />
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900/60">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Candidato</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">DNI</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Email</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Puesto</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Estado</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Pretensión</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={r.id ?? i}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">{r.fullName}</td>
                    <td className="px-4 py-3 text-gray-300">{r.dni}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-[160px] truncate">{r.email}</td>
                    <td className="px-4 py-3 text-gray-300">{r.jobTitle}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[r.status] ?? 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {r.expectedSalary ? `S/ ${r.expectedSalary}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {r.createdAt ? r.createdAt.split('T')[0] : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && data === null && !error && (
        <EmptyState message="Presiona Generar para cargar las postulaciones" />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab 3: Empleados
// ─────────────────────────────────────────────

function EmpleadosTab() {
  const [cityFilter, setCityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Employee[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerar = async () => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const res = await api.getEmployees()
      if (!res.success || !res.data) {
        setError(res.error ?? 'Error al obtener empleados')
      } else {
        setData(res.data)
      }
    } catch {
      setError('Error de red al obtener empleados')
    } finally {
      setLoading(false)
    }
  }

  // Derive city list from loaded data
  const cities = data
    ? Array.from(new Set(data.map(e => e.city).filter(Boolean))).sort()
    : []

  const filtered = (data ?? []).filter(e => {
    const matchCity = !cityFilter || e.city === cityFilter
    const matchStatus = !statusFilter || e.status === statusFilter
    return matchCity && matchStatus
  })

  const activeCount = (data ?? []).filter(e => e.status === 'active').length

  const countByCity = (data ?? []).reduce<Record<string, number>>((acc, e) => {
    if (e.city) acc[e.city] = (acc[e.city] ?? 0) + 1
    return acc
  }, {})

  const csvData = filtered.map(e => ({
    Nombre: e.name,
    DNI: e.dni,
    Cargo: e.position,
    Area: e.department,
    Ciudad: e.city,
    Estado: e.status,
    FechaIngreso: e.startDate,
  }))

  const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    on_leave: 'Permiso',
  }

  return (
    <div className="space-y-5">
      {/* Filters row */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Ciudad</label>
            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todas</option>
              {cities.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="on_leave">En permiso</option>
            </select>
          </div>
          <button
            onClick={handleGenerar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaFilter />}
            {loading ? 'Cargando...' : 'Generar'}
          </button>
          {filtered.length > 0 && (
            <button
              onClick={() => exportToCSV(csvData as Record<string, unknown>[], 'empleados')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors ml-auto"
            >
              <FaDownload />
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {data !== null && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total empleados" value={data.length} color="text-emerald-400" />
            <StatCard label="Activos" value={activeCount} color="text-green-400" />
            <StatCard label="Mostrando" value={filtered.length} color="text-cyan-400" />
          </div>
          {Object.keys(countByCity).length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Por ciudad</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(countByCity)
                  .sort((a, b) => b[1] - a[1])
                  .map(([city, count]) => (
                    <span
                      key={city}
                      className="px-3 py-1 bg-emerald-900/40 border border-emerald-700/50 rounded-full text-xs text-emerald-300"
                    >
                      {city}: {count}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {loading && (
        <div className="flex justify-center py-16">
          <FaSpinner className="animate-spin text-emerald-400 text-3xl" />
        </div>
      )}

      {!loading && data !== null && filtered.length === 0 && (
        <EmptyState message="No se encontraron empleados con los filtros seleccionados" />
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900/60">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Nombre</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">DNI</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Cargo</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Area</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Ciudad</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Estado</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Fecha Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr
                    key={e.id ?? i}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">{e.name}</td>
                    <td className="px-4 py-3 text-gray-300">{e.dni}</td>
                    <td className="px-4 py-3 text-gray-300">{e.position}</td>
                    <td className="px-4 py-3 text-gray-300">{e.department}</td>
                    <td className="px-4 py-3 text-gray-300">{e.city}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          e.status === 'active'
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : e.status === 'on_leave'
                            ? 'bg-yellow-900/50 text-yellow-300'
                            : 'bg-red-900/50 text-red-300'
                        }`}
                      >
                        {EMPLOYEE_STATUS_LABELS[e.status] ?? e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {e.startDate ? e.startDate.split('T')[0] : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && data === null && !error && (
        <EmptyState message="Presiona Generar para cargar la lista de empleados" />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: typeof FaClock }[] = [
  { id: 'asistencias', label: 'Asistencias', icon: FaClock },
  { id: 'postulaciones', label: 'Postulaciones', icon: FaBriefcase },
  { id: 'empleados', label: 'Empleados', icon: FaUsers },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('asistencias')

  const TAB_COLORS: Record<TabId, string> = {
    asistencias: 'border-cyan-500 text-cyan-400',
    postulaciones: 'border-purple-500 text-purple-400',
    empleados: 'border-emerald-500 text-emerald-400',
  }

  const TAB_ACTIVE_BG: Record<TabId, string> = {
    asistencias: 'bg-cyan-900/20',
    postulaciones: 'bg-purple-900/20',
    empleados: 'bg-emerald-900/20',
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <FaChartLine className="text-cyan-400" />
            Reportes
          </h1>
          <p className="text-gray-400 mt-1">Genera y exporta reportes del sistema</p>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1 bg-gray-800/50 border border-gray-700 rounded-xl p-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? `${TAB_ACTIVE_BG[tab.id]} ${TAB_COLORS[tab.id]} border ${TAB_COLORS[tab.id].split(' ')[0]}`
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Icon className="text-base" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'asistencias' && <AsistenciasTab />}
        {activeTab === 'postulaciones' && <PostulacionesTab />}
        {activeTab === 'empleados' && <EmpleadosTab />}
      </div>
    </AdminLayout>
  )
}
