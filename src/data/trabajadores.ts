// Lista fija de trabajadores autorizados para el registro de asistencia.
// No requiere hoja de empleados: el reconocimiento por DNI es instantáneo en el frontend.

export interface TrabajadorFijo {
  dni: string
  nombre: string
  cargo: string
}

export const TRABAJADORES: TrabajadorFijo[] = [
  { dni: '46809070', nombre: 'Araujo Álvarez, Andrés Steven', cargo: 'Coordinador General' },
  { dni: '73316735', nombre: 'Marroquín Concha, Diego Mauricio', cargo: 'Analista Legal de Reclamos' },
  { dni: '74135306', nombre: 'Vargas Miranda, Juan Joseph', cargo: 'Analista Legal de Reclamos' },
  { dni: '73354681', nombre: 'Cayllahua Zárate, Dalia Avely', cargo: 'Analista Junior de Reclamos' },
  { dni: '74525595', nombre: 'León Umeres, Milagros Jhenifer', cargo: 'Asistente Administrativo' },
  { dni: '77383250', nombre: 'Condori Cáceres, Jocabed Adriana', cargo: 'Tramitador / Digitador' },
  { dni: '72889070', nombre: 'Zárate Castañeda, Mhyalhu Sthefanya', cargo: 'Tramitador / Digitador' },
  { dni: '74147961', nombre: 'Hurtado Vega, Marilyn', cargo: 'Tramitador / Digitador' },
]

export const buscarTrabajador = (dni: string): TrabajadorFijo | undefined =>
  TRABAJADORES.find(t => t.dni === dni)

// Los 4 eventos del día. Horario referencial L-V, pero el registro
// está habilitado todos los días (no se bloquea por día de semana).
export type EventoAsistencia = 'ingreso_manana' | 'salida_manana' | 'ingreso_tarde' | 'salida_tarde'

export interface EventoConfig {
  key: EventoAsistencia
  label: string
  horaRef: string      // hora referencial para mostrar
  horaMinutos: number  // minutos desde medianoche, para sugerir evento y calcular tardanza
  tipo: 'ingreso' | 'salida'
}

export const EVENTOS: EventoConfig[] = [
  { key: 'ingreso_manana', label: 'Ingreso mañana', horaRef: '7:30 am', horaMinutos: 7 * 60 + 30, tipo: 'ingreso' },
  { key: 'salida_manana', label: 'Salida mañana', horaRef: '1:00 pm', horaMinutos: 13 * 60, tipo: 'salida' },
  { key: 'ingreso_tarde', label: 'Ingreso tarde', horaRef: '2:00 pm', horaMinutos: 14 * 60, tipo: 'ingreso' },
  { key: 'salida_tarde', label: 'Salida tarde', horaRef: '6:00 pm', horaMinutos: 18 * 60, tipo: 'salida' },
]

export const EVENTO_LABELS: Record<string, string> = Object.fromEntries(
  EVENTOS.map(e => [e.key, e.label])
)

// Sugerir el evento más cercano a la hora actual
export const sugerirEvento = (fecha: Date = new Date()): EventoAsistencia => {
  const minutos = fecha.getHours() * 60 + fecha.getMinutes()
  let mejor = EVENTOS[0]
  let mejorDist = Infinity
  for (const ev of EVENTOS) {
    const dist = Math.abs(minutos - ev.horaMinutos)
    if (dist < mejorDist) {
      mejorDist = dist
      mejor = ev
    }
  }
  return mejor.key
}

// Registro guardado en la hoja 'asistencias'
export interface RegistroAsistencia {
  id: string
  dni: string
  nombre: string
  cargo: string
  evento: EventoAsistencia
  fecha: string
  hora: string
  gps_lat?: number | string
  gps_lng?: number | string
  gps_accuracy?: number | string
  foto_url?: string
  timestamp?: string
}

// Registro guardado en la hoja 'justificaciones'
export interface Justificacion {
  id: string
  dni: string
  nombre: string
  cargo: string
  motivo: string
  descripcion?: string
  archivo_url?: string
  fecha: string
  timestamp?: string
}
