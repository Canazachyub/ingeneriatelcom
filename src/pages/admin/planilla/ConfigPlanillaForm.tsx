import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaExclamationTriangle } from 'react-icons/fa'

interface ConfigPlanillaFormProps {
  show: boolean
  configDraft: Record<string, string>
  setConfigDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>
  /** valores vigentes (para mostrar qué cambia antes de guardar) */
  original: Record<string, string>
  savingConfig: boolean
  onCancel: () => void
  onGuardar: () => void
}

// Reglas de cada parámetro. Deben coincidir con REGLAS_CONFIG_PLANILLA_ del
// backend (08_planilla.gs), que vuelve a validar al guardar.
type Regla = { etiqueta: string; tipo: 'hora' } | { etiqueta: string; tipo: 'num'; min: number; max: number; entero?: boolean; unidad?: string }

export const REGLAS_CONFIG: Record<string, Regla> = {
  ingreso_manana: { etiqueta: 'Ingreso mañana', tipo: 'hora' },
  salida_manana: { etiqueta: 'Salida mañana', tipo: 'hora' },
  ingreso_tarde: { etiqueta: 'Ingreso tarde', tipo: 'hora' },
  salida_tarde: { etiqueta: 'Salida tarde', tipo: 'hora' },
  tolerancia_manana_min: { etiqueta: 'Tolerancia mañana (min)', tipo: 'num', min: 0, max: 120, entero: true, unidad: 'min' },
  tolerancia_tarde_min: { etiqueta: 'Tolerancia tarde (min)', tipo: 'num', min: 0, max: 120, entero: true, unidad: 'min' },
  tardanza_grave_min: { etiqueta: 'Grave desde (min)', tipo: 'num', min: 1, max: 480, entero: true, unidad: 'min' },
  jornada_horas: { etiqueta: 'Jornada (horas)', tipo: 'num', min: 1, max: 24, unidad: 'h' },
  factor_descanso_semanal: { etiqueta: 'Factor dominical', tipo: 'num', min: 0, max: 1 },
  plazo_sustento_horas: { etiqueta: 'Plazo sustento (h)', tipo: 'num', min: 1, max: 720, entero: true, unidad: 'h' },
  divisor_mes: { etiqueta: 'Divisor mensual', tipo: 'num', min: 1, max: 31, entero: true },
  rmv: { etiqueta: 'RMV (S/)', tipo: 'num', min: 500, max: 10000 },
  salida_autorizada: { etiqueta: 'Salida autorizada', tipo: 'hora' },
}

const aMin = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + b }

/** Devuelve { clave: mensaje } con los errores del borrador (vacío = todo bien). */
export function validarConfig(d: Record<string, string>): Record<string, string> {
  const e: Record<string, string> = {}
  Object.entries(REGLAS_CONFIG).forEach(([k, r]) => {
    const v = String(d[k] ?? '').trim()
    if (!v) { e[k] = 'Obligatorio'; return }
    if (r.tipo === 'hora') {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) e[k] = 'Formato HH:MM (ej. 07:30)'
      return
    }
    const n = Number(v.replace(',', '.'))
    if (Number.isNaN(n)) { e[k] = 'Solo números'; return }
    if (r.entero && !Number.isInteger(n)) { e[k] = 'Número entero'; return }
    if (n < r.min || n > r.max) e[k] = `Entre ${r.min} y ${r.max}${r.unidad ? ' ' + r.unidad : ''}`
  })
  // Orden lógico del horario
  const hs = ['ingreso_manana', 'salida_manana', 'ingreso_tarde', 'salida_tarde']
  if (hs.every((k) => !e[k])) {
    const [im, sm, it, st] = hs.map((k) => aMin(String(d[k]).trim()))
    if (!(im < sm)) e.salida_manana = 'Debe ser después del ingreso de la mañana'
    else if (!(sm <= it)) e.ingreso_tarde = 'Debe ser igual o después de la salida de la mañana'
    else if (!(it < st)) e.salida_tarde = 'Debe ser después del ingreso de la tarde'
  }
  return e
}

