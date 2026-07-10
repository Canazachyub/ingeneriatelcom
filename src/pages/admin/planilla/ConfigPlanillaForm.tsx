import { motion, AnimatePresence } from 'framer-motion'

interface ConfigPlanillaFormProps {
  show: boolean
  configDraft: Record<string, string>
  setConfigDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>
  savingConfig: boolean
  onCancel: () => void
  onGuardar: () => void
}

export default function ConfigPlanillaForm({
  show, configDraft, setConfigDraft, savingConfig, onCancel, onGuardar,
}: ConfigPlanillaFormProps) {
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
              {([
                ['ingreso_manana', 'Ingreso mañana'],
                ['salida_manana', 'Salida mañana'],
                ['ingreso_tarde', 'Ingreso tarde'],
                ['salida_tarde', 'Salida tarde'],
                ['tolerancia_manana_min', 'Tolerancia mañana (min)'],
                ['tolerancia_tarde_min', 'Tolerancia tarde (min)'],
                ['tardanza_grave_min', 'Grave desde (min)'],
                ['jornada_horas', 'Jornada (horas)'],
                ['factor_descanso_semanal', 'Factor dominical'],
                ['plazo_sustento_horas', 'Plazo sustento (h)'],
                ['divisor_mes', 'Divisor mensual'],
                ['rmv', 'RMV (S/)'],
                ['salida_autorizada', 'Salida autorizada'],
              ] as [string, string][]).map(([k, label]) => (
                <div key={k}>
                  <label className="block text-xs text-primary-400 mb-1">{label}</label>
                  <input
                    value={configDraft[k] ?? ''}
                    onChange={(e) => setConfigDraft((prev) => ({ ...prev, [k]: e.target.value }))}
                    className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-lg text-sm text-white focus:outline-none focus:border-accent-electric"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onCancel} className="px-4 py-2 text-sm text-primary-400 hover:text-white">
                Cancelar
              </button>
              <button
                onClick={onGuardar}
                disabled={savingConfig}
                className="px-4 py-2 bg-accent-electric/20 border border-accent-electric/40 text-accent-electric rounded-lg text-sm font-medium hover:bg-accent-electric/30 disabled:opacity-50"
              >
                {savingConfig ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
