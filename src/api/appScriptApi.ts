import { config } from '../config/env'
import { JobPosting, JobApplication } from '../types/job.types'
import { ContactForm } from '../types/contact.types'
import {
  ConsultaPostulacionResponse,
  VerificarEmpleadoResponse,
  MarcarAsistenciaResponse,
  GeoLocation,
  EstadoPostulacion
} from '../types/postulacion.types'

// Helper function to map backend status strings to frontend EstadoPostulacion type
function mapBackendEstado(estado: string | undefined | null): EstadoPostulacion {
  if (!estado) return 'recibido'

  const estadoLower = estado.toLowerCase().trim()

  // Map various backend status formats to frontend EstadoPostulacion
  const statusMap: Record<string, EstadoPostulacion> = {
    // Recibido / Pending
    'pending': 'recibido',
    'pendiente': 'recibido',
    'recibido': 'recibido',
    'received': 'recibido',
    'nuevo': 'recibido',
    'new': 'recibido',

    // En revision / Review
    'review': 'en_revision',
    'revision': 'en_revision',
    'en_revision': 'en_revision',
    'en revision': 'en_revision',
    'reviewing': 'en_revision',
    'under_review': 'en_revision',

    // Preseleccionado
    'preselected': 'preseleccionado',
    'preseleccionado': 'preseleccionado',
    'shortlisted': 'preseleccionado',

    // Entrevista programada
    'interview': 'entrevista_programada',
    'entrevista': 'entrevista_programada',
    'entrevista_programada': 'entrevista_programada',
    'interview_scheduled': 'entrevista_programada',
    'scheduled': 'entrevista_programada',

    // Evaluacion pendiente
    'evaluation': 'evaluacion_pendiente',
    'evaluacion': 'evaluacion_pendiente',
    'evaluacion_pendiente': 'evaluacion_pendiente',
    'pending_evaluation': 'evaluacion_pendiente',
    'test': 'evaluacion_pendiente',

    // Aprobado / Hired
    'approved': 'aprobado',
    'aprobado': 'aprobado',
    'hired': 'aprobado',
    'contratado': 'aprobado',
    'accepted': 'aprobado',
    'aceptado': 'aprobado',

    // No seleccionado / Rejected
    'rejected': 'no_seleccionado',
    'rechazado': 'no_seleccionado',
    'no_seleccionado': 'no_seleccionado',
    'not_selected': 'no_seleccionado',
    'declined': 'no_seleccionado',
    'descartado': 'no_seleccionado',
  }

  return statusMap[estadoLower] || 'recibido'
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'employee'
  employeeId?: string
}

export interface Employee {
  id: string
  name: string
  email: string
  phone: string
  dni: string
  position: string
  department: string
  city: string
  status: 'active' | 'inactive' | 'on_leave'
  startDate: string
  salary?: number
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  client: string
  city: string
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
  startDate: string
  endDate?: string
  budget?: number
  createdAt: string
  updatedAt: string
}

export interface EmployeeAssignment {
  id: string
  employeeId: string
  employeeName: string
  projectId: string
  projectName: string
  role: string
  startDate: string
  endDate?: string
  status: 'active' | 'completed' | 'transferred'
}

export interface DashboardStats {
  totalEmployees: number
  activeProjects: number
  pendingApplications: number
  completedProjects: number
  employeesByCity: Record<string, number>
  projectsByStatus: Record<string, number>
}

