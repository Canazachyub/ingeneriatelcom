// Roles del panel — espejo EXACTO de esRolAdmin_ en backend/02_auth.gs.
// Si cambia ROLES_ADMIN_ allá, cambiar aquí también.
//
// El usuario llega con dos formas según de dónde venga:
//  · login        → { id, nombre, email, rol, permisos[], empleadoId }
//  · verifyToken  → { id, name, email, role, permisos[], employeeId }
// Por eso se leen ambos nombres de campo.

export const ROLES_ADMIN = ['admin', 'administrador', 'manager', 'supervisor', 'rrhh']

interface UsuarioLike {
  role?: unknown
  rol?: unknown
  permisos?: unknown
}

export function rolDe(user: unknown): string {
  if (!user || typeof user !== 'object') return ''
  const u = user as UsuarioLike
  return String(u.role ?? u.rol ?? '').toLowerCase().trim()
}

function permisosDe(user: unknown): string[] {
  if (!user || typeof user !== 'object') return []
  const p = (user as UsuarioLike).permisos
  const lista = Array.isArray(p) ? p : typeof p === 'string' ? p.split(',') : []
  return lista.map((x) => String(x || '').toLowerCase().trim())
}

/** true si el backend le permite las acciones de nivel 'admin' (planilla, sueldos, borrar…). */
export function esAdmin(user: unknown): boolean {
  return ROLES_ADMIN.includes(rolDe(user)) || permisosDe(user).includes('all')
}

/** Nombre visible del usuario (login trae `nombre`, verifyToken trae `name`). */
export function nombreDe(user: unknown): string {
  if (!user || typeof user !== 'object') return ''
  const u = user as { name?: unknown; nombre?: unknown; email?: unknown }
  return String(u.name ?? u.nombre ?? u.email ?? '')
}

// ── Permisos por módulo — espejo EXACTO de puedeModulo_ (backend/13_usuarios.gs)
// Rol de administración o permiso 'all' → todo. Módulos soloAdmin no se
// conceden por permiso. El resto exige el permiso del módulo en `permisos`.
// Si cambia MODULOS_PANEL_ allá, cambiar aquí también.
export type Modulo =
  | 'asistencias' | 'personal' | 'proyectos' | 'bolsa' | 'mensajes' | 'capacitaciones' | 'reportes'
  | 'planilla' | 'usuarios' | 'auditoria' | 'licitaciones'

export const MODULOS: { clave: Modulo; etiqueta: string; soloAdmin: boolean }[] = [
  { clave: 'asistencias', etiqueta: 'Asistencias', soloAdmin: false },
  { clave: 'personal', etiqueta: 'Empleados', soloAdmin: false },
  { clave: 'proyectos', etiqueta: 'Proyectos', soloAdmin: false },
  { clave: 'bolsa', etiqueta: 'Bolsa y postulaciones', soloAdmin: false },
  { clave: 'mensajes', etiqueta: 'Mensajes', soloAdmin: false },
  { clave: 'capacitaciones', etiqueta: 'Capacitaciones', soloAdmin: false },
  { clave: 'reportes', etiqueta: 'Reportes', soloAdmin: false },
  { clave: 'planilla', etiqueta: 'Planilla', soloAdmin: true },
  { clave: 'usuarios', etiqueta: 'Usuarios', soloAdmin: true },
  { clave: 'auditoria', etiqueta: 'Auditoría', soloAdmin: true },
  // Hoy solo administracion (backend/01_router.gs: rutas licXxx nivel 'admin').
  { clave: 'licitaciones', etiqueta: 'Licitaciones', soloAdmin: true },
]

/** true si el usuario puede usar el módulo (mismo criterio que el backend). */
export function puede(user: unknown, modulo: Modulo | 'soloAdmin'): boolean {
  if (esAdmin(user)) return true
  if (modulo === 'soloAdmin') return false
  const m = MODULOS.find((x) => x.clave === modulo)
  if (!m || m.soloAdmin) return false
  return permisosDe(user).includes(modulo)
}
