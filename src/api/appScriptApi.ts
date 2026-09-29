import type { EntidadLic } from '../pages/admin/licitaciones/licEsquemas'
import { config } from '../config/env'
import * as licLocal from './licLocal'
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
  // Código de negocio opcional del backend (p. ej. 'YA_REGISTRADO').
  codigo?: string
  // true = la petición no obtuvo respuesta válida (sin red, timeout, HTML):
  // el servidor pudo haber procesado la operación igualmente.
  transporte?: boolean
}

export interface UsuarioPanel {
  id: string
  nombre: string
  email: string
  rol: string
  permisos: string[]
  activo: boolean
  esAdmin: boolean
  ultimo_acceso: string
  empleado_id: string
}

export interface RegistroAuditoria {
  id: string
  timestamp: string
  usuario_id: string
  usuario: string
  accion: string
  resultado: string
  detalle: string
}

// ── Licitaciones (backend/16_licitaciones.gs) ─────────────────────────────
// Los nombres de campo son EXACTAMENTE los del JSON que exporta el vault
// (ver exportar_web.py): sin capa de normalizacion, a proposito.

// Columnas de edición comunes a toda ficha editable (ver backend/17_lic_edicion.gs)
export interface LicEdicionMeta {
  origen?: string // 'vault' | 'web' | 'postores'
  campos_web?: string[] // campos corregidos en la web (el import ya no los pisa)
  archivado?: string // ISO si está archivada
  editado_por?: string
  editado_en?: string
}

export interface LicOferta {
  proceso: string
  monto: number
  pct_vr: number | null
}

export interface LicServicio extends LicEdicionMeta {
  id: string
  nombre: string
  proceso: string
  entidad: string
  zona: string
  contrato: string
  fecha_inicio: string
  fecha_fin: string
  monto: number | ''
  estado: string // por_iniciar | en_ejecucion | suspendido | terminado
  responsable: string
  personal: string[] // DNI del personal clave
  proyecto_id: string
  proximo_hito: string
  fecha_hito: string
  notas: string
  facturado?: number
  n_facturas?: number
}

export interface LicAsistenciaServicio {
  proyecto: { id: string; nombre: string; ciudad: string }
  hoy: string
  desde: string
  trabajadores: { dni: string; nombre: string; cargo: string; activo: boolean; entrada_hoy: string; salida_hoy: string; dias_mes: number; ultima: string }[]
}

export interface LicArchivoZip {
  ruta: string // archivo_vault
  destino: string // ruta dentro del ZIP
}

export interface LicCambio {
  id: string
  fecha: string
  usuario: string
  entidad: string
  clave: string // JSON de la clave
  campo: string
  antes: string
  despues: string
  accion: 'editar' | 'crear' | 'archivar' | 'restaurar'
}

export interface LicProceso extends LicEdicionMeta {
  nomenclatura: string
  codigo_seace: string
  anio: string
  entidad: string
  linea: string
  objeto: string
  ley: string
  vr: number | ''
  resultado: string
  estado_cola: string
  nuestro_monto: number | ''
  nuestro_pct_vr: number | ''
  n_postores: number | ''
  ganador_ruc: string
  ganador: string
  carpeta_vault: string
  notas_vault?: string
  notas: string
  estado_seguimiento: string
  actualizado: string
}

export interface LicPostor extends LicEdicionMeta {
  nomenclatura: string
  ruc: string
  razon_social: string
  consorcio: string
  mype: string
  monto: number | ''
  pct_vr: number | ''
  es_telcom: boolean
  gano: boolean
}

export interface LicAccion {
  nomenclatura: string
  n: string
  accion: string
  fecha: string
  motivo: string
}

export interface LicCompetidor extends LicEdicionMeta {
  ruc: string
  nombre: string
  procesos: string[]
  n_procesos: number | ''
  entidades: string[]
  ofertas: LicOferta[]
  pct_vr_promedio: number | null
  ganados: number | ''
  zona?: string
  contacto?: string
  telefono?: string
  fortalezas?: string
  amenaza?: string // alta | media | baja
  notas?: string
}

export interface LicExperiencia extends LicEdicionMeta {
  proceso: string
  entidad: string
  objeto: string
  monto_adjudicado: number | ''
  monto_facturado: number | '' | null
  pct_telcom: number | ''
  acreditable: number | '' | null
  estado: string
  fecha_contrato: string
  notas?: string
}

