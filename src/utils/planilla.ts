// Cálculo de tardanzas, faltas y descuentos según cláusula 13ª y Anexo 3
// del contrato. El sistema solo CALCULA y MUESTRA montos referenciales;
// la planilla oficial la decide el Administrador de Planilla.
// El descuento nunca excede el tiempo no laborado (sin multas ni recargos).

export interface ConfigPlanilla {
  ingreso_manana: string
  salida_manana: string
  ingreso_tarde: string
  salida_tarde: string
  tolerancia_manana_min: number // 10 min SOLO sobre el ingreso de 7:30
  tolerancia_tarde_min: number  // el ingreso de la tarde NO tiene tolerancia (0)
  tardanza_grave_min: number
  jornada_horas: number
  factor_descanso_semanal: number // D. Leg. 713: valor_dia/5 por falta injustificada (configurable)
  plazo_sustento_horas: number
  divisor_mes: number
  rmv: number                   // Remuneración Mínima Vital (los que la ganan se ajustan solos)
  salida_autorizada: string     // hora mínima de la salida 5pm autorizada
}

export const CONFIG_DEFAULT: ConfigPlanilla = {
  ingreso_manana: '07:30',
  salida_manana: '13:00',
  ingreso_tarde: '14:00',
  salida_tarde: '18:00',
  tolerancia_manana_min: 10,
  tolerancia_tarde_min: 0,
  tardanza_grave_min: 60,
  jornada_horas: 9.5,
  factor_descanso_semanal: 0.2,
  plazo_sustento_horas: 48,
  divisor_mes: 30,
  rmv: 1130,
  salida_autorizada: '17:00',
}

export type TipoIncidencia = 'tardanza' | 'salida_anticipada' | 'omision' | 'falta'
export type EstadoIncidencia = 'pendiente' | 'justificada' | 'injustificada'

export interface Incidencia {
  id: string
  dni: string
  nombre: string
  fecha: string // yyyy-MM-dd
  tipo: TipoIncidencia
  evento?: string
  minutos?: number | string
  grave?: boolean | string
  estado: EstadoIncidencia
  nota?: string
  sustento_url?: string
  revisado_por?: string
  fecha_revision?: string
}

export interface SueldoTrabajador {
  dni: string
  nombre: string
  cargo: string
  sueldo: number
  fecha_inicio?: string
  usa_rmv?: boolean
  sede?: string
  email?: string
}

// Los trabajadores con usa_rmv ganan la RMV con ajuste automático: si la RMV
// sube por norma, su sueldo se actualiza solo (parámetro global rmv en la config).
export const sueldoEfectivo = (t: SueldoTrabajador, cfg: ConfigPlanilla): number =>
  t.usa_rmv ? cfg.rmv : t.sueldo

// ── Valores base (fórmula exacta del contrato) ──────────────

export const valorDia = (sueldo: number, cfg: ConfigPlanilla): number =>
  sueldo / cfg.divisor_mes

export const valorHora = (sueldo: number, cfg: ConfigPlanilla): number =>
  valorDia(sueldo, cfg) / cfg.jornada_horas

export const valorMinuto = (sueldo: number, cfg: ConfigPlanilla): number =>
  valorHora(sueldo, cfg) / 60

