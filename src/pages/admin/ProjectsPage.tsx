import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaPlus,
  FaEdit,
  FaUsers,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaCheck,
  FaUserPlus,
  FaTrash,
} from 'react-icons/fa'
import { api, Project, Employee, EmployeeAssignment } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'

const cities = ['Tacna', 'Puno', 'Arequipa', 'Lima', 'Cusco', 'Juliaca']
const statuses = [
  { value: 'planning', label: 'Planificacion' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'completed', label: 'Completado' },
  { value: 'on_hold', label: 'En Espera' },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    description: string
    client: string
    city: string
    status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
    startDate: string
    endDate: string
    budget: string
  }>({
    name: '',
    description: '',
    client: '',
    city: '',
    status: 'planning',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    budget: '',
  })
  const [assignData, setAssignData] = useState({
    employeeId: '',
    role: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    const [projectsResult, employeesResult] = await Promise.all([
      api.getProjects(),
      api.getEmployees(),
    ])
    setIsLoading(false)

    if (projectsResult.success && projectsResult.data) {
      setProjects(projectsResult.data)
    } else {
      // Mock data
      setProjects([
        {
          id: '1',
          name: 'Sistema de Gestion Electrosur',
          description: 'Desarrollo de sistema de gestion de proyectos para Electrosur',
          client: 'Electrosur',
          city: 'Tacna',
          status: 'in_progress',
          startDate: '2024-01-15',
          endDate: '2024-06-30',
          budget: 85000,
          createdAt: '2024-01-10',
          updatedAt: '2024-01-10',
        },
        {
          id: '2',
          name: 'Red de Comunicaciones UNA Puno',
          description: 'Implementacion de red de comunicaciones para la universidad',
          client: 'Universidad Nacional del Altiplano',
          city: 'Puno',
          status: 'planning',
          startDate: '2024-03-01',
          budget: 120000,
          createdAt: '2024-01-10',
          updatedAt: '2024-01-10',
        },
        {
          id: '3',
          name: 'Supervision Electro Puno',
          description: 'Supervision de obras electricas en la region Puno',
          client: 'Electro Puno',
          city: 'Puno',
          status: 'completed',
          startDate: '2023-06-01',
          endDate: '2023-12-15',
          budget: 65000,
          createdAt: '2023-06-01',
          updatedAt: '2023-12-15',
        },
      ])
    }

    if (employeesResult.success && employeesResult.data) {
      setEmployees(employeesResult.data)
    } else {
      setEmployees([
        { id: '1', name: 'Juan Perez', email: '', phone: '', dni: '', position: 'Desarrollador Senior', department: 'Software', city: 'Tacna', status: 'active', startDate: '', createdAt: '', updatedAt: '' },
        { id: '2', name: 'Maria Garcia', email: '', phone: '', dni: '', position: 'Ingeniero Electrico', department: 'Ingenieria', city: 'Puno', status: 'active', startDate: '', createdAt: '', updatedAt: '' },
      ])
    }
  }

  const loadAssignments = async (projectId: string) => {
    const result = await api.getAssignments(projectId)
    if (result.success && result.data) {
      setAssignments(result.data)
    } else {
      // Mock
      setAssignments([
        { id: '1', employeeId: '1', employeeName: 'Juan Perez', projectId, projectName: '', role: 'Desarrollador', startDate: '2024-01-15', status: 'active' },
      ])
    }
  }

  const filteredProjects = projects.filter((proj) => {
    const matchesSearch =
      proj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proj.client.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || proj.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project)
      setFormData({
        name: project.name,
        description: project.description,
        client: project.client,
        city: project.city,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate || '',
        budget: project.budget?.toString() || '',
      })
    } else {
      setEditingProject(null)
      setFormData({
        name: '',
        description: '',
        client: '',
        city: '',
        status: 'planning',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        budget: '',
      })
    }
    setShowModal(true)
  }

  const handleOpenAssignModal = async (project: Project) => {
    setSelectedProject(project)
    await loadAssignments(project.id)
    setAssignData({ employeeId: '', role: '' })
    setShowAssignModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage({ type: '', text: '' })

    const data = {
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      endDate: formData.endDate || undefined,
    }

    let result
    if (editingProject) {
      result = await api.updateProject(editingProject.id, data)
    } else {
      result = await api.createProject(data)
    }

    setIsSaving(false)

    if (result.success) {
      setMessage({ type: 'success', text: editingProject ? 'Proyecto actualizado' : 'Proyecto creado' })
      setShowModal(false)
      loadData()
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al guardar' })
    }
  }

  const handleAssignEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject || !assignData.employeeId || !assignData.role) return

    setIsSaving(true)
    const result = await api.assignEmployee(selectedProject.id, assignData.employeeId, assignData.role)
    setIsSaving(false)

    if (result.success) {
      setMessage({ type: 'success', text: 'Empleado asignado' })
      setAssignData({ employeeId: '', role: '' })
      loadAssignments(selectedProject.id)
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al asignar' })
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remover este empleado del proyecto?')) return

    const result = await api.removeAssignment(assignmentId)
    if (result.success && selectedProject) {
      loadAssignments(selectedProject.id)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      planning: 'bg-blue-500/20 text-blue-400',
      in_progress: 'bg-green-500/20 text-green-400',
      completed: 'bg-purple-500/20 text-purple-400',
      on_hold: 'bg-yellow-500/20 text-yellow-400',
    }
    const labels: Record<string, string> = {
      planning: 'Planificacion',
      in_progress: 'En Progreso',
      completed: 'Completado',
      on_hold: 'En Espera',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Proyectos</h1>
            <p className="text-primary-400">Gestiona los proyectos de la empresa</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <FaPlus />
            Nuevo Proyecto
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o cliente..."
              className="w-full pl-10 pr-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
          >
            <option value="">Todos los estados</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-3xl text-accent-electric" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                    <p className="text-primary-400 text-sm">{project.client}</p>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
                <p className="text-primary-300 text-sm mb-4 line-clamp-2">
                  {project.description}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-primary-500">Ciudad:</span>
                    <span className="text-white ml-2">{project.city}</span>
                  </div>
                  <div>
                    <span className="text-primary-500">Inicio:</span>
                    <span className="text-white ml-2">{project.startDate}</span>
                  </div>
                  {project.budget && (
                    <div>
                      <span className="text-primary-500">Presupuesto:</span>
                      <span className="text-white ml-2">S/. {project.budget.toLocaleString()}</span>
                    </div>
                  )}
                  {project.endDate && (
                    <div>
                      <span className="text-primary-500">Fin:</span>
                      <span className="text-white ml-2">{project.endDate}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-primary-800">
                  <button
                    onClick={() => handleOpenModal(project)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-800 hover:bg-primary-700 rounded-lg text-primary-200 hover:text-white transition-colors"
                  >
                    <FaEdit />
                    Editar
                  </button>
                  <button
                    onClick={() => handleOpenAssignModal(project)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-electric/20 hover:bg-accent-electric/30 rounded-lg text-accent-electric transition-colors"
                  >
                    <FaUsers />
                    Equipo
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredProjects.length === 0 && !isLoading && (
          <div className="text-center py-12 text-primary-400">
            No se encontraron proyectos
          </div>
        )}

        {/* Project Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-primary-900 rounded-xl border border-primary-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-primary-800">
                  <h2 className="text-xl font-display font-semibold text-white">
                    {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-primary-400 hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1">
                      Nombre del Proyecto
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1">
                      Descripcion
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Cliente
                      </label>
                      <input
                        type="text"
                        value={formData.client}
                        onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                        required
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Ciudad
                      </label>
                      <select
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        <option value="">Seleccionar</option>
                        {cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Estado
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        {statuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Presupuesto (S/.)
                      </label>
                      <input
                        type="number"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Fecha de Inicio
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Fecha de Fin (opcional)
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-primary-800">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-primary-300 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-primary flex items-center gap-2"
                    >
                      {isSaving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                      {editingProject ? 'Actualizar' : 'Crear'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assign Modal */}
        <AnimatePresence>
          {showAssignModal && selectedProject && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowAssignModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-primary-900 rounded-xl border border-primary-800 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-primary-800">
                  <div>
                    <h2 className="text-xl font-display font-semibold text-white">
                      Equipo del Proyecto
                    </h2>
                    <p className="text-primary-400 text-sm">{selectedProject.name}</p>
                  </div>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="text-primary-400 hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="p-6">
                  {/* Current Assignments */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-primary-300 mb-3">Empleados Asignados</h3>
                    {assignments.length > 0 ? (
                      <div className="space-y-2">
                        {assignments.map((assign) => (
                          <div
                            key={assign.id}
                            className="flex items-center justify-between bg-primary-800/50 rounded-lg p-3"
                          >
                            <div>
                              <p className="text-white">{assign.employeeName}</p>
                              <p className="text-primary-400 text-sm">{assign.role}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveAssignment(assign.id)}
                              className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-primary-500 text-sm">No hay empleados asignados</p>
                    )}
                  </div>

                  {/* Add Assignment */}
                  <form onSubmit={handleAssignEmployee} className="space-y-4 pt-4 border-t border-primary-800">
                    <h3 className="text-sm font-medium text-primary-300">Agregar Empleado</h3>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Empleado
                      </label>
                      <select
                        value={assignData.employeeId}
                        onChange={(e) => setAssignData({ ...assignData, employeeId: e.target.value })}
                        required
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        <option value="">Seleccionar</option>
                        {employees
                          .filter((emp) => !assignments.some((a) => a.employeeId === emp.id))
                          .map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} - {emp.position}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Rol en el Proyecto
                      </label>
                      <input
                        type="text"
                        value={assignData.role}
                        onChange={(e) => setAssignData({ ...assignData, role: e.target.value })}
                        required
                        placeholder="Ej: Desarrollador, Supervisor, etc."
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full btn-primary flex items-center justify-center gap-2"
                    >
                      {isSaving ? <FaSpinner className="animate-spin" /> : <FaUserPlus />}
                      Asignar Empleado
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}