export interface LicAparicion {
  proceso: string // "2026 CP SER-SM-37-2026-ELSE-1"
  archivo: string | null // propuesta completa, ruta relativa al vault
  desde: number | null
  hasta: number | null
}

// Propuesta completa presentada por Telcom, con el índice de lo extraído de ella
export interface LicPropuesta {
  nomenclatura: string
  anio: string
  archivo: string
  tamano_mb: number
  secciones: { id: string; categoria: string; tipo: string; titulo: string; desde: number | null; hasta: number | null }[]
}

export interface LicDocumento extends Omit<LicEdicionMeta, 'editado_por' | 'editado_en'> {
  id: string
  categoria: string
  tipo: string
  titulo: string
  entidad: string
  dni: string
  nombre: string
  fecha: string
  periodo_desde: string
  periodo_hasta: string
  monto: number | ''
  archivo_vault: string
  usos: number | ''
  // De qué propuesta COMPLETA se extrajo y en qué páginas (contexto del documento)
  apariciones?: LicAparicion[]
  verificado: string
  vence: string
  notas: string
  editado_por: string
  editado_en: string
}

export interface LicCargo {
  titulo: string
  desde: string
  hasta: string
  id: string
}

export interface LicTitulo {
  tipo: string
  titulo: string
  fecha: string
  id: string
}

export interface LicPersonal extends LicEdicionMeta {
  dni: string
  nombre: string
  documentos: number | ''
  tipos: Record<string, number>
  cargos: LicCargo[]
  titulos: LicTitulo[]
  meses_experiencia: number | ''
  anios_experiencia: number | ''
  empleado_vinculado: string
  notas: string
  profesion?: string
  colegiatura?: string
  telefono?: string
  correo?: string
  disponible?: string
}

export interface LicFactura extends LicEdicionMeta {
  contrato: string
  numero: string
  fecha: string
  monto: number | ''
  documento_id: string
  archivo_vault: string
  verificado: string
  notas: string
}

export interface LicContrato extends LicEdicionMeta {
  contrato: string
  documentos: number | ''
  tipos: Record<string, number>
  monto_contrato: number | '' | null
  proceso: string
  monto_adjudicado: number | ''
  pct_telcom: number | ''
  n_facturas: number | ''
  facturado: number | '' | null
  en_seace_telcom: boolean
  estado: string
  notas: string
  fecha_inicio?: string
  fecha_fin?: string
  facturas: LicFactura[]
}

export interface LicResumen {
  procesos: number
  presentados: number
  ganados: number
  tasa_exito: number | null
  no_presentados: number
  pct_vr_promedio_ganado: number | null
  ganados_por_anio: Record<string, number>
  procesos_por_anio: Record<string, number>
  ganados_por_linea: Record<string, number>
  personas: number
  contratos_con_sustento: number
  facturas: number
  facturado_total: number
}

export interface OpcionesLecturaLic {
  /** incluir también las fichas archivadas */
  archivados?: boolean
}

export interface LicImportPayload {
  procesos?: Record<string, unknown>[]
  postores?: Record<string, unknown>[]
  acciones?: Record<string, unknown>[]
  competidores?: Record<string, unknown>[]
  experiencia?: Record<string, unknown>[]
  documentos?: Record<string, unknown>[]
  personal?: Record<string, unknown>[]
  contratos?: Record<string, unknown>[]
  facturas?: Record<string, unknown>[]
  propuestas?: Record<string, unknown>[]
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

export type TipoDocTrabajador = 'cv' | 'contrato' | 'dni' | 'certificados' | 'otros'

export interface DocTrabajador {
  id: string
  nombre: string
  tipo: TipoDocTrabajador
  tamano: number
  fecha: string
}

export type ResumenDocsTrabajador = Record<TipoDocTrabajador, number> & { foto: string | null }

export interface FichaTrabajador {
  id: string
  dni: string
  nombre_completo: string
  email: string
  cargo: string
  area: string
  ciudad_actual: string
  estado: string
  fecha_inicio: string
  fecha_fin: string
  documentos: DocTrabajador[]
  foto: string | null
  carpeta_url: string
  asignaciones: { id: string; projectId: string; projectName: string; role: string; startDate: string; endDate: string; status: string }[]
  historial: { id: string; tipo: string; ubicacion_anterior: string; ubicacion_nueva: string; descripcion: string; notas?: string; fecha: string; usuario: string }[]
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

// Modo local de Licitaciones (ver src/api/licLocal.ts y docs/PLAN_LICITACIONES_ADMIN.md
// § "Modo local"): cuando está activo, los métodos licXxx de esta clase NO
// llaman a Apps Script — leen los JSON del vault vía el plugin de Vite
// (`npm run dev` solamente; el plugin es `apply: 'serve'`, nunca entra al build).
export const LIC_LOCAL = import.meta.env.VITE_LIC_LOCAL === '1'

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

