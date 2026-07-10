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
import {
  Capacitacion,
  Pregunta,
  IniciarEvaluacionResponse,
  Evaluacion,
} from '../types/capacitacion.types'

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

// ─── Normalizadores: el backend responde con campos en español (nombre_completo,
// cargo, ciudad_actual, estado...) y las páginas admin consumen las interfaces en
// inglés (Employee/Project). Se remapea aquí — único punto — conservando también
// las claves originales para las páginas que aún leen el shape crudo.

const EMPLOYEE_STATUS_MAP: Record<string, Employee['status']> = {
  activo: 'active', active: 'active',
  inactivo: 'inactive', inactive: 'inactive',
  licencia: 'on_leave', on_leave: 'on_leave',
}

function normalizeEmployee(raw: Record<string, unknown>): Employee {
  const r = raw as Record<string, any>
  return {
    ...r,
    id: r.id ?? (r.dni ? `SUE-${r.dni}` : ''),
    name: r.name ?? r.nombre_completo ?? r.nombre ?? '',
    email: r.email ?? '',
    phone: r.phone ?? r.telefono ?? '',
    dni: String(r.dni ?? ''),
    position: r.position ?? r.cargo ?? '',
    department: r.department ?? r.area ?? '',
    city: r.city ?? r.ciudad_actual ?? r.sede ?? '',
    status: EMPLOYEE_STATUS_MAP[String(r.status ?? r.estado ?? '').toLowerCase().trim()] ?? 'active',
    startDate: r.startDate ?? r.fecha_ingreso ?? r.fecha_inicio ?? '',
    salary: r.salary ?? r.sueldo ?? r.salario,
    createdAt: r.createdAt ?? '',
    updatedAt: r.updatedAt ?? '',
  }
}

const PROJECT_STATUS_MAP: Record<string, Project['status']> = {
  planificacion: 'planning', planning: 'planning',
  activo: 'in_progress', en_progreso: 'in_progress', in_progress: 'in_progress',
  completado: 'completed', finalizado: 'completed', cerrado: 'completed', completed: 'completed',
  pausado: 'on_hold', en_espera: 'on_hold', on_hold: 'on_hold',
}

function normalizeProject(raw: Record<string, unknown>): Project {
  const r = raw as Record<string, any>
  return {
    ...r,
    id: r.id ?? '',
    name: r.name ?? r.nombre ?? '',
    description: r.description ?? r.descripcion ?? '',
    client: r.client ?? r.cliente ?? '',
    city: r.city ?? r.ciudad ?? '',
    status: PROJECT_STATUS_MAP[String(r.status ?? r.estado ?? '').toLowerCase().trim()] ?? 'planning',
    startDate: r.startDate ?? r.fecha_inicio ?? '',
    endDate: r.endDate ?? r.fecha_fin ?? r.fecha_fin_estimada ?? '',
    budget: r.budget ?? r.presupuesto,
    createdAt: r.createdAt ?? '',
    updatedAt: r.updatedAt ?? '',
  }
}

/**
 * Listener de errores de transporte (red caida, respuesta HTML de GAS, HTTP no-2xx).
 * Lo suscribe el ToastProvider para que ningun fallo de API quede silencioso.
 */
export type ApiErrorListener = (message: string, action: string) => void

class AppScriptApi {
  private baseUrl = config.appsScriptUrl
  private token: string | null = null
  private errorListener: ApiErrorListener | null = null

  onTransportError(listener: ApiErrorListener | null) {
    this.errorListener = listener
  }

  private notifyError(message: string, action: string) {
    this.errorListener?.(message, action)
  }

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
    method: 'GET' | 'POST' = 'GET',
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

