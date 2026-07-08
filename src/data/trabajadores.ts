// Lista de trabajadores para el registro de asistencia.
// FALLBACK local: la fuente de verdad es la hoja 'sueldos' del backend
// (endpoint público getTrabajadores, sin sueldos). Los trabajadores nuevos
// se agregan desde el panel de Planilla y el kiosko los reconoce solo.

export interface TrabajadorFijo {
  dni: string
  nombre: string
  cargo: string
  sede?: string
  // true = trabajador de campo (sin correo): registro simple Ingreso/Salida,
  // fuera del modelo de descuentos. false/undefined = oficina (4 eventos).
  registro_simple?: boolean
}

export const TRABAJADORES: TrabajadorFijo[] = [
  { dni: '46809070', nombre: 'Araujo Álvarez, Andre Steven', cargo: 'Coordinador General' },
  { dni: '73316735', nombre: 'Marroquín Concha, Diego Mauricio', cargo: 'Analista Legal de Reclamos' },
  { dni: '74135306', nombre: 'Vargas Miranda, Juan Joseph', cargo: 'Analista Legal de Reclamos' },
  { dni: '70401672', nombre: 'Montufar Diaz, Alvaro Rodrigo', cargo: 'Analista Junior de Reclamos' },
  { dni: '74525595', nombre: 'León Umeres, Milagros Jhenifer', cargo: 'Asistente Administrativo' },
  { dni: '72374021', nombre: 'Condori Cáceres, Jocabed Adriana', cargo: 'Tramitador / Digitador' },
  { dni: '72743443', nombre: 'Ramos Serrani, Anais Gasdaly', cargo: 'Tramitador / Digitador' },
  { dni: '74147961', nombre: 'Hurtado Vega, Marilyn', cargo: 'Tramitador / Digitador' },
  { dni: '45298858', nombre: 'Canaza Chique, Darwin', cargo: 'Operario', registro_simple: true },
  { dni: '80644637', nombre: 'Canaza Chique, Jael Fausto', cargo: 'Operario', registro_simple: true },
  { dni: '42239901', nombre: 'Canaza Chique, Willy', cargo: 'Operario', registro_simple: true },
  { dni: '47815297', nombre: 'Marin Callañaupa, George Smith', cargo: 'Operario', registro_simple: true },
  { dni: '74323866', nombre: 'Maceda Econema, Franco Paolo', cargo: 'Operario', registro_simple: true },
]

export const buscarTrabajador = (dni: string, lista: TrabajadorFijo[] = TRABAJADORES): TrabajadorFijo | undefined =>
  lista.find(t => t.dni === dni)

// Los 4 eventos del día. Jornada L-V de 47h30min semanales (9.5h/día,
// almuerzo 1:00-2:00 no computable). El registro está habilitado todos
// los días (no se bloquea por día de semana). Estos valores son el
// fallback: la fuente editable es la hoja 'config_planilla' del backend.
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

// Eventos de trabajadores de campo (sin horario fijo): Ingreso/Salida por turnos.
export type EventoCampo = 'ingreso_campo' | 'salida_campo'
export type EventoRegistro = EventoAsistencia | EventoCampo

export const EVENTO_LABELS: Record<string, string> = {
  ...Object.fromEntries(EVENTOS.map(e => [e.key, e.label])),
  ingreso_campo: 'Ingreso',
  salida_campo: 'Salida',
}

// Tipo (ingreso/salida) de cualquier evento, de oficina o de campo.
export const tipoEvento = (evento: string): 'ingreso' | 'salida' =>
  evento.indexOf('salida') === 0 ? 'salida' : 'ingreso'

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
