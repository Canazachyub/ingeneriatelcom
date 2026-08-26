import { motion, AnimatePresence } from 'framer-motion'
import { FaSpinner, FaExclamationTriangle } from 'react-icons/fa'
import { SueldoTrabajador } from '../../../utils/planilla'

interface BajaTrabajadorModalProps {
  trabajador: SueldoTrabajador | null
  fechaFin: string
  setFechaFin: (fecha: string) => void
  guardando: boolean
  onCerrar: () => void
  onConfirmar: () => void
}

export default function BajaTrabajadorModal({
  trabajador, fechaFin, setFechaFin, guardando, onCerrar, onConfirmar,
}: BajaTrabajadorModalProps) {
  return (
    <AnimatePresence>
      {trabajador && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onCerrar() }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4"
          >
            <div>
              <h3 className="text-lg font-bold text-white">Dar de baja</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                {trabajador.nombre} · DNI {trabajador.dni}
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5" htmlFor="baja-fecha-fin">
                Último día laborado
              </label>
              <input
                id="baja-fecha-fin"
                type="date"
                value={fechaFin}
                min={trabajador.fecha_inicio || undefined}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 bg-primary-950 border border-primary-700 rounded-lg text-white text-sm focus:border-accent-electric outline-none"
              />
              {trabajador.fecha_inicio && (
                <p className="text-[11px] text-gray-600 mt-1">Ingresó el {trabajador.fecha_inicio}</p>
              )}
            </div>

            <div className="flex gap-2 text-[11px] text-gray-400 bg-primary-950/60 border border-primary-800 rounded-lg p-3 leading-relaxed">
              <FaExclamationTriangle className="text-amber-400 shrink-0 mt-0.5" />
              <p>
                No se borra nada: sus asistencias, incidencias y planillas de meses cerrados
                se conservan. Desde el día siguiente al cese desaparece del kiosko y deja de
                generar faltas y tardanzas. Las incidencias <strong>pendientes</strong>
                {' '}posteriores a esa fecha se eliminan por ser faltas fantasma.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onCerrar}
                className="flex-1 px-4 py-2 bg-primary-800 text-gray-300 rounded-lg text-sm hover:bg-primary-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirmar}
                disabled={guardando || !fechaFin}
                className="flex-1 px-4 py-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-lg text-sm font-medium hover:bg-rose-500/30 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                {guardando ? <FaSpinner className="animate-spin text-xs" /> : null}
                Confirmar baja
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
