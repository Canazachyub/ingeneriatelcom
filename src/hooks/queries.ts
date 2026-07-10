import { useQuery } from '@tanstack/react-query'
import {
  api,
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