    try {
      let response: Response

      if (method === 'POST' && requestData && Object.keys(requestData).length > 0) {
        // POST with body: avoids URL length limits for large payloads (createJob, etc.)
        // Content-Type: text/plain avoids CORS preflight — doPost in Apps Script handles it
        response = await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(requestData),
          redirect: 'follow',
        })
      } else {
        // GET with URL params for read-only / lightweight requests
        if (requestData && Object.keys(requestData).length > 0) {
          url.searchParams.set('payload', JSON.stringify(requestData))
        }
        response = await fetch(url.toString(), {
          method: 'GET',
          redirect: 'follow',
        })
      }

      // Apps Script devuelve HTML (no JSON) cuando el script lanza una excepcion
      // o el deployment esta mal configurado — detectarlo y reportarlo como error real.
      const text = await response.text()
      try {
        return JSON.parse(text) as ApiResponse<T>
      } catch {
        const message = response.ok
          ? `El servidor respondió un formato inesperado (acción: ${action})`
          : `Error del servidor (HTTP ${response.status}) en la acción ${action}`
        console.error('API non-JSON response:', action, response.status, text.slice(0, 300))
        this.notifyError(message, action)
        return { success: false, error: message }
      }
    } catch (error) {
      console.error('API request failed:', action, error)
      const message = 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.'
      this.notifyError(message, action)
      return { success: false, error: message }
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
  // El backend responde con nombres en español (totalEmpleados, empleadosPorCiudad...);
  // aqui se remapea a la interface DashboardStats — mismo patron que getAttendanceToday.
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const result = await this.request<Record<string, unknown>>('getDashboard', 'POST')
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Error al cargar estadísticas' }
    }

    const raw = result.data as Record<string, unknown>
    const num = (...values: unknown[]) => {
      for (const v of values) {
        const n = Number(v)
        if (v !== undefined && v !== null && !Number.isNaN(n)) return n
      }
      return 0
    }
    const rec = (...values: unknown[]) => {
      for (const v of values) {
        if (v && typeof v === 'object') return v as Record<string, number>
      }
      return {}
    }

    // Normalizar estados de proyecto (hoja usa español) a las claves que grafica el dashboard
    const statusKeyMap: Record<string, string> = {
      activo: 'in_progress',
      en_progreso: 'in_progress',
      in_progress: 'in_progress',
      planificacion: 'planning',
      planning: 'planning',
      completado: 'completed',
      finalizado: 'completed',
      completed: 'completed',
      pausado: 'on_hold',
      en_espera: 'on_hold',
      on_hold: 'on_hold',
    }
    const rawByStatus = rec(raw.projectsByStatus, raw.proyectosPorEstado)
    const projectsByStatus: Record<string, number> = {}
    for (const [status, count] of Object.entries(rawByStatus)) {
      const key = statusKeyMap[status.toLowerCase().trim()] || status
      projectsByStatus[key] = (projectsByStatus[key] || 0) + Number(count || 0)
    }

    const stats: DashboardStats = {
      totalEmployees: num(raw.totalEmployees, raw.totalEmpleados),
      activeProjects: num(raw.activeProjects, raw.totalProyectos),
      pendingApplications: num(raw.pendingApplications, raw.postulacionesPendientes),
      completedProjects: num(raw.completedProjects, raw.proyectosCompletados, projectsByStatus.completed),
      employeesByCity: rec(raw.employeesByCity, raw.empleadosPorCiudad),
      projectsByStatus,
    }
    return { success: true, data: stats }
  }

  // Employees
  async getEmployees(): Promise<ApiResponse<Employee[]>> {
    const result = await this.request<Record<string, unknown>[]>('getEmployees', 'POST')
    if (!result.success || !result.data) {
      return { success: false, error: result.error }
    }
    return { success: true, data: result.data.map(normalizeEmployee) }
  }

  async getEmployee(id: string): Promise<ApiResponse<Employee>> {
    const result = await this.request<Record<string, unknown>>('getEmployee', 'POST', { id })
    if (!result.success || !result.data) {
      return { success: false, error: result.error }
    }
    return { success: true, data: normalizeEmployee(result.data) }
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
    const result = await this.request<Record<string, unknown>[]>('getProjects', 'POST')
    if (!result.success || !result.data) {
      return { success: false, error: result.error }
    }
    return { success: true, data: result.data.map(normalizeProject) }
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    const result = await this.request<Record<string, unknown>>('getProject', 'POST', { id })
    if (!result.success || !result.data) {
      return { success: false, error: result.error }
    }
    return { success: true, data: normalizeProject(result.data) }
  }

  // El backend de proyectos espera claves en español (nombre, cliente, ciudad...):
  // se traduce aquí para que las páginas sigan trabajando con la interface Project.
  private projectToBackend(project: Partial<Project>): Record<string, unknown> {
    return {
      codigo: (project as Record<string, unknown>)['codigo'] ?? '',
      nombre: project.name,
      descripcion: project.description,
      cliente: project.client,
      ciudad: project.city,
      fecha_inicio: project.startDate,
      fecha_fin_estimada: project.endDate,
      presupuesto: project.budget,
    }
  }

  async createProject(project: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.request<Project>('createProject', 'POST', this.projectToBackend(project))
  }

  async updateProject(id: string, project: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.request<Project>('updateProject', 'POST', { id, ...this.projectToBackend(project) })
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

  async uploadJobPdf(params: {
    fileContent: string
    fileName: string
    mimeType: string
    ciudad: string
    convocatoriaId?: string
  }): Promise<ApiResponse<{ fileId: string; fileName: string; viewUrl: string; downloadUrl: string }>> {
    return this.request('uploadJobPdf', 'POST', params as unknown as Record<string, unknown>)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.request<any[]>('getJobs')
    if (!result.success || !result.data) return result as ApiResponse<JobPosting[]>
    return {
      ...result,
      data: result.data.map((j: any) => ({
        ...j,
        imagen: String(j.imagen || j.image || ''),
      })) as JobPosting[],
    }
  }

  async getJobById(id: string): Promise<ApiResponse<JobPosting>> {
    const url = new URL(this.baseUrl)
    url.searchParams.set('action', 'getJob')
    url.searchParams.set('id', id)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: ApiResponse<any> = await (await fetch(url.toString())).json()
      if (!result.success || !result.data) return result as ApiResponse<JobPosting>
      return {
        ...result,
        data: {
          ...result.data,
          imagen: String(result.data.imagen || result.data.image || ''),
        } as JobPosting,
      }
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

  // ============================================
  // SISTEMA DE CAPACITACIONES Y EVALUACIONES
  // ============================================

  async getCapacitaciones(): Promise<ApiResponse<Capacitacion[]>> {
    return this.request<Capacitacion[]>('getCapacitaciones', 'GET')
  }

  async getCapacitacionById(id: string): Promise<ApiResponse<Capacitacion>> {
    return this.request<Capacitacion>('getCapacitacionById', 'GET', { id })
  }

  async iniciarEvaluacion(data: {
    capacitacion_id: string
    dni: string
    nombres: string
    email: string
  }): Promise<ApiResponse<IniciarEvaluacionResponse>> {
    return this.request<IniciarEvaluacionResponse>('iniciarEvaluacion', 'POST', data as unknown as Record<string, unknown>)
  }

  async submitEvaluacion(data: {
    evaluacion_id: string
    respuestas: Record<string, string>
    salidas_pestana: number
    fotos_url: string[]
    duracion_seg: number
  }): Promise<ApiResponse<{ puntaje_auto: number; tiene_llenado: boolean }>> {
    return this.request('submitEvaluacion', 'POST', {
      ...data,
      respuestas: JSON.stringify(data.respuestas),
      fotos_url: JSON.stringify(data.fotos_url),
    })
  }

  async guardarFotoWebcam(data: {
    evaluacion_id: string
    capacitacion_id: string
    dni: string
    fileContent: string
    fileName: string
    mimeType: string
  }): Promise<ApiResponse<{ foto_url: string; foto_id: string }>> {
    return this.request('guardarFotoWebcam', 'POST', data as unknown as Record<string, unknown>)
  }

  async registrarEventoLog(data: {
    evaluacion_id: string
    tipo_evento: string
    detalle?: string
  }): Promise<ApiResponse<null>> {
    return this.request('registrarEventoLog', 'POST', data as unknown as Record<string, unknown>)
  }

  // ============================================
  // ASISTENCIA V2 (FOTO + GPS + JUSTIFICACIONES)
  // ============================================

  async registrarAsistenciaFoto(data: {
    dni: string
    nombre: string
    cargo: string
    evento: string
    gps_lat?: number
    gps_lng?: number
    gps_accuracy?: number
    fileContent: string
    mimeType?: string
  }): Promise<ApiResponse<{ evento: string; fecha: string; hora: string; foto_url: string }>> {
    return this.request('registrarAsistenciaFoto', 'POST', data as unknown as Record<string, unknown>)
  }

  async subirJustificacion(data: {
    dni: string
    nombre: string
    cargo: string
    motivo: string
    descripcion?: string
    fileContent?: string
    fileName?: string
    mimeType?: string
  }): Promise<ApiResponse<{ fecha: string; archivo_url: string }>> {
    return this.request('subirJustificacion', 'POST', data as unknown as Record<string, unknown>)
  }

  // Admin — requieren token
  async getAsistenciasV2(filtros?: {
    dni?: string
    desde?: string
    hasta?: string
    evento?: string
  }): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.request('getAsistenciasV2', 'POST', (filtros || {}) as Record<string, unknown>)
  }

  async getJustificaciones(filtros?: {
    dni?: string
    desde?: string
    hasta?: string
  }): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.request('getJustificaciones', 'POST', (filtros || {}) as Record<string, unknown>)
  }

  // ============================================
  // PLANILLA: TARDANZAS, FALTAS Y DESCUENTOS (admin)
  // ============================================

  async getConfigPlanilla(): Promise<ApiResponse<Record<string, string | number>>> {
    return this.request('getConfigPlanilla', 'POST', {})
  }

  async updateConfigPlanilla(valores: Record<string, string | number>): Promise<ApiResponse<Record<string, string | number>>> {
    return this.request('updateConfigPlanilla', 'POST', { valores })
  }

  async getSueldos(): Promise<ApiResponse<{ dni: string; nombre: string; cargo: string; sueldo: number; fecha_inicio?: string; usa_rmv?: boolean; sede?: string; email?: string }[]>> {
    return this.request('getSueldos', 'POST', {})
  }

  async updateSueldo(dni: string, sueldo: number): Promise<ApiResponse<null>> {
    return this.request('updateSueldo', 'POST', { dni, sueldo })
  }

  // Lista pública para el kiosko (sin sueldos ni correos)
  async getTrabajadores(): Promise<ApiResponse<{ dni: string; nombre: string; cargo: string; sede?: string; registro_simple?: boolean }[]>> {
    return this.request('getTrabajadores', 'GET', {})
  }

  async crearTrabajador(data: {
    dni: string
    nombre: string
    cargo: string
    sueldo?: number
    fecha_inicio?: string
    usa_rmv?: boolean
    sede?: string
    email?: string
  }): Promise<ApiResponse<null>> {
    return this.request('crearTrabajador', 'POST', data as unknown as Record<string, unknown>)
  }

  async autorizarSalida5pm(data: {
    dni: string
    fecha?: string
    autorizado_por?: string
    nota?: string
  }): Promise<ApiResponse<null>> {
    return this.request('autorizarSalida5pm', 'POST', data as unknown as Record<string, unknown>)
  }

  async getAutorizaciones5pm(filtros?: { dni?: string; desde?: string; hasta?: string }): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.request('getAutorizaciones5pm', 'POST', (filtros || {}) as Record<string, unknown>)
  }

  async registrarMuestreo(data: {
    dni: string
    horas: number
    fecha?: string
    nota?: string
    usuario?: string
  }): Promise<ApiResponse<{ horas_aplicadas: number; saldo_restante: number }>> {
    return this.request('registrarMuestreo', 'POST', data as unknown as Record<string, unknown>)
  }

  async getBolsaHoras(dni?: string): Promise<ApiResponse<{ saldos: Record<string, number>; movimientos: Record<string, unknown>[] }>> {
    return this.request('getBolsaHoras', 'POST', dni ? { dni } : {})
  }

  async getIncidencias(filtros?: {
    dni?: string
    desde?: string
    hasta?: string
  }): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.request('getIncidencias', 'POST', (filtros || {}) as Record<string, unknown>)
  }

  async revisarIncidencia(data: {
    id: string
    estado: 'justificada' | 'injustificada' | 'pendiente'
    nota?: string
    sustento_url?: string
    revisado_por?: string
  }): Promise<ApiResponse<null>> {
    return this.request('revisarIncidencia', 'POST', data as unknown as Record<string, unknown>)
  }

  async sincronizarIncidencias(desde: string, hasta: string): Promise<ApiResponse<{ creadas: number; expiradas: number }>> {
    return this.request('sincronizarIncidencias', 'POST', { desde, hasta })
  }

  // Admin — capacitaciones CRUD
  async crearCapacitacion(data: Omit<Capacitacion, 'id' | 'fecha_creacion'>): Promise<ApiResponse<{ id: string }>> {
    return this.request('crearCapacitacion', 'POST', data as unknown as Record<string, unknown>)
  }

  async actualizarCapacitacion(data: Partial<Capacitacion> & { id: string }): Promise<ApiResponse<null>> {
    return this.request('actualizarCapacitacion', 'POST', data as unknown as Record<string, unknown>)
  }

  async eliminarCapacitacion(id: string): Promise<ApiResponse<null>> {
    return this.request('eliminarCapacitacion', 'POST', { id })
  }

  // Admin — preguntas CRUD
  async crearPregunta(data: Omit<Pregunta, 'id'>): Promise<ApiResponse<{ id: string }>> {
    return this.request('crearPregunta', 'POST', data as unknown as Record<string, unknown>)
  }

  async actualizarPregunta(data: Partial<Pregunta> & { id: string }): Promise<ApiResponse<null>> {
    return this.request('actualizarPregunta', 'POST', data as unknown as Record<string, unknown>)
  }

  async eliminarPregunta(id: string): Promise<ApiResponse<null>> {
    return this.request('eliminarPregunta', 'POST', { id })
  }

  async getPreguntas(capacitacion_id: string): Promise<ApiResponse<Pregunta[]>> {
    return this.request<Pregunta[]>('getPreguntas', 'POST', { capacitacion_id })
  }

  // Admin — evaluaciones
  async getEvaluaciones(filtros?: {
    estado?: string
    capacitacion_id?: string
  }): Promise<ApiResponse<Evaluacion[]>> {
    return this.request<Evaluacion[]>('getEvaluaciones', 'POST', filtros)
  }

  async revisarEvaluacion(data: {
    id: string
    nota_final: number
    retroalimentacion: string
    estado: 'aprobado' | 'observado'
    revisado_por?: string
  }): Promise<ApiResponse<null>> {
    return this.request('revisarEvaluacion', 'POST', data as unknown as Record<string, unknown>)
  }
}

export const api = new AppScriptApi()
