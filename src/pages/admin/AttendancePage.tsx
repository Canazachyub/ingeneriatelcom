import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaSearch,
  FaSpinner,
  FaCalendarAlt,
  FaClock,
  FaUserCheck,
  FaUserTimes,
  FaMapMarkerAlt,
  FaDownload,
  FaEye,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeDni: string
  date: string
  checkIn: string
  checkOut: string
  checkInLat?: number
  checkInLng?: number
  checkOutLat?: number
  checkOutLng?: number
  status: string
  hoursWorked?: number
}

interface AttendanceSummary {
  fecha: string
  totalEmpleados: number
  presentes: number
  registros: Array<{
    employeeName: string
    checkIn: string
    checkOut: string
  }>
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    setIsLoading(true)

    // Cargar resumen de hoy y registros en paralelo
    const [summaryResult, recordsResult] = await Promise.all([
      api.getAttendanceToday(),
      api.getAttendances({ fecha: selectedDate })
    ])

    setIsLoading(false)

    if (summaryResult.success && summaryResult.data) {
      setSummary(summaryResult.data)
    } else {
      // Datos de ejemplo
      setSummary({
        fecha: selectedDate,
        totalEmpleados: 15,
        presentes: 12,
        registros: []
      })
    }

    if (recordsResult.success && recordsResult.data) {
      setRecords(recordsResult.data)
    } else {
      // Datos de ejemplo para demo
      setRecords([
        {
          id: '1',
          employeeId: 'emp1',
          employeeName: 'Juan Perez',
          employeeDni: '12345678',
          date: selectedDate,
          checkIn: '08:05:23',
          checkOut: '17:30:45',
          checkInLat: -18.0146,
          checkInLng: -70.2536,
          checkOutLat: -18.0146,
          checkOutLng: -70.2536,
          status: 'completed',
          hoursWorked: 9.42
        },
        {
          id: '2',
          employeeId: 'emp2',
          employeeName: 'Maria Garcia',
          employeeDni: '23456789',
          date: selectedDate,
          checkIn: '07:58:12',
          checkOut: '18:15:30',
          checkInLat: -15.8402,
          checkInLng: -70.0219,
          status: 'completed',
          hoursWorked: 10.29
        },
        {
          id: '3',
          employeeId: 'emp3',
          employeeName: 'Carlos Lopez',
          employeeDni: '34567890',
          date: selectedDate,
          checkIn: '08:45:00',
          checkOut: '',
          checkInLat: -16.4090,
          checkInLng: -71.5375,
          status: 'in_progress',
          hoursWorked: 0
        },
      ])
    }
  }

  const filteredRecords = records.filter((record) =>
    record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.employeeDni.includes(searchTerm)
  )

  const changeDate = (days: number) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + days)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const formatTime = (time: string) => {
    if (!time) return '-'
    return time.substring(0, 5)
  }

  const formatHours = (hours?: number) => {
    if (!hours || hours === 0) return '-'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const getStatusBadge = (record: AttendanceRecord) => {
    if (!record.checkIn) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
          Ausente
        </span>
      )
    }
    if (!record.checkOut) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
          Trabajando
        </span>
      )
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
        Completado
      </span>
    )
  }

  const openLocationModal = (record: AttendanceRecord) => {
    setSelectedRecord(record)
    setShowLocationModal(true)
  }

  const exportToCSV = () => {
    const headers = ['Empleado', 'DNI', 'Fecha', 'Entrada', 'Salida', 'Horas Trabajadas', 'Estado']
    const rows = filteredRecords.map(r => [
      r.employeeName,
      r.employeeDni,
      r.date,
      r.checkIn || '-',
      r.checkOut || '-',
      r.hoursWorked?.toFixed(2) || '-',
      !r.checkIn ? 'Ausente' : !r.checkOut ? 'Trabajando' : 'Completado'
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `asistencias-${selectedDate}.csv`
    link.click()
  }

  const attendancePercentage = summary
    ? Math.round((summary.presentes / summary.totalEmpleados) * 100) || 0
    : 0

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Asistencias</h1>
            <p className="text-primary-400">Control de asistencia del personal</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-primary-800 border border-primary-700 text-primary-200 rounded-lg hover:bg-primary-700 hover:text-white transition-colors"
            >
              <FaDownload />
              Exportar CSV
            </button>
            <a
              href="/asistencia"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2"
            >
              <FaClock />
              Abrir Kiosko
            </a>
          </div>
        </div>

        {/* Date Navigation & Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Date Selector */}
          <div className="lg:col-span-2 bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeDate(-1)}
                className="p-2 text-primary-400 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
              >
                <FaChevronLeft />
              </button>
              <div className="flex items-center gap-3">
                <FaCalendarAlt className="text-accent-electric" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white text-lg font-medium focus:outline-none cursor-pointer"
                />
              </div>
              <button
                onClick={() => changeDate(1)}
                className="p-2 text-primary-400 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
                disabled={selectedDate >= new Date().toISOString().split('T')[0]}
              >
                <FaChevronRight />
              </button>
            </div>
            <p className="text-center text-primary-400 text-sm mt-2">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-PE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* Present Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-500/20 to-emerald-600/10 backdrop-blur-sm rounded-xl border border-green-500/30 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <FaUserCheck className="text-xl text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary?.presentes || 0}</p>
                <p className="text-sm text-green-400">Presentes</p>
              </div>
            </div>
          </motion.div>

          {/* Absent Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-red-500/20 to-rose-600/10 backdrop-blur-sm rounded-xl border border-red-500/30 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <FaUserTimes className="text-xl text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {(summary?.totalEmpleados || 0) - (summary?.presentes || 0)}
                </p>
                <p className="text-sm text-red-400">Ausentes</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary-300 text-sm">Asistencia del dia</span>
            <span className="text-white font-semibold">{attendancePercentage}%</span>
          </div>
          <div className="h-3 bg-primary-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${attendancePercentage}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-accent-electric to-blue-500 rounded-full"
            />
          </div>
          <p className="text-primary-500 text-xs mt-2">
            {summary?.presentes || 0} de {summary?.totalEmpleados || 0} empleados han marcado asistencia
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="w-full pl-10 pr-4 py-3 bg-primary-800 border border-primary-700 rounded-xl text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FaSpinner className="animate-spin text-4xl text-accent-electric mx-auto mb-4" />
              <p className="text-primary-400">Cargando asistencias...</p>
            </div>
          </div>
        ) : (
          <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary-800">
                    <th className="px-6 py-4 text-left text-sm font-medium text-primary-300">Empleado</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-primary-300">DNI</th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-primary-300">Entrada</th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-primary-300">Salida</th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-primary-300">Horas</th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-primary-300">Estado</th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-primary-300">Ubicacion</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-primary-800/50 hover:bg-primary-800/30"
                    >
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{record.employeeName}</p>
                      </td>
                      <td className="px-6 py-4 text-primary-300">{record.employeeDni}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-mono ${record.checkIn ? 'text-green-400' : 'text-primary-500'}`}>
                          {formatTime(record.checkIn)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-mono ${record.checkOut ? 'text-blue-400' : 'text-primary-500'}`}>
                          {formatTime(record.checkOut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-white font-medium">
                          {formatHours(record.hoursWorked)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(record)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(record.checkInLat || record.checkOutLat) && (
                          <button
                            onClick={() => openLocationModal(record)}
                            className="p-2 text-primary-400 hover:text-accent-electric hover:bg-primary-800 rounded-lg transition-colors"
                            title="Ver ubicacion"
                          >
                            <FaMapMarkerAlt />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredRecords.length === 0 && (
              <div className="text-center py-12 text-primary-400">
                <FaClock className="text-4xl mx-auto mb-4 opacity-50" />
                <p>No se encontraron registros de asistencia</p>
              </div>
            )}
          </div>
        )}

        {/* Location Modal */}
        <AnimatePresence>
          {showLocationModal && selectedRecord && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowLocationModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-primary-900 rounded-xl border border-primary-800 w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-primary-800">
                  <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
                    <FaMapMarkerAlt className="text-accent-electric" />
                    Ubicacion de Marcado
                  </h2>
                  <button
                    onClick={() => setShowLocationModal(false)}
                    className="text-primary-400 hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="bg-primary-800/50 rounded-lg p-4">
                    <p className="text-white font-medium">{selectedRecord.employeeName}</p>
                    <p className="text-primary-400 text-sm">DNI: {selectedRecord.employeeDni}</p>
                    <p className="text-primary-400 text-sm">Fecha: {selectedRecord.date}</p>
                  </div>

                  {selectedRecord.checkInLat && (
                    <div>
                      <p className="text-sm text-primary-300 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        Entrada: {formatTime(selectedRecord.checkIn)}
                      </p>
                      <div className="bg-primary-800 rounded-lg p-4">
                        <p className="text-white font-mono text-sm">
                          Lat: {selectedRecord.checkInLat?.toFixed(6)}
                        </p>
                        <p className="text-white font-mono text-sm">
                          Lng: {selectedRecord.checkInLng?.toFixed(6)}
                        </p>
                        <a
                          href={`https://www.google.com/maps?q=${selectedRecord.checkInLat},${selectedRecord.checkInLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-accent-electric text-sm hover:underline"
                        >
                          <FaEye className="text-xs" />
                          Ver en Google Maps
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedRecord.checkOutLat && (
                    <div>
                      <p className="text-sm text-primary-300 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                        Salida: {formatTime(selectedRecord.checkOut)}
                      </p>
                      <div className="bg-primary-800 rounded-lg p-4">
                        <p className="text-white font-mono text-sm">
                          Lat: {selectedRecord.checkOutLat?.toFixed(6)}
                        </p>
                        <p className="text-white font-mono text-sm">
                          Lng: {selectedRecord.checkOutLng?.toFixed(6)}
                        </p>
                        <a
                          href={`https://www.google.com/maps?q=${selectedRecord.checkOutLat},${selectedRecord.checkOutLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-accent-electric text-sm hover:underline"
                        >
                          <FaEye className="text-xs" />
                          Ver en Google Maps
                        </a>
                      </div>
                    </div>
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
