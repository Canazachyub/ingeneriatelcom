import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FaChartLine,
  FaUsers,
  FaClock,
  FaBriefcase,
  FaDownload,
  FaCalendarAlt,
  FaSpinner,
} from 'react-icons/fa'
import AdminLayout from '../../components/admin/AdminLayout'

type ReportType = 'asistencias' | 'empleados' | 'postulaciones'

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('asistencias')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [isGenerating, setIsGenerating] = useState(false)

  const reportTypes = [
    {
      id: 'asistencias' as ReportType,
      name: 'Reporte de Asistencias',
      icon: FaClock,
      description: 'Registro de entradas y salidas del personal',
      color: 'from-cyan-500 to-blue-600'
    },
    {
      id: 'empleados' as ReportType,
      name: 'Reporte de Empleados',
      icon: FaUsers,
      description: 'Lista del personal activo e inactivo',
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'postulaciones' as ReportType,
      name: 'Reporte de Postulaciones',
      icon: FaBriefcase,
      description: 'Estadisticas de la bolsa de trabajo',
      color: 'from-purple-500 to-violet-600'
    },
  ]

  const handleGenerateReport = async () => {
    setIsGenerating(true)

    // Simular generacion de reporte
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Aqui iria la logica real para generar el reporte
    // Por ahora solo mostramos un mensaje
    alert(`Reporte de ${selectedReport} generado para el periodo ${dateRange.start} - ${dateRange.end}`)

    setIsGenerating(false)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <FaChartLine className="text-accent-electric" />
            Reportes
          </h1>
          <p className="text-primary-400 mt-1">Genera reportes y exporta datos del sistema</p>
        </div>

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportTypes.map((report) => (
            <motion.button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-6 rounded-xl border transition-all text-left ${
                selectedReport === report.id
                  ? 'bg-primary-800/50 border-accent-electric shadow-lg shadow-accent-electric/20'
                  : 'bg-primary-900/50 border-primary-800 hover:border-primary-700'
              }`}
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${report.color} rounded-xl flex items-center justify-center mb-4`}>
                <report.icon className="text-xl text-white" />
              </div>
              <h3 className="text-white font-semibold mb-1">{report.name}</h3>
              <p className="text-primary-400 text-sm">{report.description}</p>
              {selectedReport === report.id && (
                <motion.div
                  layoutId="selectedIndicator"
                  className="absolute top-4 right-4 w-3 h-3 bg-accent-electric rounded-full"
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* Date Range */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-6"
        >
          <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
            <FaCalendarAlt className="text-accent-electric" />
            Rango de Fechas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-300 mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-4 py-3 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-300 mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-4 py-3 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
              />
            </div>
          </div>

          {/* Quick Date Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => {
                const today = new Date()
                setDateRange({
                  start: today.toISOString().split('T')[0],
                  end: today.toISOString().split('T')[0]
                })
              }}
              className="px-3 py-1.5 text-sm bg-primary-800 text-primary-300 rounded-lg hover:bg-primary-700 hover:text-white transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                setDateRange({
                  start: weekAgo.toISOString().split('T')[0],
                  end: today.toISOString().split('T')[0]
                })
              }}
              className="px-3 py-1.5 text-sm bg-primary-800 text-primary-300 rounded-lg hover:bg-primary-700 hover:text-white transition-colors"
            >
              Ultima semana
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                setDateRange({
                  start: firstDay.toISOString().split('T')[0],
                  end: today.toISOString().split('T')[0]
                })
              }}
              className="px-3 py-1.5 text-sm bg-primary-800 text-primary-300 rounded-lg hover:bg-primary-700 hover:text-white transition-colors"
            >
              Este mes
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1)
                setDateRange({
                  start: threeMonthsAgo.toISOString().split('T')[0],
                  end: today.toISOString().split('T')[0]
                })
              }}
              className="px-3 py-1.5 text-sm bg-primary-800 text-primary-300 rounded-lg hover:bg-primary-700 hover:text-white transition-colors"
            >
              Ultimos 3 meses
            </button>
          </div>
        </motion.div>

        {/* Generate Button */}
        <div className="flex justify-end">
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-2 px-6 py-3"
          >
            {isGenerating ? (
              <>
                <FaSpinner className="animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FaDownload />
                Generar Reporte
              </>
            )}
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-accent-electric/10 border border-accent-electric/30 rounded-xl p-6">
          <h4 className="text-accent-electric font-semibold mb-2">Proximamente</h4>
          <p className="text-primary-300 text-sm">
            La funcionalidad de exportacion a Excel y PDF estara disponible en la proxima actualizacion.
            Por ahora puedes usar la opcion de exportar CSV desde las paginas de Asistencias y Empleados.
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}