// ── Derivación de tardanza (misma regla que el backend) ─────
// Dentro de tolerancia: null. Superada: minutos TOTALES desde la hora oficial.
export const horaAMinutos = (hora: string): number => {
  const [h, m] = String(hora).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function derivarTardanza(
  horaMarcada: string,
  horaOficial: string,
  toleranciaMin: number,
  cfg: ConfigPlanilla
): { minutos: number; grave: boolean } | null {
  const retraso = horaAMinutos(horaMarcada) - horaAMinutos(horaOficial)
  if (retraso <= toleranciaMin) return null
  return { minutos: retraso, grave: retraso > cfg.tardanza_grave_min }
}

export function derivarSalidaAnticipada(
  horaMarcada: string,
  horaOficial: string
): { minutos: number; grave: boolean } | null {
  const faltante = horaAMinutos(horaOficial) - horaAMinutos(horaMarcada)
  if (faltante <= 0) return null
  // Retiro antes de la salida sin autorización = tardanza grave
  return { minutos: faltante, grave: true }
}

// ── Salida de la tarde: autorización 5pm y bolsa de compensación ──
// CON autorización y hora >= salida_autorizada: no es incidencia; la hora
// no laborada va a la bolsa de horas por compensar (muestreo ELSE).
// SIN autorización: tardanza grave con los minutos no laborados.
export type ResultadoSalidaTarde =
  | { tipo: 'ok' }
  | { tipo: 'bolsa'; horas: number }
  | { tipo: 'incidencia'; minutos: number; grave: boolean }

export function evaluarSalidaTarde(
  horaMarcada: string,
  autorizado: boolean,
  cfg: ConfigPlanilla
): ResultadoSalidaTarde {
  const faltante = horaAMinutos(cfg.salida_tarde) - horaAMinutos(horaMarcada)
  if (faltante <= 0) return { tipo: 'ok' }
  if (autorizado && horaAMinutos(horaMarcada) >= horaAMinutos(cfg.salida_autorizada)) {
    return { tipo: 'bolsa', horas: Math.round((faltante / 60) * 100) / 100 }
  }
  return { tipo: 'incidencia', minutos: faltante, grave: true }
}

// ── Descuento por incidencia ────────────────────────────────
// justificada → 0. pendiente → se proyecta como si fuera injustificada
// (el panel lo marca como "proyección", no como descuento confirmado).
export function descuentoIncidencia(
  inc: Pick<Incidencia, 'tipo' | 'estado' | 'minutos'>,
  sueldo: number,
  cfg: ConfigPlanilla
): number {
  if (inc.estado === 'justificada') return 0
  switch (inc.tipo) {
    case 'tardanza':
    case 'salida_anticipada':
      return valorMinuto(sueldo, cfg) * (Number(inc.minutos) || 0)
    case 'falta':
      // valor_dia + pérdida proporcional del descanso semanal (valor_dia × factor)
      return valorDia(sueldo, cfg) * (1 + cfg.factor_descanso_semanal)
    case 'omision':
      // Día computado como no laborado (si no se regularizó)
      return valorDia(sueldo, cfg)
    default:
      return 0
  }
}

// ── Resumen mensual por trabajador ──────────────────────────

export interface ResumenMes {
  tardanzas: number
  minutosAcumulados: number
  faltasInjustificadas: number
  faltasJustificadas: number
  omisiones: number
  salidasAnticipadas: number
  descuentoConfirmado: number // solo injustificadas
  descuentoProyectado: number // injustificadas + pendientes
  pendientes: number
}

export function resumenMensual(
  incidenciasMes: Incidencia[],
  sueldo: number,
  cfg: ConfigPlanilla
): ResumenMes {
  const r: ResumenMes = {
    tardanzas: 0,
    minutosAcumulados: 0,
    faltasInjustificadas: 0,
    faltasJustificadas: 0,
    omisiones: 0,
    salidasAnticipadas: 0,
    descuentoConfirmado: 0,
    descuentoProyectado: 0,
    pendientes: 0,
  }
  for (const inc of incidenciasMes) {
    const d = descuentoIncidencia(inc, sueldo, cfg)
    if (inc.estado === 'pendiente') r.pendientes++
    if (inc.estado === 'injustificada') r.descuentoConfirmado += d
    if (inc.estado !== 'justificada') r.descuentoProyectado += d

    switch (inc.tipo) {
      case 'tardanza':
        if (inc.estado !== 'justificada') {
          r.tardanzas++
          r.minutosAcumulados += Number(inc.minutos) || 0
        }
        break
      case 'salida_anticipada':
        if (inc.estado !== 'justificada') {
          r.salidasAnticipadas++
          r.minutosAcumulados += Number(inc.minutos) || 0
        }
        break
      case 'falta':
        if (inc.estado === 'justificada') r.faltasJustificadas++
        else r.faltasInjustificadas++
        break
      case 'omision':
        if (inc.estado !== 'justificada') r.omisiones++
        break
    }
  }
  return r
}

// ── Escala disciplinaria (solo alertas, NO descuento extra) ─
// 3 tardanzas en el mismo mes calendario = 1 falta disciplinaria.
// Escala por trimestre: 1ª → amonestación verbal, 2ª → escrita,
// 3ª → suspensión 1-3 días, reiterancia → evaluar despido art. 25°.

export interface Disciplina {
  faltasDisciplinarias: number
  etiqueta: string | null
  alertas: string[]
}

const ETIQUETAS_ESCALA = [
  null,
  'Amonestación verbal',
  'Amonestación escrita',
  'Suspensión 1–3 días',
  'Evaluar despido art. 25°',
]

export function calcularDisciplina(incidenciasTrimestre: Incidencia[]): Disciplina {
  // Tardanzas no justificadas agrupadas por mes calendario
  const tardanzasPorMes: Record<string, number> = {}
  let faltasInjust = 0
  const alertas: string[] = []

  for (const inc of incidenciasTrimestre) {
    if (inc.estado === 'justificada') continue
    const mes = String(inc.fecha).slice(0, 7)
    if (inc.tipo === 'tardanza' || inc.tipo === 'salida_anticipada') {
      tardanzasPorMes[mes] = (tardanzasPorMes[mes] || 0) + 1
      if (inc.grave === true || inc.grave === 'TRUE' || Number(inc.minutos) > 60) {
        if (!alertas.includes('Tardanza grave (>60 min)')) alertas.push('Tardanza grave (>60 min)')
      }
    }
    if (inc.tipo === 'falta') faltasInjust++
  }

  const faltasPorTardanzas = Object.values(tardanzasPorMes)
    .reduce((acc, n) => acc + Math.floor(n / 3), 0)
  const total = faltasPorTardanzas + faltasInjust

  // Abandono: 3+ faltas no justificadas en días hábiles consecutivos
  const fechasFaltas = incidenciasTrimestre
    .filter((i) => i.tipo === 'falta' && i.estado !== 'justificada')
    .map((i) => String(i.fecha))
    .sort()
  let consecutivas = 1
  for (let i = 1; i < fechasFaltas.length; i++) {
    const prev = new Date(fechasFaltas[i - 1] + 'T00:00:00')
    const cur = new Date(fechasFaltas[i] + 'T00:00:00')
    let dias = Math.round((cur.getTime() - prev.getTime()) / 86400000)
    // viernes → lunes cuenta como consecutivo
    if (dias === 3 && prev.getDay() === 5) dias = 1
    consecutivas = dias === 1 ? consecutivas + 1 : 1
    if (consecutivas >= 3) {
      if (!alertas.includes('Posible abandono (≥3 días consecutivos)'))
        alertas.push('Posible abandono (≥3 días consecutivos)')
    }
  }

  return {
    faltasDisciplinarias: total,
    etiqueta: ETIQUETAS_ESCALA[Math.min(total, 4)] ?? null,
    alertas,
  }
}

export const formatoSoles = (n: number): string =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
