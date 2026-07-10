import { motion, AnimatePresence } from 'framer-motion'
import { FaTimes, FaCheckCircle, FaTimesCircle, FaClock, FaSpinner } from 'react-icons/fa'
import { Incidencia } from '../../../utils/planilla'
import { TIPO_LABELS } from './planilla.types'

interface IncidenciasPanelProps {
  revisando: Incidencia | null
  revEstado: 'justificada' | 'injustificada'
  setRevEstado: (estado: 'justificada' | 'injustificada') => void
  revNota: string
  setRevNota: (nota: string) => void
  revSustento: string
  setRevSustento: (url: string) => void
  guardandoRev: boolean
  onCerrar: () => void
  onGuardar: () => void
}

export default function IncidenciasPanel({
  revisando, revEstado, setRevEstado, revNota, setRevNota, revSustento, setRevSustento,
  guardandoRev, onCerrar, onGuardar,
}: IncidenciasPanelProps) {
  return (
    <AnimatePresence>
      {revisando && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onCerrar() }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary-800">
              <div>
                <h3 className="font-bold text-white text-sm">Revisar incidencia</h3>
                <p className="text-xs text-gray-500">
                  {revisando.nombre} · {revisando.fecha} · {TIPO_LABELS[revisando.tipo]}
                  {revisando.minutos ? ` · ${revisando.minutos} min` : ''}
                </p>
              </div>
              <button onClick={onCerrar} className="p-2 text-gray-400 hover:text-white rounded-lg">
                <FaTimes />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRevEstado('justificada')}
                  className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all ${
                    revEstado === 'justificada'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-primary-950 border-primary-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <FaCheckCircle /> Justificada
                </button>
                <button
                  onClick={() => setRevEstado('injustificada')}
                  className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all ${
                    revEstado === 'injustificada'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                      : 'bg-primary-950 border-primary-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <FaTimesCircle /> Injustificada
                </button>
              </div>
              <div>
                <label className="block text-xs text-primary-400 mb-1.5">
                  Nota {revEstado === 'justificada' ? '(descanso médico, licencia, permiso escrito...) *' : '(opcional)'}
                </label>
                <textarea
                  value={revNota}
                  onChange={(e) => setRevNota(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric resize-none"
                  placeholder="Motivo o sustento de la decisión..."
                />
              </div>
              <div>
                <label className="block text-xs text-primary-400 mb-1.5">URL del sustento (Drive, opcional)</label>
                <input
                  value={revSustento}
                  onChange={(e) => setRevSustento(e.target.value)}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric"
                  placeholder="https://drive.google.com/..."
                />
              </div>
              <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
                <FaClock className="mt-0.5 shrink-0" />
                El cambio quedará registrado en el log de auditoría con tu usuario y fecha.
              </p>
              <button
                onClick={onGuardar}
                disabled={guardandoRev}
                className="w-full py-3 bg-accent-electric/20 border border-accent-electric/40 text-accent-electric font-semibold rounded-xl text-sm hover:bg-accent-electric/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardandoRev && <FaSpinner className="animate-spin" />}
                Guardar decisión
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