class AppScriptApi {
  private baseUrl = config.appsScriptUrl
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token')
    }
    return this.token
  }

  private async request<T>(
    action: string,
    _method: 'GET' | 'POST' = 'GET',
    data?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    if (!this.baseUrl) {
      console.warn('Apps Script URL not configured')
      return { success: false, error: 'API not configured' }
    }

    const url = new URL(this.baseUrl)
    url.searchParams.set('action', action)

    const token = this.getToken()
    const requestData = token ? { ...data, token } : data

    // Encode data as URL parameter to avoid CORS preflight
    // Google Apps Script handles GET requests better for CORS
    if (requestData && Object.keys(requestData).length > 0) {
      url.searchParams.set('payload', JSON.stringify(requestData))
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
      })
      return response.json()
    } catch (error) {
      console.error('API request failed:', error)
      return { success: false, error: 'Network error' }
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
    const result = await this.request<{ token: string; user: User }>('login', 'POST', { email, password })
    if (result.success && result.data?.token) {
      this.setToken(result.data.token)
    }
    return result
  }

  async logout(): Promise<void> {
    this.setToken(null)
  }

  async verifyToken(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('verifyToken', 'POST')
  }

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('getDashboard', 'POST')
  }

  // Employees
  async getEmployees(): Promise<ApiResponse<Employee[]>> {
    return this.request<Employee[]>('getEmployees', 'POST')
  }

  async getEmployee(id: string): Promise<ApiResponse<Employee>> {
    return this.request<Employee>('getEmployee', 'POST', { id })
  }

  async createEmployee(employee: Partial<Employee>): Promise<ApiResponse<Employee>> {
    return this.request<Employee>('createEmployee', 'POST', employee as Record<string, unknown>)
  }

  async updateEmployee(id: string, employee: Partial<Employee>): Promise<ApiResponse<Employee>> {
    return this.request<Employee>('updateEmployee', 'POST', { id, ...employee } as Record<string, unknown>)
  }

  async transferEmployee(employeeId: string, newCity: string, newDepartment?: string): Promise<ApiResponse<Employee>> {
    return this.request<Employee>('transferEmployee', 'POST', { employeeId, newCity, newDepartment })
  }

  async createEmployeeCredentials(employeeId: string): Promise<ApiResponse<{ email: string; tempPassword: string }>> {
    return this.request<{ email: string; tempPassword: string }>('createCredentials', 'POST', { employeeId })
  }

  // Projects
  async getProjects(): Promise<ApiResponse<Project[]>> {
    return this.request<Project[]>('getProjects', 'POST')
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return this.request<Project>('getProject', 'POST', { id })
  }

  async createProject(project: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.request<Project>('createProject', 'POST', project as Record<string, unknown>)
  }

  async updateProject(id: string, project: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.request<Project>('updateProject', 'POST', { id, ...project } as Record<string, unknown>)
  }

  // Employee Assignments
  async getAssignments(projectId?: string): Promise<ApiResponse<EmployeeAssignment[]>> {
    return this.request<EmployeeAssignment[]>('getAssignments', 'POST', { projectId })
  }

  async assignEmployee(projectId: string, employeeId: string, role: string): Promise<ApiResponse<EmployeeAssignment>> {
    return this.request<EmployeeAssignment>('assignEmployee', 'POST', { projectId, employeeId, role })
  }

  async removeAssignment(assignmentId: string): Promise<ApiResponse<void>> {
    return this.request<void>('removeAssignment', 'POST', { assignmentId })
  }

  // Job Management (Admin)
  async getJobsAdmin(): Promise<ApiResponse<JobPosting[]>> {
    return this.request<JobPosting[]>('getJobsAdmin', 'POST')
  }

  async createJobAdmin(job: Record<string, unknown>): Promise<ApiResponse<JobPosting>> {
    return this.request<JobPosting>('createJob', 'POST', job)
  }

  async updateJobAdmin(id: string, job: Record<string, unknown>): Promise<ApiResponse<JobPosting>> {
    return this.request<JobPosting>('updateJob', 'POST', { id, ...job })
  }

  async deleteJobAdmin(id: string): Promise<ApiResponse<void>> {
    return this.request<void>('deleteJob', 'POST', { id })
  }

  // Applications Management
  async getApplicationsAdmin(jobId?: string): Promise<ApiResponse<JobApplication[]>> {
    return this.request<JobApplication[]>('getApplicationsAdmin', 'POST', { jobId })
  }

  async updateApplicationStatus(id: string, status: string, notes?: string): Promise<ApiResponse<JobApplication>> {
    return this.request<JobApplication>('updateApplicationStatus', 'POST', { id, status, notes })
  }

  // Jobs
  async getJobs(): Promise<ApiResponse<JobPosting[]>> {
    return this.request<JobPosting[]>('getJobs')
  }

  async getJobById(id: string): Promise<ApiResponse<JobPosting>> {
    const url = new URL(this.baseUrl)
    url.searchParams.set('action', 'getJob')
    url.searchParams.set('id', id)

    try {
      const response = await fetch(url.toString())
      return response.json()
    } catch (error) {
      console.error('API request failed:', error)
      return { success: false, error: 'Network error' }
    }
  }

  // Applications - Envía postulación con CV incluido (usa POST con body para archivos grandes)
  async submitApplication(application: {
    jobId: string
    jobTitle?: string
    fullName: string
    dni: string
    email: string
    phone: string
    linkedIn?: string
    coverLetter?: string
    expectedSalary?: number
    availability: string
    cvFileName?: string
    cvBase64?: string
    cvMimeType?: string
  }): Promise<ApiResponse<{ id: string }>> {
    if (!this.baseUrl) {
      console.warn('Apps Script URL not configured')
      return { success: false, error: 'API not configured' }
    }

    try {
      // Para postulaciones con CV, usar POST con body para evitar límites de URL
      const url = new URL(this.baseUrl)
      url.searchParams.set('action', 'apply')

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(application),
        redirect: 'follow',
      })

      return response.json()
    } catch (error) {
      console.error('Application submission failed:', error)
      return { success: false, error: 'Error al enviar postulación' }
    }
  }

  // Contact
  async submitContact(contact: ContactForm): Promise<ApiResponse<{ id: string }>> {
    return this.request<{ id: string }>('contact', 'POST', contact as unknown as Record<string, unknown>)
  }

  // Contact Management (Admin)
  async getContacts(): Promise<ApiResponse<unknown[]>> {
    return this.request<unknown[]>('getContacts', 'POST')
  }

  async updateContactStatus(id: string, status: string): Promise<ApiResponse<void>> {
    return this.request<void>('updateContactStatus', 'POST', { id, estado: status })
  }

  async deleteContact(id: string): Promise<ApiResponse<void>> {
    return this.request<void>('deleteContact', 'POST', { id })
  }

  // File Upload - Uses special handling for large files
  async uploadFile(file: File): Promise<ApiResponse<{ fileUrl: string; fileId: string; fileName: string }>> {
    if (!this.baseUrl) {
      console.warn('Apps Script URL not configured')
      return { success: false, error: 'API not configured' }
    }

    try {
      const base64 = await this.fileToBase64(file)

      // For file uploads, use POST with body to avoid URL length limits
      const url = new URL(this.baseUrl)
      url.searchParams.set('action', 'upload')

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          fileContent: base64,
        }),
        redirect: 'follow',
      })

      return response.json()
    } catch (error) {
      console.error('File upload failed:', error)
      return { success: false, error: 'Error al subir archivo' }
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
    })
  }

  // ============================================
  // CONSULTA DE POSTULACION POR DNI
  // ============================================

  // Consultar estado de postulacion por DNI
  async consultarPostulacion(dni: string): Promise<ApiResponse<ConsultaPostulacionResponse>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.request<any>('consultarPostulacion', 'GET', { dni })

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Error al consultar postulacion',
        data: { encontrado: false, mensaje: result.error || 'No se encontro postulacion' }
      }
    }

    const data = result.data

    // Transformar respuesta del backend al formato esperado por el frontend
    // Backend retorna: { postulante: {...}, postulacion: {...}, cronograma: [...] }
    // Frontend espera: { encontrado: true, postulacion: {...con datos del postulante...}, cronograma: [...] }
    const transformed: ConsultaPostulacionResponse = {
      encontrado: true,
      postulacion: {
        id: data.postulacion?.id || '',
        dni: data.postulante?.dni || '',
        nombre: data.postulante?.nombre || '',
        email: data.postulante?.email || '',
        telefono: data.postulante?.telefono || '',
        puesto: data.postulacion?.puestoNombre || '',
        convocatoriaId: data.postulacion?.puestoId || '',
        estado: mapBackendEstado(data.postulacion?.estado),
        fechaPostulacion: data.postulacion?.fechaPostulacion || '',
      },
      cronograma: data.cronograma?.map((etapa: { id?: number; nombre?: string; descripcion?: string; estado?: string; fecha?: string }, index: number) => ({
        etapa: String(etapa.id || index + 1),
        nombre: etapa.nombre || '',
        fechaInicio: etapa.fecha || new Date().toISOString(),
        fechaFin: etapa.fecha || new Date().toISOString(),
        descripcion: etapa.descripcion || '',
        activa: etapa.estado === 'actual',
        completada: etapa.estado === 'completada',
        orden: etapa.id || index + 1
      })) || [],
      entrevista: data.entrevista || undefined,
      evaluacion: data.evaluacion || undefined,
    }

    return { success: true, data: transformed }
  }

  // Historial de todas las postulaciones de un DNI
  async historialPostulaciones(dni: string): Promise<ApiResponse<ConsultaPostulacionResponse[]>> {
    return this.request<ConsultaPostulacionResponse[]>('historialPostulaciones', 'GET', { dni })
  }

  // ============================================
  // SISTEMA DE ASISTENCIA
  // ============================================

  // Verificar si empleado existe y esta activo
  async verificarEmpleado(dni: string): Promise<ApiResponse<VerificarEmpleadoResponse>> {
    return this.request<VerificarEmpleadoResponse>('verificarEmpleado', 'GET', { dni })
  }

  // Marcar asistencia (entrada o salida)
  async marcarAsistencia(
    dni: string,
    tipo: 'entrada' | 'salida',
    location: GeoLocation
  ): Promise<ApiResponse<MarcarAsistenciaResponse>> {
    return this.request<MarcarAsistenciaResponse>('marcarAsistencia', 'POST', {
      dni,
      tipo,
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy
    })
  }

  // Obtener asistencias del dia actual
  async asistenciasHoy(): Promise<ApiResponse<{
    fecha: string
    total: number
    dentro: number
    fuera: number
    registros: Array<{
      dni: string
      nombre: string
      entrada?: string
      salida?: string
      estado: 'dentro' | 'fuera'
    }>
  }>> {
    return this.request('asistenciasHoy', 'GET')
  }

  // Reporte de asistencias de un empleado
  async reporteAsistencia(
    dni: string,
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<ApiResponse<{
    empleado: { dni: string; nombre: string; puesto: string }
    registros: Array<{
      fecha: string
      entrada?: string
      salida?: string
      horasTrabajadas?: number
    }>
    resumen: {
      diasTrabajados: number
      horasTotales: number
      promedioHoras: number
    }
  }>> {
    return this.request('reporteAsistencia', 'GET', { dni, fechaInicio, fechaFin })
  }

  // Obtener asistencia de hoy para dashboard admin
  async getAttendanceToday(): Promise<ApiResponse<{
    fecha: string
    totalEmpleados: number
    presentes: number
    registros: Array<{
      employeeName: string
      checkIn: string
      checkOut: string
    }>
  }>> {
    const result = await this.request<{
      fecha: string
      total: number
      dentro: number
      fuera: number
      registros: Array<{
        dni: string
        nombre: string
        entrada?: string
        salida?: string
        estado: 'dentro' | 'fuera'
      }>
    }>('obtenerAsistenciasHoy', 'GET')

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Error al obtener asistencias' }
    }

    // Transformar al formato esperado por el Dashboard
    return {
      success: true,
      data: {
        fecha: result.data.fecha,
        totalEmpleados: result.data.total,
        presentes: result.data.dentro,
        registros: result.data.registros.map(r => ({
          employeeName: r.nombre,
          checkIn: r.entrada || '',
          checkOut: r.salida || ''
        }))
      }
    }
  }

  // Obtener todas las asistencias con filtros (para admin)
  async getAttendances(filters?: {
    fecha?: string
    employeeId?: string
    startDate?: string
    endDate?: string
  }): Promise<ApiResponse<Array<{
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
  }>>> {
    return this.request('getAttendances', 'GET', filters)
  }
}

export const api = new AppScriptApi()
