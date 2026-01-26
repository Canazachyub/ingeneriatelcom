import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FaUsers,
  FaProjectDiagram,
  FaFileAlt,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaSpinner,
  FaClock,
  FaBriefcase,
  FaUserCheck,
  FaUserTimes,
  FaCalendarAlt,
  FaArrowRight,
  FaExclamationTriangle,
  FaChartLine,
  FaEnvelope,
  FaPlus,
} from 'react-icons/fa'
import { api, DashboardStats } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'

interface AttendanceToday {
  fecha: string
  totalEmpleados: number
  presentes: number
  registros: Array<{
    employeeName: string
    checkIn: string
    checkOut: string
  }>
}

const statCards = [
  { key: 'totalEmployees', label: 'Empleados Activos', icon: FaUsers, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-500/10' },
  { key: 'activeProjects', label: 'Proyectos Activos', icon: FaProjectDiagram, color: 'from-green-500 to-emerald-600', bgColor: 'bg-green-500/10' },
  { key: 'pendingApplications', label: 'Postulaciones Pendientes', icon: FaFileAlt, color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-500/10' },
  { key: 'completedProjects', label: 'Proyectos Completados', icon: FaCheckCircle, color: 'from-purple-500 to-violet-600', bgColor: 'bg-purple-500/10' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [attendance, setAttendance] = useState<AttendanceToday | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    setError('')

    // Cargar estadisticas y asistencia en paralelo
    const [statsResult, attendanceResult] = await Promise.all([
      api.getDashboardStats(),
      api.getAttendanceToday()
    ])

    setIsLoading(false)

    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data)
    } else {
      setError(statsResult.error || 'Error al cargar estadisticas')
      // Datos de ejemplo
      setStats({
        totalEmployees: 15,
        activeProjects: 5,
        pendingApplications: 8,
        completedProjects: 19,
        employeesByCity: {
          'Tacna': 8,
          'Puno': 4,
          'Arequipa': 3,
        },
        projectsByStatus: {
          'planning': 2,
          'in_progress': 5,
          'completed': 19,
          'on_hold': 1,
        },
      })
    }

    if (attendanceResult.success && attendanceResult.data) {
      setAttendance(attendanceResult.data as AttendanceToday)
    } else {
      // Datos de ejemplo
      setAttendance({
        fecha: new Date().toISOString().split('T')[0],
        totalEmpleados: 15,
        presentes: 12,
        registros: []
      })
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos dias'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const attendancePercentage = attendance && attendance.totalEmpleados > 0
    ? Math.round((attendance.presentes / attendance.totalEmpleados) * 100)
    : 0

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">
              {getGreeting()}
            </h1>
            <p className="text-primary-400 mt-1">
              Resumen de hoy, {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/admin/empleados"
              className="flex items-center gap-2 px-4 py-2 bg-accent-electric text-white rounded-lg hover:bg-accent-electric/90 transition-colors text-sm font-medium"
            >
              <FaPlus className="text-xs" />
              Nuevo Empleado
            </Link>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3"
          >
            <FaExclamationTriangle className="text-yellow-400" />
            <span className="text-yellow-400 text-sm">{error} - Mostrando datos de ejemplo</span>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-16 h-16 border-4 border-accent-electric/20 rounded-full" />
                <div className="w-16 h-16 border-4 border-accent-electric border-t-transparent rounded-full animate-spin absolute inset-0" />
              </div>
              <p className="text-primary-400 mt-4">Cargando dashboard...</p>
            </div>
          </div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card, index) => (
                <motion.div
                  key={card.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative overflow-hidden bg-primary-900/50 backdrop-blur-sm rounded-2xl border border-primary-800 p-6 hover:border-primary-700 transition-colors`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 ${card.bgColor} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`} />
                  <div className="relative">
                    <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                      <card.icon className="text-xl text-white" />
                    </div>
                    <p className="text-4xl font-display font-bold text-white mb-1">
                      {Number(stats[card.key as keyof DashboardStats]) || 0}
                    </p>
                    <p className="text-primary-400 text-sm">{card.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Asistencia de Hoy + Acciones Rapidas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Asistencia Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-1 bg-gradient-to-br from-accent-electric/20 to-blue-600/10 backdrop-blur-sm rounded-2xl border border-accent-electric/30 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                    <FaClock className="text-accent-electric" />
                    Asistencia Hoy
                  </h3>
                  <Link to="/admin/asistencias" className="text-accent-electric text-sm hover:underline flex items-center gap-1">
                    Ver todo <FaArrowRight className="text-xs" />
                  </Link>
                </div>

                {attendance && (
                  <>
                    {/* Circular Progress */}
                    <div className="flex items-center justify-center mb-6">
                      <div className="relative w-32 h-32">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="none"
                            className="text-primary-800"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 56}`}
                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - attendancePercentage / 100)}`}
                            className="text-accent-electric transition-all duration-1000"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-bold text-white">{attendancePercentage}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-500/10 rounded-xl p-4 text-center">
                        <FaUserCheck className="text-2xl text-green-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{attendance.presentes || 0}</p>
                        <p className="text-xs text-primary-400">Presentes</p>
                      </div>
                      <div className="bg-red-500/10 rounded-xl p-4 text-center">
                        <FaUserTimes className="text-2xl text-red-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{(attendance.totalEmpleados || 0) - (attendance.presentes || 0)}</p>
                        <p className="text-xs text-primary-400">Ausentes</p>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>

              {/* Acciones Rapidas */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-2 bg-primary-900/50 backdrop-blur-sm rounded-2xl border border-primary-800 p-6"
              >
                <h3 className="text-lg font-display font-semibold text-white mb-6">
                  Acciones Rapidas
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link
                    to="/admin/empleados"
                    className="group p-4 bg-primary-800/50 rounded-xl hover:bg-blue-500/20 hover:border-blue-500/30 border border-transparent transition-all text-center"
                  >
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <FaUsers className="text-xl text-blue-400" />
                    </div>
                    <span className="text-primary-200 text-sm font-medium">Empleados</span>
                  </Link>
                  <Link
                    to="/admin/proyectos"
                    className="group p-4 bg-primary-800/50 rounded-xl hover:bg-green-500/20 hover:border-green-500/30 border border-transparent transition-all text-center"
                  >
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <FaProjectDiagram className="text-xl text-green-400" />
                    </div>
                    <span className="text-primary-200 text-sm font-medium">Proyectos</span>
                  </Link>
                  <Link
                    to="/admin/bolsa-trabajo"
                    className="group p-4 bg-primary-800/50 rounded-xl hover:bg-purple-500/20 hover:border-purple-500/30 border border-transparent transition-all text-center"
                  >
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <FaBriefcase className="text-xl text-purple-400" />
                    </div>
                    <span className="text-primary-200 text-sm font-medium">Vacantes</span>
                  </Link>
                  <Link
                    to="/admin/postulaciones"
                    className="group p-4 bg-primary-800/50 rounded-xl hover:bg-amber-500/20 hover:border-amber-500/30 border border-transparent transition-all text-center"
                  >
                    <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <FaFileAlt className="text-xl text-amber-400" />
                    </div>
                    <span className="text-primary-200 text-sm font-medium">Postulaciones</span>
                  </Link>
                  <Link
                    to="/admin/asistencias"
                    className="group p-4 bg-primary-800/50 rounded-xl hover:bg-cyan-500/20 hover:border-cyan-500/30 border border-transparent transition-all text-center"
                  >
                    <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <FaClock className="text-xl text-cyan-400" />
                    </div>
                    <span className="text-primary-200 text-sm font-medium">Asistencias</span>
                  </Link>
                  <Link
                    to="/admin/mensajes"
                    className="group p-4 bg-primary-800/50 rounded-xl hover:bg-pink-500/20 hover:border-pink-500/30 border border-transparent transition-all text-center"
                  >
                    <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <FaEnvelope className="text-xl text-pink-400" />
                    </div>
                    <span className="text-primary-200 text-sm font-medium">Mensajes</span>
                  </Link>
                  <Link
                    to="/admin/reportes"
                    className="group p-4 bg-primary-800/50 rounded-xl hover:bg-teal-500/20 hover:border-teal-500/30 border border-transparent transition-all text-center"
                  >
                    <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <FaChartLine className="text-xl text-teal-400" />
                    </div>
                    <span className="text-primary-200 text-sm font-medium">Reportes</span>
                  </Link>
                  <a
                    href="/asistencia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 bg-primary-800/50 rounded-xl hover:bg-accent-electric/20 hover:border-accent-electric/30 border border-transparent transition-all text-center"
                  >
                    <div className="w-12 h-12 bg-accent-electric/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <FaCalendarAlt className="text-xl text-accent-electric" />
                    </div>
                    <span className="text-primary-200 text-sm font-medium">Kiosko</span>
                  </a>
                </div>
              </motion.div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Employees by City */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-primary-900/50 backdrop-blur-sm rounded-2xl border border-primary-800 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                    <FaMapMarkerAlt className="text-accent-electric" />
                    Empleados por Ciudad
                  </h3>
                  <span className="text-primary-500 text-sm">{stats.totalEmployees || 0} total</span>
                </div>
                <div className="space-y-4">
                  {Object.entries(stats.employeesByCity || {}).map(([city, count], index) => {
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500']
                    return (
                      <motion.div
                        key={city}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                      >
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-primary-300 font-medium">{city}</span>
                          <span className="text-white font-semibold">{count} empleados</span>
                        </div>
                        <div className="h-3 bg-primary-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.totalEmployees > 0 ? (count / stats.totalEmployees) * 100 : 0}%` }}
                            transition={{ duration: 1, delay: 0.7 + index * 0.1 }}
                            className={`h-full ${colors[index % colors.length]} rounded-full`}
                          />
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Projects by Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-primary-900/50 backdrop-blur-sm rounded-2xl border border-primary-800 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                    <FaProjectDiagram className="text-accent-electric" />
                    Proyectos por Estado
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(stats.projectsByStatus || {}).map(([status, count]) => {
                    const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: JSX.Element }> = {
                      planning: { label: 'Planificacion', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: <FaCalendarAlt /> },
                      in_progress: { label: 'En Progreso', color: 'text-green-400', bgColor: 'bg-green-500/10', icon: <FaSpinner className="animate-spin" /> },
                      completed: { label: 'Completados', color: 'text-purple-400', bgColor: 'bg-purple-500/10', icon: <FaCheckCircle /> },
                      on_hold: { label: 'En Espera', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: <FaExclamationTriangle /> },
                    }
                    const config = statusConfig[status] || { label: status, color: 'text-gray-400', bgColor: 'bg-gray-500/10', icon: <FaProjectDiagram /> }
                    return (
                      <motion.div
                        key={status}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 }}
                        className={`${config.bgColor} rounded-xl p-4`}
                      >
                        <div className={`${config.color} text-2xl mb-2`}>{config.icon}</div>
                        <p className="text-2xl font-bold text-white">{count}</p>
                        <p className={`text-sm ${config.color}`}>{config.label}</p>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  )
}