  // localStorage puede lanzar (Safari con cookies bloqueadas, modo privado):
  // sin try/catch, getToken() tumbaria TODAS las peticiones, kiosko incluido.
  setToken(token: string | null) {
    this.token = token
    try {
      if (token) {
        localStorage.setItem('auth_token', token)
      } else {
        localStorage.removeItem('auth_token')
      }
    } catch { /* sesion solo en memoria */ }
  }

  getToken(): string | null {
    if (!this.token) {
      try {
        this.token = localStorage.getItem('auth_token')
      } catch { /* sin almacenamiento: sin token guardado */ }
    }
    return this.token
  }

  // Lecturas: un reintento automático ante fallos pasajeros (sin respuesta,
  // 404 de la URL intermedia de Apps Script, "Servidor/Sistema ocupado").
  // Bajo carga Apps Script falla de a ratos y el panel mostraba errores que se
  // resolvían con solo recargar. Las escrituras NO se reintentan aquí (podrían
  // duplicar datos); el kiosko maneja sus propios reintentos.
  private async request<T>(
    action: string,
    method: 'GET' | 'POST' = 'GET',
    data?: Record<string, unknown>,
    timeoutMs = 0
  ): Promise<ApiResponse<T>> {
    // getTrabajadores queda fuera: el kiosko ya tiene reintentos calibrados
    // para la ráfaga de las 07:30 (ver docs/KIOSKO_ASISTENCIA.md).
    const esLectura = action !== 'getTrabajadores' && /^(get|obtener|verify|consultar|historial)/i.test(action)
    if (!esLectura) return this.requestUnaVez<T>(action, method, data, timeoutMs, true)
    const primero = await this.requestUnaVez<T>(action, method, data, timeoutMs, false)
    const pasajero = !primero.success &&
      (!!primero.transporte || /ocupado/i.test(primero.error || ''))
    if (!pasajero) return primero
    await new Promise((r) => setTimeout(r, 1500))
    return this.requestUnaVez<T>(action, method, data, timeoutMs, true)
  }

