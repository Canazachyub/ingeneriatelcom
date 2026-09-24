import { useQuery } from '@tanstack/react-query'
import {
  api,
  ApiResponse,
  DashboardStats,
  Employee,
  Project,
  EmployeeAssignment,
} from '../api/appScriptApi'

// ─── Query keys ─────────────────────────────────────────────────────────────
// Centralizados aqui para que las mutaciones (llamadas api directas en las
// paginas) puedan invalidar con las mismas claves via queryClient.invalidateQueries.

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  attendanceToday: ['attendanceToday'] as const,
  employees: ['employees'] as const,
  projects: ['projects'] as const,
  assignments: (projectId?: string) => ['assignments', projectId] as const,
  // Centro de actividades (Dashboard)
  incidenciasMes: (mes: string) => ['incidenciasMes', mes] as const,
  applicationsAdmin: ['applicationsAdmin'] as const,
  contacts: ['contacts'] as const,
  justificacionesRecientes: (desde: string) => ['justificacionesRecientes', desde] as const,
  jobsAdmin: ['jobsAdmin'] as const,
  evaluaciones: ['evaluaciones'] as const,
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async (): Promise<DashboardStats> => {
      const result = await api.getDashboardStats()
      if (!result.success) throw new Error(result.error)
      return result.data as DashboardStats
    },
  })
}

// Asistencia de hoy: staleTime corto porque es data del dia que cambia seguido.
export function useAttendanceToday() {
  return useQuery({
    queryKey: queryKeys.attendanceToday,
    queryFn: async () => {
      const result = await api.getAttendanceToday()
      if (!result.success) throw new Error(result.error)
      return result.data!
    },
    staleTime: 60 * 1000,
  })
}

// ─── Employees ──────────────────────────────────────────────────────────────

export function useEmployees() {
  return useQuery({
    queryKey: queryKeys.employees,
    queryFn: async (): Promise<Employee[]> => {
      const result = await api.getEmployees()
      if (!result.success) throw new Error(result.error)
      return result.data as Employee[]
    },
  })
}

// ─── Projects ───────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async (): Promise<Project[]> => {
      const result = await api.getProjects()
      if (!result.success) throw new Error(result.error)
      return result.data as Project[]
    },
  })
}

// ─── Assignments ────────────────────────────────────────────────────────────

export function useAssignments(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.assignments(projectId),
    queryFn: async (): Promise<EmployeeAssignment[]> => {
      const result = await api.getAssignments(projectId)
      if (!result.success) throw new Error(result.error)
      return result.data as EmployeeAssignment[]
    },
    enabled: !!projectId,
  })
}

// ─── Centro de actividades ──────────────────────────────────────────────────
// Un hook por fuente: cada bloque del Dashboard carga y falla por separado.
// Si la consulta falla se LANZA error (React Query → isError): el bloque
// muestra "no se pudo cargar" en vez de un 0 que parezca "no hay nada".

async function lista<T>(p: Promise<ApiResponse<unknown>>): Promise<T[]> {
  const r = await p
  if (!r.success) throw new Error(r.error || 'Error al cargar')
  return (Array.isArray(r.data) ? r.data : []) as T[]
}

const DOS_MIN = 2 * 60 * 1000

/** Incidencias del mes en curso (nivel admin en el backend: pasar enabled=false si no lo es). */
export function useIncidenciasMes(desde: string, hasta: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.incidenciasMes(desde),
    queryFn: () => lista<Record<string, unknown>>(api.getIncidencias({ desde, hasta })),
    enabled,
    staleTime: DOS_MIN,
  })
}

export function useApplicationsAdmin(enabled = true) {
  return useQuery({
    queryKey: queryKeys.applicationsAdmin,
    queryFn: () => lista<Record<string, unknown>>(api.getApplicationsAdmin()),
    enabled,
    staleTime: DOS_MIN,
  })
}

export function useContacts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.contacts,
    queryFn: () => lista<Record<string, unknown>>(api.getContacts()),
    enabled,
    staleTime: DOS_MIN,
  })
}

export function useJustificacionesRecientes(desde: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.justificacionesRecientes(desde),
    queryFn: () => lista<Record<string, unknown>>(api.getJustificaciones({ desde })),
    enabled,
    staleTime: DOS_MIN,
  })
}

export function useJobsAdmin(enabled = true) {
  return useQuery({
    queryKey: queryKeys.jobsAdmin,
    queryFn: () => lista<Record<string, unknown>>(api.getJobsAdmin()),
    enabled,
    staleTime: DOS_MIN,
  })
}

export function useEvaluacionesAdmin(enabled = true) {
  return useQuery({
    queryKey: queryKeys.evaluaciones,
    queryFn: () => lista<Record<string, unknown>>(api.getEvaluaciones()),
    enabled,
    staleTime: DOS_MIN,
  })
}
