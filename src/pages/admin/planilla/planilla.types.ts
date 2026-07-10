import {
  ConfigPlanilla, Disciplina, Incidencia, ResumenMes, SueldoTrabajador,
} from '../../../utils/planilla'

export const TIPO_LABELS: Record<string, string> = {
  tardanza: 'Tardanza',
  salida_anticipada: 'Salida anticipada',
  omision: 'Omisión de marcado',
  falta: 'Falta',
}

export const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  justificada: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  injustificada: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
}

export const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente de sustento',
  justificada: 'Justificada',
  injustificada: 'Injustificada',
}

export const mesActualISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const finDeMes = (mes: string) => {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const inicioTrimestre = (mes: string) => {
  const [y, m] = mes.split('-').map(Number)
  const qm = Math.floor((m - 1) / 3) * 3 + 1
  return `${y}-${String(qm).padStart(2, '0')}-01`
}

export const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const nombreMes = (mes: string) => {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
}

// Fila calculada por trabajador (memo en PlanillaPage)
export interface Fila {
  trabajador: SueldoTrabajador
  sueldo: number
  incMes: Incidencia[]
  resumen: ResumenMes
  disciplina: Disciplina
  bolsa: number
}

export type { ConfigPlanilla, Incidencia, SueldoTrabajador }