  private async requestUnaVez<T>(
    action: string,
    method: 'GET' | 'POST',
    data: Record<string, unknown> | undefined,
    timeoutMs: number,
    avisar: boolean
  ): Promise<ApiResponse<T>> {
    if (!this.baseUrl) {
      console.warn('Apps Script URL not configured')
      return { success: false, error: 'API not configured' }
    }

    const url = new URL(this.baseUrl)
    url.searchParams.set('action', action)

    const token = this.getToken()
    const requestData = token ? { ...data, token } : data

    // Timeout opcional (kiosko): sin él un fetch colgado deja el spinner eterno
    const controller = timeoutMs > 0 ? new AbortController() : null
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

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
          signal: controller?.signal,
        })
      } else {
        // GET with URL params for read-only / lightweight requests
        if (requestData && Object.keys(requestData).length > 0) {
          url.searchParams.set('payload', JSON.stringify(requestData))
        }
        response = await fetch(url.toString(), {
          method: 'GET',
          redirect: 'follow',
          signal: controller?.signal,
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
        if (avisar) this.notifyError(message, action)
        return { success: false, error: message, transporte: true }
      }
    } catch (error) {
      console.error('API request failed:', action, error)
      const esTimeout = error instanceof DOMException && error.name === 'AbortError'
      const message = esTimeout
        ? 'El servidor tardó demasiado en responder. Intenta de nuevo.'
        : 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.'
      if (avisar) this.notifyError(message, action)
      return { success: false, error: message, transporte: true }
    } finally {
      if (timer) clearTimeout(timer)
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

  // Incluye a los cesados (estado 'inactive'): para la ficha y el historial
  async getEmployeesTodos(): Promise<ApiResponse<Employee[]>> {
    const result = await this.request<Record<string, unknown>[]>('getEmployees', 'POST', { filters: { estado: 'todos' } })
    if (!result.success || !result.data) return { success: false, error: result.error }
    return { success: true, data: result.data.map(normalizeEmployee) }
  }

  // ── Ficha del trabajador (backend/19_rrhh.gs) ─────────────────────────
  async rrhhFicha(dni: string): Promise<ApiResponse<FichaTrabajador>> {
    return this.request('rrhhFicha', 'POST', { dni })
  }

  async rrhhResumen(): Promise<ApiResponse<Record<string, ResumenDocsTrabajador>>> {
    return this.request('rrhhResumen', 'POST', {})
  }

  async rrhhSubirDocumento(data: { dni: string; tipo: TipoDocTrabajador; nombre: string; base64: string; mime: string }): Promise<ApiResponse<{ id: string; nombre: string }>> {
    return this.request('rrhhSubirDocumento', 'POST', data)
  }

  async rrhhArchivarDocumento(dni: string, id: string): Promise<ApiResponse<null>> {
    return this.request('rrhhArchivarDocumento', 'POST', { dni, id })
  }

  async rrhhSubirFoto(data: { dni: string; base64: string; mime: string }): Promise<ApiResponse<{ id: string }>> {
    return this.request('rrhhSubirFoto', 'POST', data)
  }

  async rrhhCambiarCargo(dni: string, cargo: string, motivo: string): Promise<ApiResponse<null>> {
    return this.request('rrhhCambiarCargo', 'POST', { dni, cargo, motivo })
  }

  async rrhhCambiarSede(dni: string, sede: string, motivo: string): Promise<ApiResponse<null>> {
    return this.request('rrhhCambiarSede', 'POST', { dni, sede, motivo })
  }

  async rrhhCesar(dni: string, fecha_fin: string, motivo: string): Promise<ApiResponse<{ fecha_fin: string }>> {
    return this.request('rrhhCesar', 'POST', { dni, fecha_fin, motivo })
  }

  async rrhhReactivar(dni: string, motivo: string): Promise<ApiResponse<null>> {
    return this.request('rrhhReactivar', 'POST', { dni, motivo })
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
      // El backend guarda el estado en español
      estado: project.status ? ({ planning: 'planificacion', in_progress: 'activo', on_hold: 'en_espera', completed: 'cerrado' } as Record<string, string>)[project.status] : undefined,
    }
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    return this.request<void>('deleteProject', 'POST', { id })
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

  // notes: undefined = no tocar las notas. notificar: envía correo al postulante.
  async updateApplicationStatus(
    id: string,
    status: string,
    notes?: string,
    notificar = false
  ): Promise<ApiResponse<JobApplication>> {
    return this.request<JobApplication>('updateApplicationStatus', 'POST', { id, status, notes, notificar })
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

  // Libro de Reclamaciones (público: registrar; panel: listar y responder)
  async registrarReclamo(datos: Record<string, unknown>): Promise<ApiResponse<{ id: string; fecha: string; fechaLimite: string; constanciaEnviada: boolean }>> {
    return this.request('registrarReclamo', 'POST', datos)
  }

  async getReclamos(): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.request<Record<string, unknown>[]>('getReclamos', 'POST')
  }

  async responderReclamo(id: string, respuesta: string): Promise<ApiResponse<{ id: string; correoEnviado: boolean }>> {
    return this.request('responderReclamo', 'POST', { id, respuesta })
  }

  // Analítica web (GA4 leída desde el backend)
  async getAnalytics(dias: number): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request<Record<string, unknown>>('getAnalytics', 'POST', { dias })
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
    // Timeout 90s: la foto sube a Drive y bajo rafaga puede demorar;
    // sin timeout el fetch puede quedar colgado indefinidamente (spinner eterno)
    return this.request('registrarAsistenciaFoto', 'POST', data as unknown as Record<string, unknown>, 90000)
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
    return this.request('subirJustificacion', 'POST', data as unknown as Record<string, unknown>, 90000)
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

  // Registro manual desde el panel (marca que el trabajador no pudo hacer).
  // La nota/observación es obligatoria (auditoría). Sin foto ni GPS.
  async registrarAsistenciaManual(data: {
    dni: string
    evento: string
    fecha: string
    hora: string
    nota: string
  }): Promise<ApiResponse<{ evento: string; fecha: string; hora: string; nombre: string }>> {
    return this.request('registrarAsistenciaManual', 'POST', data as unknown as Record<string, unknown>)
  }

  // Feriados / días no laborables (hoja 'feriados'): esos días no generan
  // falta ni omisión en planilla y se muestran como no laborables en informes.
  // Anula una marca registrada a mano (queda copiada en asistencias_anuladas)
  async anularMarcaManual(id: string, motivo: string): Promise<ApiResponse<null>> {
    return this.request('anularMarcaManual', 'POST', { id, motivo })
  }

  async getFeriados(): Promise<ApiResponse<{ fecha: string; descripcion: string }[]>> {
    return this.request('getFeriados', 'POST')
  }

  async agregarFeriado(data: { fecha: string; descripcion: string }): Promise<ApiResponse<{ fecha: string; descripcion: string }[]>> {
    return this.request('agregarFeriado', 'POST', data as unknown as Record<string, unknown>)
  }

  async eliminarFeriado(fecha: string): Promise<ApiResponse<{ fecha: string; descripcion: string }[]>> {
    return this.request('eliminarFeriado', 'POST', { fecha })
  }

  async sembrarFeriadosPeru2026(): Promise<ApiResponse<{ fecha: string; descripcion: string }[]>> {
    return this.request('sembrarFeriadosPeru2026', 'POST')
  }

  async getJustificaciones(filtros?: {
    dni?: string
    desde?: string
    hasta?: string
  }): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.request('getJustificaciones', 'POST', (filtros || {}) as Record<string, unknown>)
  }

  // ============================================
  // ARCHIVOS — visor seguro (fotos asistencia/proctoring, justificaciones)
  // ============================================

  // Descarga un archivo privado de Drive (por fileId o URL) para mostrarlo
  // en el visor admin. Requiere token (nivel 'auth' en el router).
  async getArchivo(fileIdOrUrl: string): Promise<ApiResponse<{ base64: string; mimeType: string; fileName: string }>> {
    return this.request('getArchivo', 'POST', { fileId: fileIdOrUrl })
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

  // Incluye a los trabajadores cesados (activo:false, con fecha_fin): la
  // planilla del mes en curso y los meses cerrados deben seguir mostrándolos.
  async getSueldos(): Promise<ApiResponse<{ dni: string; nombre: string; cargo: string; sueldo: number; fecha_inicio?: string; usa_rmv?: boolean; sede?: string; email?: string; fecha_fin?: string; activo?: boolean }[]>> {
    return this.request('getSueldos', 'POST', {})
  }

  async updateSueldo(dni: string, sueldo: number): Promise<ApiResponse<null>> {
    return this.request('updateSueldo', 'POST', { dni, sueldo })
  }

  /** Lista pública para el kiosko (sin sueldos ni correos). Por defecto solo
   *  trabajadores ACTIVOS: un cesado no debe poder marcar. Pasar
   *  incluirCesados en el panel de asistencias, donde hay que poder filtrar
   *  su historial y registrarles marcas manuales de días que sí laboraron. */
  async getTrabajadores(incluirCesados = false): Promise<ApiResponse<{ dni: string; nombre: string; cargo: string; sede?: string; registro_simple?: boolean; activo?: boolean; fecha_fin?: string }[]>> {
    // 15 s por intento: con el roster precalentado responde en 2-3 s; esperar
    // 25 s a una conexión colgada solo retrasaba el reintento. El kiosko,
    // además, ya muestra la lista guardada mientras tanto.
    return this.request('getTrabajadores', 'GET', incluirCesados ? { incluirCesados: true } : {}, 15000)
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

  /** Baja de personal: registra el último día laborado. No borra la fila —
   *  el trabajador sale del kiosko y deja de generar faltas, pero su historial
   *  de asistencias, incidencias y planillas cerradas se conserva. */
  async darDeBajaTrabajador(dni: string, fecha_fin: string): Promise<ApiResponse<{ dni: string; fecha_fin: string; incidencias_eliminadas: number }>> {
    return this.request('darDeBajaTrabajador', 'POST', { dni, fecha_fin })
  }

  /** Revierte una baja registrada por error. No regenera las incidencias
   *  pendientes que la baja hubiera eliminado. */
  async reactivarTrabajador(dni: string): Promise<ApiResponse<null>> {
    return this.request('reactivarTrabajador', 'POST', { dni })
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

  // ── Usuarios, permisos por módulo y auditoría (nivel admin) ──────────
  // Ver backend/13_usuarios.gs y docs/ADMIN.md §2.2.
  async listarUsuarios(): Promise<ApiResponse<{
    usuarios: UsuarioPanel[]
    modulos: { clave: string; etiqueta: string; soloAdmin: boolean }[]
    rolesAdmin: string[]
  }>> {
    return this.request('listarUsuarios', 'POST', {})
  }

  async crearUsuario(data: { nombre: string; email: string; rol: string; permisos: string[] }): Promise<ApiResponse<{ id: string; email: string; tempPassword: string }>> {
    return this.request('crearUsuario', 'POST', data as unknown as Record<string, unknown>)
  }

  // Solo se envían los campos a cambiar. El backend impide quitarse la
  // administración a uno mismo y dejar el sistema sin administradores.
  async actualizarUsuario(data: { id: string; nombre?: string; rol?: string; permisos?: string[]; estado?: 'activo' | 'inactivo' }): Promise<ApiResponse<unknown>> {
    return this.request('actualizarUsuario', 'POST', data as unknown as Record<string, unknown>)
  }

  async restablecerContrasena(id: string): Promise<ApiResponse<{ id: string; email: string; tempPassword: string }>> {
    return this.request('restablecerContrasena', 'POST', { id })
  }

  async getAuditoria(filtros?: { desde?: string; hasta?: string; usuario?: string; accion?: string; limite?: number }): Promise<ApiResponse<RegistroAuditoria[]>> {
    return this.request('getAuditoria', 'POST', (filtros || {}) as Record<string, unknown>)
  }

  // Última sincronización de incidencias (ver sincronizarIncidenciasProgramada).
  async getEstadoPlanilla(): Promise<ApiResponse<{
    ultima_sincronizacion: { cuando: string; desde: string; hasta: string; creadas: number; expiradas: number; origen: string } | null
  }>> {
    return this.request('getEstadoPlanilla', 'POST', {})
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
    /** obligatorio para volver a calificar una evaluación ya calificada */
    recalificar?: boolean
  }): Promise<ApiResponse<{ correo_enviado: boolean; correo_error?: string }>> {
    return this.request('revisarEvaluacion', 'POST', data as unknown as Record<string, unknown>)
  }

  // Panel: todos los cursos (con preguntas_activas); archivados solo si se piden
  async getCapacitacionesAdmin(archivados = false): Promise<ApiResponse<(Capacitacion & { preguntas_activas?: number })[]>> {
    return this.request('getCapacitacionesAdmin', 'POST', { archivados })
  }

  /** Archiva (no borra) o recupera un curso; recuperado vuelve como borrador */
  async archivarCapacitacion(id: string, archivar: boolean): Promise<ApiResponse<null>> {
    return this.request('archivarCapacitacion', 'POST', { id, archivar })
  }

  /** Archiva (estado inactiva) o recupera una pregunta del banco */
  async archivarPregunta(id: string, archivar: boolean): Promise<ApiResponse<null>> {
    return this.request('archivarPregunta', 'POST', { id, archivar })
  }

  /** Reabrir intento: anula una evaluación en curso/sin calificar para volver a rendir */
  async anularEvaluacion(id: string, motivo: string, revisado_por?: string): Promise<ApiResponse<null>> {
    return this.request('anularEvaluacion', 'POST', { id, motivo, revisado_por })
  }

  // ============================================
  // LICITACIONES (admin) — backend/16_licitaciones.gs
  // ============================================

  async licImportar(payload: LicImportPayload): Promise<ApiResponse<Record<string, number | { nuevos: number; actualizados: number }>>> {
    if (LIC_LOCAL) return licLocal.licImportar(payload)
    return this.request('licImportar', 'POST', payload as unknown as Record<string, unknown>)
  }

  async licResumen(): Promise<ApiResponse<LicResumen>> {
    if (LIC_LOCAL) return licLocal.licResumen()
    return this.request('licResumen', 'POST', {})
  }

  async licProcesos(opciones: OpcionesLecturaLic = {}): Promise<ApiResponse<LicProceso[]>> {
    if (LIC_LOCAL) return licLocal.licProcesos(opciones)
    return this.request('licProcesos', 'POST', { ...opciones })
  }

  async licProceso(nom: string): Promise<ApiResponse<{ proceso: LicProceso; postores: LicPostor[]; acciones: LicAccion[] }>> {
    if (LIC_LOCAL) return licLocal.licProceso(nom)
    return this.request('licProceso', 'POST', { nom })
  }

  async licCompetidores(opciones: OpcionesLecturaLic = {}): Promise<ApiResponse<LicCompetidor[]>> {
    if (LIC_LOCAL) return licLocal.licCompetidores(opciones)
    return this.request('licCompetidores', 'POST', { ...opciones })
  }

  async licExperiencia(opciones: OpcionesLecturaLic = {}): Promise<ApiResponse<LicExperiencia[]>> {
    if (LIC_LOCAL) return licLocal.licExperiencia(opciones)
    return this.request('licExperiencia', 'POST', { ...opciones })
  }

  // Propuestas completas con su índice (hoja lic_propuestas; se importa con propuestas.json)
  async licPropuestas(): Promise<ApiResponse<LicPropuesta[]>> {
    if (LIC_LOCAL) return licLocal.licPropuestas()
    return this.request('licPropuestas')
  }

  // ── Archivos en Drive (<TELCOM PAGINA WEB>/Licitaciones), ver src/api/licArchivos.ts ──
  async licArchivosDrive(): Promise<ApiResponse<Record<string, string>>> {
    return this.request('licArchivosDrive')
  }

  async licIndexarDrive(): Promise<ApiResponse<{ archivos: number; carpeta: string }>> {
    return this.request('licIndexarDrive', 'POST', {})
  }

  async licCarpetaDrive(): Promise<ApiResponse<{ id: string; url: string }>> {
    return this.request('licCarpetaDrive')
  }

  async licSubirFoto(data: { carpeta: string; mime: string; base64: string }): Promise<ApiResponse<{ ruta: string; id: string }>> {
    return this.request('licSubirFoto', 'POST', data)
  }

  // PDF nuevo desde el panel → Drive (Licitaciones/acervo/<categoria>/_web/)
  async licSubirDocumento(data: { categoria: string; nombre: string; mime: string; base64: string }): Promise<ApiResponse<{ archivo_vault: string; id: string }>> {
    if (LIC_LOCAL) return licLocal.licSubirDocumento(data)
    return this.request('licSubirDocumento', 'POST', data)
  }

  // ── Edición genérica de fichas (backend/17_lic_edicion.gs) ──────────────
  async licGuardar(data: { entidad: EntidadLic; clave: Record<string, string>; cambios: Record<string, unknown>; crear?: boolean }): Promise<ApiResponse<Record<string, unknown>>> {
    if (LIC_LOCAL) return licLocal.licGuardar(data)
    return this.request('licGuardar', 'POST', data as unknown as Record<string, unknown>)
  }

  async licArchivar(data: { entidad: EntidadLic; clave: Record<string, string>; archivar: boolean }): Promise<ApiResponse<null>> {
    if (LIC_LOCAL) return licLocal.licArchivar(data)
    return this.request('licArchivar', 'POST', data as unknown as Record<string, unknown>)
  }

  async licHistorial(data: { entidad?: EntidadLic; clave?: Record<string, string>; limite?: number } = {}): Promise<ApiResponse<LicCambio[]>> {
    if (LIC_LOCAL) return licLocal.licHistorial(data)
    return this.request('licHistorial', 'POST', data as unknown as Record<string, unknown>)
  }

  async licDeshacer(id: string): Promise<ApiResponse<Record<string, unknown>>> {
    if (LIC_LOCAL) return licLocal.licDeshacer(id)
    return this.request('licDeshacer', 'POST', { id })
  }

  // Asistencia del personal del proyecto enlazado a un servicio (Gestión > Proyectos)
  async licAsistenciaServicio(proyecto_id: string): Promise<ApiResponse<LicAsistenciaServicio>> {
    if (LIC_LOCAL) return { success: false, error: 'La asistencia se ve en la web publicada (en modo local no hay datos del kiosko).' }
    return this.request('licAsistenciaServicio', 'POST', { proyecto_id })
  }

  // Armar propuesta: ZIP con los PDF elegidos en carpetas. En producción lo
  // arma el backend en Drive y devuelve el enlace; en local se descarga directo.
  async licArmarZip(data: { nombre: string; archivos: LicArchivoZip[] }): Promise<ApiResponse<{ url?: string; nombre: string; documentos: number; faltan: string[]; mb?: number }>> {
    if (LIC_LOCAL) return licLocal.licArmarZip(data)
    return this.request('licArmarZip', 'POST', data as unknown as Record<string, unknown>)
  }

  async licServicios(opciones: OpcionesLecturaLic = {}): Promise<ApiResponse<LicServicio[]>> {
    if (LIC_LOCAL) return licLocal.licServicios(opciones)
    return this.request('licServicios', 'POST', { ...opciones })
  }

  async licDocumentos(filtros?: { categoria?: string; dni?: string; archivados?: boolean }): Promise<ApiResponse<LicDocumento[]>> {
    if (LIC_LOCAL) return licLocal.licDocumentos(filtros)
    return this.request('licDocumentos', 'POST', (filtros || {}) as Record<string, unknown>)
  }

  async licActualizarDocumento(data: {
    id: string
    verificado?: string
    vence?: string
    notas?: string
    titulo?: string
    fecha?: string
    monto?: number
  }): Promise<ApiResponse<Partial<LicDocumento>>> {
    if (LIC_LOCAL) return licLocal.licActualizarDocumento(data)
    return this.request('licActualizarDocumento', 'POST', data as unknown as Record<string, unknown>)
  }

  async licCrearDocumento(data: {
    categoria: string
    tipo?: string
    titulo: string
    entidad?: string
    dni?: string
    nombre?: string
    fecha?: string
    periodo_desde?: string
    periodo_hasta?: string
    monto?: number
    archivo_vault?: string
    verificado?: string
    vence?: string
    notas?: string
  }): Promise<ApiResponse<LicDocumento>> {
    if (LIC_LOCAL) return licLocal.licCrearDocumento(data)
    return this.request('licCrearDocumento', 'POST', data as unknown as Record<string, unknown>)
  }

  async licActualizarProceso(data: { nomenclatura: string; estado_seguimiento?: string; notas?: string }): Promise<ApiResponse<Partial<LicProceso>>> {
    if (LIC_LOCAL) return licLocal.licActualizarProceso(data)
    return this.request('licActualizarProceso', 'POST', data as unknown as Record<string, unknown>)
  }

  async licExportarCambios(desde?: string): Promise<ApiResponse<Record<string, Record<string, unknown>[]>>> {
    if (LIC_LOCAL) return licLocal.licExportarCambios(desde)
    return this.request('licExportarCambios', 'POST', desde ? { desde } : {})
  }

  async licPersonal(opciones: OpcionesLecturaLic = {}): Promise<ApiResponse<LicPersonal[]>> {
    if (LIC_LOCAL) return licLocal.licPersonal(opciones)
    return this.request('licPersonal', 'POST', { ...opciones })
  }

  async licContratos(opciones: OpcionesLecturaLic = {}): Promise<ApiResponse<LicContrato[]>> {
    if (LIC_LOCAL) return licLocal.licContratos(opciones)
    return this.request('licContratos', 'POST', { ...opciones })
  }

  async licActualizarPersona(data: { dni: string; empleado_vinculado?: string; notas?: string }): Promise<ApiResponse<Partial<LicPersonal>>> {
    if (LIC_LOCAL) return licLocal.licActualizarPersona(data)
    return this.request('licActualizarPersona', 'POST', data as unknown as Record<string, unknown>)
  }

  async licActualizarContrato(data: { contrato: string; estado?: string; notas?: string }): Promise<ApiResponse<Partial<LicContrato>>> {
    if (LIC_LOCAL) return licLocal.licActualizarContrato(data)
    return this.request('licActualizarContrato', 'POST', data as unknown as Record<string, unknown>)
  }

  async licActualizarFactura(data: { contrato: string; numero: string; verificado?: string; notas?: string }): Promise<ApiResponse<Partial<LicFactura>>> {
    if (LIC_LOCAL) return licLocal.licActualizarFactura(data)
    return this.request('licActualizarFactura', 'POST', data as unknown as Record<string, unknown>)
  }

  // Visor de PDF del vault en modo local (mismo shape que getArchivo/Drive, ver FileViewerModal).
  // Solo tiene sentido con LIC_LOCAL activo: sin el plugin de Vite no hay adónde pedirlo.
  async licArchivo(ruta: string): Promise<ApiResponse<{ base64: string; mimeType: string; fileName: string }>> {
    if (!LIC_LOCAL) return { success: false, error: 'El visor de archivos del vault solo funciona en modo local (VITE_LIC_LOCAL=1)' }
    return licLocal.licArchivo(ruta)
  }
}

export const api = new AppScriptApi()
