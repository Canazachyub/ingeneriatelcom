import { useState, useEffect, useMemo } from 'react'
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
  FaSort,
  FaSortUp,
  FaSortDown,
} from 'react-icons/fa'
import { api, Employee } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'

const cities = ['Tacna', 'Puno', 'Arequipa', 'Lima', 'Cusco', 'Juliaca']
const departments = ['Software', 'Ingenieria Electrica', 'TIC', 'Mineria', 'Administracion']
const positions = ['Desarrollador', 'Ingeniero', 'Tecnico', 'Supervisor', 'Gerente', 'Asistente']

// ─── Field-mapping helpers ────────────────────────────────────────────────────
// The Google Sheet may return Spanish keys (nombre_completo, ciudad_actual, …).
// We support both so the UI works regardless of which version the backend sends.

type RawEmployee = Employee & {
  nombre_completo?: string
  ciudad_actual?: string
  area?: string
  telefono?: string
  fecha_ingreso?: string
}

function getEmpName(emp: RawEmployee): string {
  return emp.nombre_completo || emp.name || ''
}

function getEmpCity(emp: RawEmployee): string {
  return emp.ciudad_actual || emp.city || ''
}

function getEmpArea(emp: RawEmployee): string {
  return emp.area || emp.department || ''
}

function getEmpPhone(emp: RawEmployee): string {
  return emp.telefono || emp.phone || ''
}

function getEmpStartDate(emp: RawEmployee): string {
  return emp.fecha_ingreso || emp.startDate || ''
}

// ─── Status helpers ───────────────────────────────────────────────────────────

type NormalStatus = 'activo' | 'inactivo' | 'licencia'

function normalizeStatus(status: string): NormalStatus {
  const s = (status || '').toLowerCase().trim()
  if (s === 'active' || s === 'activo') return 'activo'
  if (s === 'inactive' || s === 'inactivo') return 'inactivo'
  if (s === 'on_leave' || s === 'licencia') return 'licencia'
  return 'activo'
}

const STATUS_STYLES: Record<NormalStatus, string> = {
  activo:   'bg-green-500/20 text-green-400 border border-green-500/30',
  inactivo: 'bg-red-500/20 text-red-400 border border-red-500/30',
  licencia: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
}

const STATUS_DOT: Record<NormalStatus, string> = {
  activo:   'bg-green-400',
  inactivo: 'bg-red-400',
  licencia: 'bg-yellow-400',
}

const STATUS_LABEL: Record<NormalStatus, string> = {
  activo:   'Activo',
  inactivo: 'Inactivo',
  licencia: 'Licencia',
}

