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
