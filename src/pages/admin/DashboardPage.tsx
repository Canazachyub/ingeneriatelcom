import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FaUsers,
  FaProjectDiagram,
  FaFileAlt,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaSpinner,
} from 'react-icons/fa'
import { api, DashboardStats } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'

const statCards = [
  { key: 'totalEmployees', label: 'Empleados', icon: FaUsers, color: 'bg-blue-500' },
  { key: 'activeProjects', label: 'Proyectos Activos', icon: FaProjectDiagram, color: 'bg-green-500' },
  { key: 'pendingApplications', label: 'Postulaciones Pendientes', icon: FaFileAlt, color: 'bg-yellow-500' },
  { key: 'completedProjects', label: 'Proyectos Completados', icon: FaCheckCircle, color: 'bg-purple-500' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setIsLoading(true)
    setError('')
    const result = await api.getDashboardStats()
    setIsLoading(false)

    if (result.success && result.data) {
      setStats(result.data)
    } else {
      setError(result.error || 'Error al cargar estadisticas')
      // Set mock data for demo
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
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Dashboard</h1>
          <p className="text-primary-400">Resumen general del sistema</p>
        </div>

        {error && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
            {error} - Mostrando datos de ejemplo
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-3xl text-accent-electric" />
          </div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card, index) => (
                <motion.div
                  key={card.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                      <card.icon className="text-xl text-white" />
                    </div>
                    <div>
                      <p className="text-3xl font-display font-bold text-white">
                        {stats[card.key as keyof DashboardStats] as number}
                      </p>
                      <p className="text-primary-400 text-sm">{card.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Employees by City */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-6"
              >
                <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-accent-electric" />
                  Empleados por Ciudad
                </h3>
                <div className="space-y-4">
                  {Object.entries(stats.employeesByCity || {}).map(([city, count]) => (
                    <div key={city}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-primary-300">{city}</span>
                        <span className="text-white font-medium">{count}</span>
                      </div>
                      <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-electric rounded-full transition-all duration-500"
                          style={{
                            width: `${(count / stats.totalEmployees) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Projects by Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-6"
              >
                <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                  <FaProjectDiagram className="text-accent-electric" />
                  Proyectos por Estado
                </h3>
                <div className="space-y-4">
                  {Object.entries(stats.projectsByStatus || {}).map(([status, count]) => {
                    const statusLabels: Record<string, string> = {
                      planning: 'Planificacion',
                      in_progress: 'En Progreso',
                      completed: 'Completados',
                      on_hold: 'En Espera',
                    }
                    const statusColors: Record<string, string> = {
                      planning: 'bg-blue-500',
                      in_progress: 'bg-green-500',
                      completed: 'bg-purple-500',
                      on_hold: 'bg-yellow-500',
                    }
                    const total = Object.values(stats.projectsByStatus || {}).reduce((a, b) => a + b, 0)
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-primary-300">{statusLabels[status] || status}</span>
                          <span className="text-white font-medium">{count}</span>
                        </div>
                        <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${statusColors[status] || 'bg-accent-electric'} rounded-full transition-all duration-500`}
                            style={{
                              width: `${(count / total) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-6"
            >
              <h3 className="text-lg font-display font-semibold text-white mb-4">
                Acciones Rapidas
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <a
                  href="/admin/empleados"
                  className="p-4 bg-primary-800/50 rounded-lg hover:bg-primary-800 transition-colors text-center"
                >
                  <FaUsers className="text-2xl text-accent-electric mx-auto mb-2" />
                  <span className="text-primary-200 text-sm">Nuevo Empleado</span>
                </a>
                <a
                  href="/admin/proyectos"
                  className="p-4 bg-primary-800/50 rounded-lg hover:bg-primary-800 transition-colors text-center"
                >
                  <FaProjectDiagram className="text-2xl text-accent-electric mx-auto mb-2" />
                  <span className="text-primary-200 text-sm">Nuevo Proyecto</span>
                </a>
                <a
                  href="/admin/bolsa-trabajo"
                  className="p-4 bg-primary-800/50 rounded-lg hover:bg-primary-800 transition-colors text-center"
                >
                  <FaFileAlt className="text-2xl text-accent-electric mx-auto mb-2" />
                  <span className="text-primary-200 text-sm">Nueva Oferta</span>
                </a>
                <a
                  href="/admin/postulaciones"
                  className="p-4 bg-primary-800/50 rounded-lg hover:bg-primary-800 transition-colors text-center"
                >
                  <FaCheckCircle className="text-2xl text-accent-electric mx-auto mb-2" />
                  <span className="text-primary-200 text-sm">Ver Postulaciones</span>
                </a>
              </div>
            </motion.div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  )
}
