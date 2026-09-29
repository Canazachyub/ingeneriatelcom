import { useState, useEffect } from 'react'
import { FaCalendarTimes, FaPlus, FaTrash, FaDownload } from 'react-icons/fa'
import { api } from '../../../api/appScriptApi'
import { useToast } from '../../../context/ToastContext'

interface Feriado {
  fecha: string
  descripcion: string
}

// Feriados / días no laborables: esos días no generan falta ni omisión en
// planilla y el informe de asistencias los marca como no laborables.
export default function FeriadosPanel() {
  const toast = useToast()
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [cargando, setCargando] = useState(true)
  const [fecha, setFecha] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [sembrando, setSembrando] = useState(false)
  // Confirmaciones en pantalla: qué acción espera un "sí"
  const [confirmar, setConfirmar] = useState<null | { tipo: 'agregar' } | { tipo: 'sembrar' } | { tipo: 'eliminar'; feriado: Feriado }>(null)

  const cargar = async () => {
    setCargando(true)
    const res = await api.getFeriados()
    if (res.success && res.data) {
      setFeriados([...res.data].sort((a, b) => a.fecha.localeCompare(b.fecha)))
    }
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  // Primer clic: valida y pide confirmación; el "sí" llama a agregar()
  const pedirAgregar = () => {
    if (!fecha || !descripcion.trim()) {
      toast.error('Completa la fecha y la descripción')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { toast.error('Fecha inválida'); return }
    if (feriados.some((f) => f.fecha === fecha)) { toast.error('Esa fecha ya está registrada como feriado'); return }
    setConfirmar({ tipo: 'agregar' })
  }

  const agregar = async () => {
    setConfirmar(null)
    setGuardando(true)
    const res = await api.agregarFeriado({ fecha, descripcion: descripcion.trim() })
    setGuardando(false)
    if (res.success && res.data) {
      setFeriados([...res.data].sort((a, b) => a.fecha.localeCompare(b.fecha)))
      setFecha('')
      setDescripcion('')
      toast.success('Feriado agregado')
    } else {
      toast.error(res.error || 'No se pudo agregar')
    }
  }

  const eliminar = async (f: Feriado) => {
    setConfirmar(null)
    const res = await api.eliminarFeriado(f.fecha)
    if (res.success && res.data) {
      setFeriados([...res.data].sort((a, b) => a.fecha.localeCompare(b.fecha)))
      toast.success(`Eliminado: ${f.fecha} (${f.descripcion})`)
    } else {
      toast.error(res.error || 'No se pudo eliminar')
    }
  }

  const sembrar = async () => {
    setConfirmar(null)
    setSembrando(true)
    const res = await api.sembrarFeriadosPeru2026()
    setSembrando(false)
    if (res.success && res.data) {
      setFeriados([...res.data].sort((a, b) => a.fecha.localeCompare(b.fecha)))
      toast.success(res.message || 'Feriados de Perú 2026 cargados')
    } else {
      toast.error(res.error || 'No se pudo cargar la lista')
    }
  }

  return (
    <div className="bg-primary-900/60 border border-primary-800 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FaCalendarTimes className="text-accent-energy" />
            Feriados y días no laborables
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Estos días no cuentan como falta ni generan incidencias en la planilla.
          </p>
        </div>
        <button
          onClick={() => setConfirmar({ tipo: 'sembrar' })}
          disabled={sembrando}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-electric/15 border border-accent-electric/40 text-accent-electric rounded-lg text-xs font-medium hover:bg-accent-electric/25 transition-colors disabled:opacity-50 self-start"
        >
          <FaDownload className="text-[10px]" />
          {sembrando ? 'Cargando…' : 'Cargar feriados Perú 2026'}
        </button>
      </div>

      {/* Agregar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="px-3 py-2 bg-primary-950 border border-primary-800 rounded-lg text-sm text-white focus:outline-none focus:border-accent-electric"
        />
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción (ej. Día de la Independencia)"
          className="flex-1 px-3 py-2 bg-primary-950 border border-primary-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-electric"
        />
        <button
          onClick={pedirAgregar}
          disabled={guardando}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent-energy/15 border border-accent-energy/40 text-accent-energy rounded-lg text-sm font-medium hover:bg-accent-energy/25 transition-colors disabled:opacity-50"
        >
          <FaPlus className="text-xs" />
          {guardando ? 'Guardando…' : 'Agregar'}
        </button>
      </div>

      {/* Confirmación */}
      {confirmar && (
        <div className="mb-4 p-3 rounded-xl border border-amber-500/50 bg-amber-500/10 text-xs text-amber-100">
          {confirmar.tipo === 'agregar' && <>
            <p className="font-semibold">¿Registrar {fecha.slice(8)}/{fecha.slice(5, 7)}/{fecha.slice(0, 4)} ({descripcion.trim()}) como no laborable?</p>
            <p className="mt-1">Ese día nadie tendrá falta. Las incidencias <b>pendientes</b> (faltas y omisiones sin revisar) de esa fecha se eliminan. Lo ya revisado no se toca.</p>
          </>}
          {confirmar.tipo === 'sembrar' && <>
            <p className="font-semibold">¿Cargar los feriados nacionales de Perú 2026?</p>
            <p className="mt-1">Se agregan los que falten (no duplica). Las incidencias <b>pendientes</b> de esos días se eliminan; lo ya revisado no se toca.</p>
          </>}
          {confirmar.tipo === 'eliminar' && <>
            <p className="font-semibold">¿Quitar el feriado {confirmar.feriado.fecha.slice(8)}/{confirmar.feriado.fecha.slice(5, 7)} ({confirmar.feriado.descripcion})?</p>
            <p className="mt-1">Ese día vuelve a ser laborable: al sincronizar, quienes no marcaron tendrán falta.</p>
          </>}
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setConfirmar(null)} className="px-3 py-1.5 text-primary-300 hover:text-white">Cancelar</button>
            <button
              onClick={() => confirmar.tipo === 'agregar' ? agregar() : confirmar.tipo === 'sembrar' ? sembrar() : eliminar(confirmar.feriado)}
              className="px-3 py-1.5 bg-amber-500 text-[#111827] rounded-lg font-bold"
            >
              {confirmar.tipo === 'eliminar' ? 'Sí, quitar' : 'Sí, continuar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <p className="text-xs text-gray-500">Cargando…</p>
      ) : feriados.length === 0 ? (
        <p className="text-xs text-gray-500">
          No hay feriados registrados. Agrega uno arriba o usa el botón de carga automática.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {feriados.map((f) => (
            <span
              key={f.fecha}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-950 border border-primary-800 text-xs text-gray-300"
              title={f.descripcion}
            >
              <span className="font-mono text-accent-electric">{f.fecha.slice(8)}/{f.fecha.slice(5, 7)}</span>
              {f.descripcion}
              <button
                onClick={() => setConfirmar({ tipo: 'eliminar', feriado: f })}
                className="text-gray-600 hover:text-rose-400 transition-colors"
                title="Eliminar feriado"
              >
                <FaTrash className="text-[10px]" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
