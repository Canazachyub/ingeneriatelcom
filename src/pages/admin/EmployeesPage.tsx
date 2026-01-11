import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaPlus,
  FaEdit,
  FaExchangeAlt,
  FaKey,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaCheck,
} from 'react-icons/fa'
import { api, Employee } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'

const cities = ['Tacna', 'Puno', 'Arequipa', 'Lima', 'Cusco', 'Juliaca']
const departments = ['Software', 'Ingenieria Electrica', 'TIC', 'Mineria', 'Administracion']
const positions = ['Desarrollador', 'Ingeniero', 'Tecnico', 'Supervisor', 'Gerente', 'Asistente']

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [transferEmployee, setTransferEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    email: string
    phone: string
    dni: string
    position: string
    department: string
    city: string
    status: 'active' | 'inactive' | 'on_leave'
    startDate: string
    salary: string
  }>({
    name: '',
    email: '',
    phone: '',
    dni: '',
    position: '',
    department: '',
    city: '',
    status: 'active',
    startDate: new Date().toISOString().split('T')[0],
    salary: '',
  })
  const [transferData, setTransferData] = useState({
    newCity: '',
    newDepartment: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    setIsLoading(true)
    const result = await api.getEmployees()
    setIsLoading(false)

    if (result.success && result.data) {
      setEmployees(result.data)
    } else {
      // Mock data for demo
      setEmployees([
        {
          id: '1',
          name: 'Juan Perez',
          email: 'juan.perez@telcom.com',
          phone: '+51 946 728 001',
          dni: '12345678',
          position: 'Desarrollador Senior',
          department: 'Software',
          city: 'Tacna',
          status: 'active',
          startDate: '2020-03-15',
          salary: 4500,
          createdAt: '2020-03-15',
          updatedAt: '2024-01-10',
        },
        {
          id: '2',
          name: 'Maria Garcia',
          email: 'maria.garcia@telcom.com',
          phone: '+51 946 728 002',
          dni: '23456789',
          position: 'Ingeniero Electrico',
          department: 'Ingenieria Electrica',
          city: 'Puno',
          status: 'active',
          startDate: '2019-06-01',
          salary: 5000,
          createdAt: '2019-06-01',
          updatedAt: '2024-01-10',
        },
        {
          id: '3',
          name: 'Carlos Lopez',
          email: 'carlos.lopez@telcom.com',
          phone: '+51 946 728 003',
          dni: '34567890',
          position: 'Tecnico TIC',
          department: 'TIC',
          city: 'Arequipa',
          status: 'active',
          startDate: '2021-09-10',
          salary: 3500,
          createdAt: '2021-09-10',
          updatedAt: '2024-01-10',
        },
      ])
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.dni.includes(searchTerm)
    const matchesCity = !filterCity || emp.city === filterCity
    return matchesSearch && matchesCity
  })

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee)
      setFormData({
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        dni: employee.dni,
        position: employee.position,
        department: employee.department,
        city: employee.city,
        status: employee.status,
        startDate: employee.startDate,
        salary: employee.salary?.toString() || '',
      })
    } else {
      setEditingEmployee(null)
      setFormData({
        name: '',
        email: '',
        phone: '',
        dni: '',
        position: '',
        department: '',
        city: '',
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
        salary: '',
      })
    }
    setShowModal(true)
  }

  const handleOpenTransferModal = (employee: Employee) => {
    setTransferEmployee(employee)
    setTransferData({
      newCity: '',
      newDepartment: '',
    })
    setShowTransferModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage({ type: '', text: '' })

    const data = {
      ...formData,
      salary: formData.salary ? parseFloat(formData.salary) : undefined,
    }

    let result
    if (editingEmployee) {
      result = await api.updateEmployee(editingEmployee.id, data)
    } else {
      result = await api.createEmployee(data)
    }

    setIsSaving(false)

    if (result.success) {
      setMessage({ type: 'success', text: editingEmployee ? 'Empleado actualizado' : 'Empleado creado' })
      setShowModal(false)
      loadEmployees()
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al guardar' })
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferEmployee || !transferData.newCity) return

    setIsSaving(true)
    const result = await api.transferEmployee(
      transferEmployee.id,
      transferData.newCity,
      transferData.newDepartment || undefined
    )
    setIsSaving(false)

    if (result.success) {
      setMessage({ type: 'success', text: 'Empleado transferido exitosamente' })
      setShowTransferModal(false)
      loadEmployees()
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al transferir' })
    }
  }

  const handleCreateCredentials = async (employee: Employee) => {
    if (!confirm(`Crear credenciales para ${employee.name}?`)) return

    const result = await api.createEmployeeCredentials(employee.id)
    if (result.success && result.data) {
      alert(`Credenciales creadas:\nEmail: ${result.data.email}\nContrasena temporal: ${result.data.tempPassword}`)
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al crear credenciales' })
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400',
      inactive: 'bg-red-500/20 text-red-400',
      on_leave: 'bg-yellow-500/20 text-yellow-400',
    }
    const labels: Record<string, string> = {
      active: 'Activo',
      inactive: 'Inactivo',
      on_leave: 'Licencia',
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
            <h1 className="text-2xl font-display font-bold text-white">Empleados</h1>
            <p className="text-primary-400">Gestiona el personal de la empresa</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <FaPlus />
            Nuevo Empleado
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
              placeholder="Buscar por nombre, email o DNI..."
              className="w-full pl-10 pr-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
            />
          </div>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
          >
            <option value="">Todas las ciudades</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-3xl text-accent-electric" />
          </div>
        ) : (
          <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary-800">
                    <th className="px-6 py-4 text-left text-sm font-medium text-primary-300">Nombre</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-primary-300">Cargo</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-primary-300">Ciudad</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-primary-300">Estado</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-primary-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b border-primary-800/50 hover:bg-primary-800/30">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{employee.name}</p>
                          <p className="text-primary-400 text-sm">{employee.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white">{employee.position}</p>
                          <p className="text-primary-400 text-sm">{employee.department}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white">{employee.city}</td>
                      <td className="px-6 py-4">{getStatusBadge(employee.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(employee)}
                            className="p-2 text-primary-400 hover:text-accent-electric hover:bg-primary-800 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleOpenTransferModal(employee)}
                            className="p-2 text-primary-400 hover:text-accent-electric hover:bg-primary-800 rounded-lg transition-colors"
                            title="Transferir"
                          >
                            <FaExchangeAlt />
                          </button>
                          <button
                            onClick={() => handleCreateCredentials(employee)}
                            className="p-2 text-primary-400 hover:text-accent-electric hover:bg-primary-800 rounded-lg transition-colors"
                            title="Crear Credenciales"
                          >
                            <FaKey />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredEmployees.length === 0 && (
              <div className="text-center py-12 text-primary-400">
                No se encontraron empleados
              </div>
            )}
          </div>
        )}

        {/* Employee Modal */}
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
                    {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-primary-400 hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Nombre Completo
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
                        DNI
                      </label>
                      <input
                        type="text"
                        value={formData.dni}
                        onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                        required
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Telefono
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Cargo
                      </label>
                      <select
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        required
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        <option value="">Seleccionar</option>
                        {positions.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">
                        Departamento
                      </label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        required
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        <option value="">Seleccionar</option>
                        {departments.map((dep) => (
                          <option key={dep} value={dep}>
                            {dep}
                          </option>
                        ))}
                      </select>
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
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'on_leave' })}
                        className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                      >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                        <option value="on_leave">Licencia</option>
                      </select>
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
                        Salario (S/.)
                      </label>
                      <input
                        type="number"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
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
                      {isSaving ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaCheck />
                      )}
                      {editingEmployee ? 'Actualizar' : 'Crear'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transfer Modal */}
        <AnimatePresence>
          {showTransferModal && transferEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowTransferModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-primary-900 rounded-xl border border-primary-800 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-primary-800">
                  <h2 className="text-xl font-display font-semibold text-white">
                    Transferir Empleado
                  </h2>
                  <button
                    onClick={() => setShowTransferModal(false)}
                    className="text-primary-400 hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={handleTransfer} className="p-6 space-y-4">
                  <div className="bg-primary-800/50 rounded-lg p-4 mb-4">
                    <p className="text-white font-medium">{transferEmployee.name}</p>
                    <p className="text-primary-400 text-sm">
                      Actualmente en: {transferEmployee.city} - {transferEmployee.department}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1">
                      Nueva Ciudad
                    </label>
                    <select
                      value={transferData.newCity}
                      onChange={(e) => setTransferData({ ...transferData, newCity: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                    >
                      <option value="">Seleccionar</option>
                      {cities
                        .filter((c) => c !== transferEmployee.city)
                        .map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1">
                      Nuevo Departamento (opcional)
                    </label>
                    <select
                      value={transferData.newDepartment}
                      onChange={(e) => setTransferData({ ...transferData, newDepartment: e.target.value })}
                      className="w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
                    >
                      <option value="">Mantener actual</option>
                      {departments.map((dep) => (
                        <option key={dep} value={dep}>
                          {dep}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-primary-800">
                    <button
                      type="button"
                      onClick={() => setShowTransferModal(false)}
                      className="px-4 py-2 text-primary-300 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-primary flex items-center gap-2"
                    >
                      {isSaving ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaExchangeAlt />
                      )}
                      Transferir
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}
