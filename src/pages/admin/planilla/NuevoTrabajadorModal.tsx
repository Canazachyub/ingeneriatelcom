import { motion, AnimatePresence } from 'framer-motion'
import { FaTimes, FaUserPlus, FaSpinner } from 'react-icons/fa'
import { ConfigPlanilla } from '../../../utils/planilla'

export interface NuevoTrabajadorDraft {
  dni: string
  nombre: string
  cargo: string
  sueldo: string
  fecha_inicio: string
  usa_rmv: boolean
  sede: string
  email: string
}

interface NuevoTrabajadorModalProps {
  show: boolean
  nuevoDraft: NuevoTrabajadorDraft
  setNuevoDraft: React.Dispatch<React.SetStateAction<NuevoTrabajadorDraft>>
  guardandoNuevo: boolean
  config: ConfigPlanilla
  onCerrar: () => void
  onCrear: () => void
}

export default function NuevoTrabajadorModal({
  show, nuevoDraft, setNuevoDraft, guardandoNuevo, config, onCerrar, onCrear,
}: NuevoTrabajadorModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onCerrar() }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FaUserPlus className="text-emerald-400" /> Agregar trabajador
              </h3>
              <button onClick={onCerrar} className="text-gray-400 hover:text-white p-1"><FaTimes /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-primary-400 mb-1">DNI *</label>
                <input
                  value={nuevoDraft.dni} maxLength={8}
                  onChange={(e) => setNuevoDraft((p) => ({ ...p, dni: e.target.value.replace(/\D/g, '') }))}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-accent-electric"
                />
              </div>
              <div>
                <label className="block text-xs text-primary-400 mb-1">Fecha de inicio *</label>
                <input
                  type="date" value={nuevoDraft.fecha_inicio}
                  onChange={(e) => setNuevoDraft((p) => ({ ...p, fecha_inicio: e.target.value }))}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-primary-400 mb-1">Apellidos y nombres *</label>
                <input
                  value={nuevoDraft.nombre}
                  onChange={(e) => setNuevoDraft((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Apellidos, Nombres"
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric"
                />
              </div>
              <div>
                <label className="block text-xs text-primary-400 mb-1">Cargo *</label>
                <input
                  value={nuevoDraft.cargo}
                  onChange={(e) => setNuevoDraft((p) => ({ ...p, cargo: e.target.value }))}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric"
                />
              </div>
              <div>
                <label className="block text-xs text-primary-400 mb-1">Sede</label>
                <input
                  value={nuevoDraft.sede}
                  onChange={(e) => setNuevoDraft((p) => ({ ...p, sede: e.target.value }))}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-primary-400 mb-1">Correo corporativo (opcional)</label>
                <input
                  type="email" value={nuevoDraft.email}
                  onChange={(e) => setNuevoDraft((p) => ({ ...p, email: e.target.value }))}
                  placeholder="usuario@ingenieriatelcom.com"
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric"
                />
              </div>
              <div>
                <label className="block text-xs text-primary-400 mb-1">Sueldo (S/)</label>
                <input
                  type="number" value={nuevoDraft.sueldo} disabled={nuevoDraft.usa_rmv}
                  onChange={(e) => setNuevoDraft((p) => ({ ...p, sueldo: e.target.value }))}
                  placeholder={nuevoDraft.usa_rmv ? `RMV: ${config.rmv}` : '1500'}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric disabled:opacity-50"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox" checked={nuevoDraft.usa_rmv}
                    onChange={(e) => setNuevoDraft((p) => ({ ...p, usa_rmv: e.target.checked }))}
                    className="accent-cyan-400"
                  />
                  Gana la RMV (ajuste automático)
                </label>
              </div>
            </div>
            <p className="text-[11px] text-gray-500">
              El trabajador aparecerá de inmediato en el kiosko de asistencia y en este panel.
              No se computa asistencia antes de su fecha de inicio.
            </p>
            <button
              onClick={onCrear} disabled={guardandoNuevo}
              className="w-full py-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-semibold rounded-xl text-sm hover:bg-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {guardandoNuevo && <FaSpinner className="animate-spin" />}
              Crear trabajador
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
