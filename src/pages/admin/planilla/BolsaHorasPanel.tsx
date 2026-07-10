import { motion, AnimatePresence } from 'framer-motion'
import { FaSpinner } from 'react-icons/fa'
import { SueldoTrabajador } from '../../../utils/planilla'

interface BolsaHorasPanelProps {
  modal5pm: SueldoTrabajador | null
  fecha5pm: string
  setFecha5pm: (fecha: string) => void
  nota5pm: string
  setNota5pm: (nota: string) => void
  onCerrar5pm: () => void
  onAutorizar5pm: () => void

  modalMuestreo: SueldoTrabajador | null
  bolsaSaldos: Record<string, number>
  horasMuestreo: string
  setHorasMuestreo: (horas: string) => void
  notaMuestreo: string
  setNotaMuestreo: (nota: string) => void
  onCerrarMuestreo: () => void
  onMuestreo: () => void

  guardandoBolsa: boolean
}

export default function BolsaHorasPanel({
  modal5pm, fecha5pm, setFecha5pm, nota5pm, setNota5pm, onCerrar5pm, onAutorizar5pm,
  modalMuestreo, bolsaSaldos, horasMuestreo, setHorasMuestreo, notaMuestreo, setNotaMuestreo,
  onCerrarMuestreo, onMuestreo, guardandoBolsa,
}: BolsaHorasPanelProps) {
  return (
    <>
      {/* ── Modal autorizar salida 5pm ── */}
      <AnimatePresence>
        {modal5pm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) onCerrar5pm() }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4"
            >
              <div>
                <h3 className="font-bold text-white text-sm">Autorizar salida 5:00 p.m.</h3>
                <p className="text-xs text-gray-500 mt-0.5">{modal5pm.nombre}</p>
              </div>
              <div>
                <label className="block text-xs text-primary-400 mb-1.5">Fecha</label>
                <input
                  type="date" value={fecha5pm} onChange={(e) => setFecha5pm(e.target.value)}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white focus:outline-none focus:border-accent-electric"
                />
              </div>
              <div>
                <label className="block text-xs text-primary-400 mb-1.5">Nota (verificación de avances)</label>
                <textarea
                  value={nota5pm} onChange={(e) => setNota5pm(e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric resize-none"
                  placeholder="Avances verificados por..."
                />
              </div>
              <p className="text-[11px] text-gray-500">
                La salida autorizada no genera descuento: la hora no laborada se acredita a la
                bolsa por compensar (muestreo trimestral ELSE). No genera sobretiempo ni pago extra.
              </p>
              <div className="flex gap-2">
                <button onClick={onCerrar5pm} className="flex-1 py-2.5 text-sm text-primary-400 hover:text-white border border-primary-800 rounded-xl">
                  Cancelar
                </button>
                <button
                  onClick={onAutorizar5pm} disabled={guardandoBolsa}
                  className="flex-1 py-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-semibold rounded-xl text-sm hover:bg-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {guardandoBolsa && <FaSpinner className="animate-spin" />}
                  Autorizar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal muestreo ELSE (descarga de bolsa) ── */}
      <AnimatePresence>
        {modalMuestreo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) onCerrarMuestreo() }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4"
            >
              <div>
                <h3 className="font-bold text-white text-sm">Registrar muestreo ELSE</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modalMuestreo.nombre} · saldo en bolsa: <strong className="text-accent-electric">{(bolsaSaldos[modalMuestreo.dni] || 0).toFixed(2)}h</strong>
                </p>
              </div>
              <div>
                <label className="block text-xs text-primary-400 mb-1.5">Horas de muestreo trabajadas</label>
                <input
                  type="number" min={0.5} step={0.5} value={horasMuestreo}
                  onChange={(e) => setHorasMuestreo(e.target.value)}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white text-center font-bold focus:outline-none focus:border-accent-electric"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs text-primary-400 mb-1.5">Nota</label>
                <input
                  value={notaMuestreo} onChange={(e) => setNotaMuestreo(e.target.value)}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric"
                  placeholder="Muestreo trimestral ELSE"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                La descarga se limita al saldo disponible: no genera sobretiempo ni pago extra.
              </p>
              <div className="flex gap-2">
                <button onClick={onCerrarMuestreo} className="flex-1 py-2.5 text-sm text-primary-400 hover:text-white border border-primary-800 rounded-xl">
                  Cancelar
                </button>
                <button
                  onClick={onMuestreo} disabled={guardandoBolsa}
                  className="flex-1 py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 font-semibold rounded-xl text-sm hover:bg-amber-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {guardandoBolsa && <FaSpinner className="animate-spin" />}
                  Descargar bolsa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