export default function ConfigPlanillaForm({
  show, configDraft, setConfigDraft, original, savingConfig, onCancel, onGuardar,
}: ConfigPlanillaFormProps) {
  const [confirmando, setConfirmando] = useState(false)
  const errores = validarConfig(configDraft)
  const hayErrores = Object.keys(errores).length > 0
  const cambios = Object.keys(REGLAS_CONFIG).filter((k) => String(configDraft[k] ?? '').trim() !== String(original[k] ?? '').trim())

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="bg-primary-900/60 border border-primary-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              Configuración de horario y descuentos (cláusula 13ª / Anexo 3)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(REGLAS_CONFIG).map(([k, r]) => (
                <div key={k}>
                  <label className="block text-xs text-primary-400 mb-1">{r.etiqueta}</label>
                  <input
                    value={configDraft[k] ?? ''}
                    inputMode={r.tipo === 'num' ? 'decimal' : undefined}
                    placeholder={r.tipo === 'hora' ? 'HH:MM' : undefined}
                    onChange={(e) => { setConfirmando(false); setConfigDraft((prev) => ({ ...prev, [k]: e.target.value })) }}
                    className={`w-full px-3 py-2 bg-primary-950 border rounded-lg text-sm text-white focus:outline-none focus:border-accent-electric ${errores[k] ? 'border-rose-500' : cambios.includes(k) ? 'border-amber-400' : 'border-primary-800'}`}
                  />
                  {errores[k] && <p className="text-[11px] text-rose-400 mt-1">{errores[k]}</p>}
                </div>
              ))}
            </div>

            {confirmando && cambios.length > 0 && !hayErrores && (
              <div className="mt-4 p-4 rounded-xl border border-amber-500/50 bg-amber-500/10 text-sm text-amber-100">
                <p className="font-semibold flex items-center gap-2"><FaExclamationTriangle /> Vas a cambiar {cambios.length === 1 ? 'este valor' : `estos ${cambios.length} valores`}:</p>
                <ul className="mt-2 space-y-1 text-xs">
                  {cambios.map((k) => (
                    <li key={k}>
                      <b>{REGLAS_CONFIG[k].etiqueta}</b>: <span className="line-through text-rose-300">{original[k] || '(vacío)'}</span> → <span className="text-emerald-300">{configDraft[k]}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">Afecta el cálculo de tardanzas y descuentos de <b>todos</b> los trabajadores desde ahora.</p>
              </div>
            )}

            <div className="flex justify-end items-center gap-2 mt-4">
              {hayErrores && <span className="text-xs text-rose-400 mr-auto">Corrige los campos en rojo</span>}
              {!hayErrores && !cambios.length && <span className="text-xs text-primary-500 mr-auto">No hay cambios</span>}
              <button onClick={() => { setConfirmando(false); onCancel() }} className="px-4 py-2 text-sm text-primary-400 hover:text-white">
                Cancelar
              </button>
              {!confirmando ? (
                <button
                  onClick={() => setConfirmando(true)}
                  disabled={savingConfig || hayErrores || !cambios.length}
                  className="px-4 py-2 bg-accent-electric/20 border border-accent-electric/40 text-accent-electric rounded-lg text-sm font-medium hover:bg-accent-electric/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Guardar configuración
                </button>
              ) : (
                <button
                  onClick={() => { onGuardar(); setConfirmando(false) }}
                  disabled={savingConfig || hayErrores}
                  className="px-4 py-2 bg-amber-500 text-[#111827] rounded-lg text-sm font-bold hover:bg-amber-400 disabled:opacity-50"
                >
                  {savingConfig ? 'Guardando...' : `Sí, guardar ${cambios.length} cambio${cambios.length > 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
