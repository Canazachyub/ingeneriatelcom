// Tipos para el sistema de consulta de postulaciones

export type EstadoPostulacion =
  | 'recibido'
  | 'en_revision'
  | 'preseleccionado'
  | 'entrevista_programada'
  | 'evaluacion_pendiente'
  | 'aprobado'
  | 'no_seleccionado'

export interface PostulacionInfo {
  id: string
  dni: string
  nombre: string
  email: string
  telefono: string
  puesto: string
  convocatoriaId: string
  estado: EstadoPostulacion
  fechaPostulacion: string
  puntaje?: number
  observaciones?: string
}

export interface EtapaCronograma {
  etapa: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  descripcion?: string
  activa: boolean
  completada: boolean
  orden: number
}

export interface EntrevistaInfo {
  id: string
  fecha: string
  hora: string
  lugar: string
  linkVirtual?: string
  indicaciones: string
  realizada: boolean
  resultado?: 'pendiente' | 'aprobado' | 'rechazado'
}

export interface EvaluacionInfo {
  id: string
  fechaDisponibleDesde: string
  fechaDisponibleHasta: string
  enlace: string
  duracion: number // minutos
  temas: string
  fechaRendida?: string
  puntaje?: number
  aprobado?: boolean
}

export interface ConsultaPostulacionResponse {
  encontrado: boolean
  postulacion?: PostulacionInfo
  cronograma?: EtapaCronograma[]
  entrevista?: EntrevistaInfo
  evaluacion?: EvaluacionInfo
  mensaje?: string
}

// Tipos para el sistema de asistencia

export interface EmpleadoAsistencia {
  dni: string
  nombre: string
  puesto: string
  departamento?: string
  activo: boolean
  fotoUrl?: string
}

export interface RegistroAsistencia {
  id: string
  dni: string
  fecha: string // YYYY-MM-DD
  tipo: 'entrada' | 'salida'
  hora: string // HH:mm:ss
  lat: number
  lng: number
  accuracy: number
}

export interface VerificarEmpleadoResponse {
  encontrado: boolean
  empleado?: EmpleadoAsistencia
  ultimoRegistroHoy?: RegistroAsistencia
  sugerencia?: 'entrada' | 'salida'
  mensaje?: string
}

export interface MarcarAsistenciaResponse {
  success: boolean
  registro?: RegistroAsistencia
  mensaje: string
}

// Tipos para geolocalización

export interface GeoLocation {
  lat: number
  lng: number
  accuracy: number
}

export interface GeoLocationState {
  location: GeoLocation | null
  error: string | null
  loading: boolean
}

// Mapeo de estados a colores y labels

export const ESTADO_CONFIG: Record<EstadoPostulacion, { label: string; color: string; bgColor: string }> = {
  recibido: {
    label: 'Recibido',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  en_revision: {
    label: 'En Revisión',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20'
  },
  preseleccionado: {
    label: 'Preseleccionado',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20'
  },
  entrevista_programada: {
    label: 'Entrevista Programada',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20'
  },
  evaluacion_pendiente: {
    label: 'Evaluación Pendiente',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20'
  },
  aprobado: {
    label: 'Aprobado',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20'
  },
  no_seleccionado: {
    label: 'No Seleccionado',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20'
  }
}