function StatusBadge({ status }: { status: string }) {
  const norm = normalizeStatus(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[norm]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[norm]}`} />
      {STATUS_LABEL[norm]}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc' | null

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<RawEmployee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>(null)

  const [showModal, setShowModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<RawEmployee | null>(null)
  const [transferEmployee, setTransferEmployee] = useState<RawEmployee | null>(null)

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

  const [transferData, setTransferData] = useState({ newCity: '', newDepartment: '' })
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
      setEmployees(result.data as RawEmployee[])
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
          status: 'inactive',
          startDate: '2021-09-10',
          salary: 3500,
          createdAt: '2021-09-10',
          updatedAt: '2024-01-10',
        },
        {
          id: '4',
          name: 'Ana Torres',
          email: 'ana.torres@telcom.com',
          phone: '+51 946 728 004',
          dni: '45678901',
          position: 'Supervisora',
          department: 'Administracion',
          city: 'Lima',
          status: 'on_leave',
          startDate: '2018-11-20',
          salary: 6000,
          createdAt: '2018-11-20',
          updatedAt: '2024-01-10',
        },
      ])
    }
  }

  // ─── Derived area list from actual data ──────────────────────────────────────
  const areaOptions = useMemo(() => {
    const set = new Set<string>()
    employees.forEach((e) => {
      const a = getEmpArea(e)
      if (a) set.add(a)
    })
    return Array.from(set).sort()
  }, [employees])

  // ─── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let activo = 0, inactivo = 0, licencia = 0
    employees.forEach((e) => {
      const s = normalizeStatus(e.status)
      if (s === 'activo') activo++
      else if (s === 'inactivo') inactivo++
      else if (s === 'licencia') licencia++
    })
    return { total: employees.length, activo, inactivo, licencia }
  }, [employees])

  // ─── Filtered + sorted list ───────────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    let list = employees.filter((emp) => {
      const name  = getEmpName(emp).toLowerCase()
      const email = (emp.email || '').toLowerCase()
      const dni   = emp.dni || ''
      const matchesSearch =
        !searchTerm ||
        name.includes(searchTerm.toLowerCase()) ||
        email.includes(searchTerm.toLowerCase()) ||
        dni.includes(searchTerm)

      const matchesCity   = !filterCity   || getEmpCity(emp) === filterCity
      const matchesArea   = !filterArea   || getEmpArea(emp) === filterArea
      const matchesStatus = !filterStatus || normalizeStatus(emp.status) === filterStatus

      return matchesSearch && matchesCity && matchesArea && matchesStatus
    })

    if (sortDir) {
      list = [...list].sort((a, b) => {
        const na = getEmpName(a).toLowerCase()
        const nb = getEmpName(b).toLowerCase()
        return sortDir === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na)
      })
    }

    return list
  }, [employees, searchTerm, filterCity, filterArea, filterStatus, sortDir])

  const toggleSort = () => {
    setSortDir((prev) => (prev === null ? 'asc' : prev === 'asc' ? 'desc' : null))
  }

  // ─── Modals ───────────────────────────────────────────────────────────────────
  const handleOpenModal = (employee?: RawEmployee) => {
    if (employee) {
      setEditingEmployee(employee)
      setFormData({
        name:       getEmpName(employee),
        email:      employee.email      || '',
        phone:      getEmpPhone(employee),
        dni:        employee.dni        || '',
        position:   employee.position   || '',
        department: getEmpArea(employee),
        city:       getEmpCity(employee),
        status:     employee.status as 'active' | 'inactive' | 'on_leave',
        startDate:  getEmpStartDate(employee),
        salary:     employee.salary?.toString() || '',
      })
    } else {
      setEditingEmployee(null)
      setFormData({
        name: '', email: '', phone: '', dni: '',
        position: '', department: '', city: '',
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
        salary: '',
      })
    }
    setShowModal(true)
  }

  const handleOpenTransferModal = (employee: RawEmployee) => {
    setTransferEmployee(employee)
    setTransferData({ newCity: '', newDepartment: '' })
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

  const handleCreateCredentials = async (employee: RawEmployee) => {
    if (!confirm(`Crear credenciales para ${getEmpName(employee)}?`)) return

    const result = await api.createEmployeeCredentials(employee.id)
    if (result.success && result.data) {
      alert(`Credenciales creadas:\nEmail: ${result.data.email}\nContrasena temporal: ${result.data.tempPassword}`)
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al crear credenciales' })
    }
  }

  // ─── Sort icon helper ─────────────────────────────────────────────────────────
  const SortIcon = () => {
    if (sortDir === 'asc')  return <FaSortUp   className="inline ml-1 text-accent-electric" />
    if (sortDir === 'desc') return <FaSortDown className="inline ml-1 text-accent-electric" />
    return <FaSort className="inline ml-1 text-primary-500" />
  }

  // ─── Input class shorthand ────────────────────────────────────────────────────
  const inputCls = 'w-full px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric'

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Empleados</h1>
            <p className="text-primary-400">Gestiona el personal de la empresa</p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
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

        {/* Stats bar */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary-800/60 border border-primary-700 rounded-lg text-sm">
            <span className="text-primary-300">Total:</span>
            <span className="text-white font-bold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-primary-300">Activos:</span>
            <span className="text-green-400 font-bold">{stats.activo}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-primary-300">Inactivos:</span>
            <span className="text-red-400 font-bold">{stats.inactivo}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-primary-300">Licencia:</span>
            <span className="text-yellow-400 font-bold">{stats.licencia}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email o DNI..."
              className="w-full pl-10 pr-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
            />
          </div>

          {/* City filter */}
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
          >
            <option value="">Todas las ciudades</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Area/Department filter */}
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
          >
            <option value="">Todas las areas</option>
            {(areaOptions.length > 0 ? areaOptions : departments).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="licencia">Licencia</option>
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
                  <tr className="border-b border-primary-800 bg-primary-900/40">
                    <th
                      className="px-6 py-4 text-left text-sm font-medium text-primary-300 cursor-pointer select-none hover:text-white transition-colors"
                      onClick={toggleSort}
                    >
                      Empleado <SortIcon />
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-primary-300">
                      Cargo / Area
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-primary-300">
                      Ciudad
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-primary-300">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-primary-300">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b border-primary-800/50 hover:bg-primary-800/30 transition-colors"
                    >
                      {/* Empleado: name + DNI + email stacked */}
                      <td className="px-6 py-4">
                        <p className="text-white font-semibold leading-tight">
                          {getEmpName(employee)}
                        </p>
                        {employee.dni && (
                          <p className="text-primary-500 text-xs mt-0.5">DNI {employee.dni}</p>
                        )}
                        {employee.email && (
                          <p className="text-primary-400 text-xs mt-0.5">{employee.email}</p>
                        )}
                      </td>

                      {/* Cargo + Area stacked */}
                      <td className="px-6 py-4">
                        <p className="text-white text-sm">{employee.position || '—'}</p>
                        <p className="text-primary-400 text-xs mt-0.5">{getEmpArea(employee) || '—'}</p>
                      </td>

                      {/* Ciudad */}
                      <td className="px-6 py-4 text-white text-sm">
                        {getEmpCity(employee) || '—'}
                      </td>

                      {/* Estado badge */}
                      <td className="px-6 py-4">
                        <StatusBadge status={employee.status} />
                      </td>

                      {/* Acciones: always-visible icon buttons */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenModal(employee)}
                            className="p-2 text-primary-400 hover:text-accent-electric hover:bg-primary-800 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenTransferModal(employee)}
                            className="p-2 text-primary-400 hover:text-accent-electric hover:bg-primary-800 rounded-lg transition-colors"
                            title="Transferir"
                          >
                            <FaExchangeAlt size={14} />
                          </button>
                          <button
                            onClick={() => handleCreateCredentials(employee)}
                            className="p-2 text-primary-400 hover:text-accent-electric hover:bg-primary-800 rounded-lg transition-colors"
                            title="Crear Credenciales"
                          >
                            <FaKey size={14} />
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

            {/* Footer count */}
            {filteredEmployees.length > 0 && (
              <div className="px-6 py-3 border-t border-primary-800 text-xs text-primary-500">
                Mostrando {filteredEmployees.length} de {employees.length} empleados
              </div>
            )}
          </div>
        )}

        {/* ── Employee Modal ── */}
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
                  <button onClick={() => setShowModal(false)} className="text-primary-400 hover:text-white">
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Nombre Completo</label>
                      <input type="text" value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">DNI</label>
                      <input type="text" value={formData.dni}
                        onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                        required className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Email</label>
                      <input type="email" value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Telefono</label>
                      <input type="tel" value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Cargo</label>
                      <select value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        required className={inputCls}>
                        <option value="">Seleccionar</option>
                        {positions.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Departamento</label>
                      <select value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        required className={inputCls}>
                        <option value="">Seleccionar</option>
                        {departments.map((dep) => <option key={dep} value={dep}>{dep}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Ciudad</label>
                      <select value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required className={inputCls}>
                        <option value="">Seleccionar</option>
                        {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Estado</label>
                      <select value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'on_leave' })}
                        className={inputCls}>
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                        <option value="on_leave">Licencia</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Fecha de Inicio</label>
                      <input type="date" value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-200 mb-1">Salario (S/.)</label>
                      <input type="number" value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        className={inputCls} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-primary-800">
                    <button type="button" onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-primary-300 hover:text-white transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={isSaving} className="btn-primary flex items-center gap-2">
                      {isSaving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                      {editingEmployee ? 'Actualizar' : 'Crear'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Transfer Modal ── */}
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
                  <h2 className="text-xl font-display font-semibold text-white">Transferir Empleado</h2>
                  <button onClick={() => setShowTransferModal(false)} className="text-primary-400 hover:text-white">
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={handleTransfer} className="p-6 space-y-4">
                  <div className="bg-primary-800/50 rounded-lg p-4">
                    <p className="text-white font-medium">{getEmpName(transferEmployee)}</p>
                    <p className="text-primary-400 text-sm">
                      Actualmente en: {getEmpCity(transferEmployee)} — {getEmpArea(transferEmployee)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1">Nueva Ciudad</label>
                    <select value={transferData.newCity}
                      onChange={(e) => setTransferData({ ...transferData, newCity: e.target.value })}
                      required className={inputCls}>
                      <option value="">Seleccionar</option>
                      {cities
                        .filter((c) => c !== getEmpCity(transferEmployee))
                        .map((city) => <option key={city} value={city}>{city}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1">
                      Nuevo Departamento (opcional)
                    </label>
                    <select value={transferData.newDepartment}
                      onChange={(e) => setTransferData({ ...transferData, newDepartment: e.target.value })}
                      className={inputCls}>
                      <option value="">Mantener actual</option>
                      {departments.map((dep) => <option key={dep} value={dep}>{dep}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-primary-800">
                    <button type="button" onClick={() => setShowTransferModal(false)}
                      className="px-4 py-2 text-primary-300 hover:text-white transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={isSaving} className="btn-primary flex items-center gap-2">
                      {isSaving ? <FaSpinner className="animate-spin" /> : <FaExchangeAlt />}
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
