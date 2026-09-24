import { FaExclamationTriangle, FaRedo } from 'react-icons/fa'

// Estado de "falló la carga" para las pantallas del admin. Regla: una carga
// fallida NUNCA se muestra como lista vacía. Apps Script a veces tarda o
// responde 404 desde su URL intermedia; si la pantalla dice "no hay
// convocatorias / no hay mensajes", el admin cree que no existen y puede
// crear duplicados. Los datos siguen en el servidor: basta reintentar.
export default function ErrorCarga({
  que,
  error,
  onReintentar,
}: {
  que: string // "las convocatorias", "los mensajes"...
  error?: string
  onReintentar: () => void
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-2xl border border-amber-500/30 bg-amber-500/5">
      <FaExclamationTriangle className="text-3xl text-amber-400 mb-3" />
      <p className="text-white font-semibold mb-1">No se pudieron cargar {que}</p>
      <p className="text-primary-300 text-sm max-w-md mb-5">
        {error ? `${error}. ` : ''}Los datos siguen guardados en el servidor; el sistema a veces tarda en responder.
      </p>
      <button
        onClick={onReintentar}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-electric text-primary-950 font-semibold text-sm hover:brightness-110 transition"
      >
        <FaRedo /> Reintentar
      </button>
    </div>
  )
}
