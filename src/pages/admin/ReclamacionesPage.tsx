import { useEffect, useState } from 'react'
import { FaBook, FaReply, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'
import TableSkeleton from '../../components/common/TableSkeleton'
import ErrorCarga from '../../components/admin/ErrorCarga'
import { useToast } from '../../context/ToastContext'

// Libro de Reclamaciones (módulo "mensajes"). Plazo legal: 15 días hábiles
// improrrogables desde el registro (columna fechaLimite, calculada en el
// backend). Ver docs/LIBRO_RECLAMACIONES.md

interface Reclamo {
  id: string
  fecha: string
  estado: string
  tipo: string
  nombre: string
  tipoDocumento: string
  numeroDocumento: string
  domicilio: string
  telefono: string
  email: string
  menorEdad: string
  apoderado: string
  bien: string
  descripcionBien: string
  monto: string
  detalle: string
  pedido: string
  fechaLimite: string
  respuesta: string
  fechaRespuesta: string
  constanciaEnviada: string
}

const txt = (v: unknown) => (v === undefined || v === null ? '' : String(v))
const normalizar = (o: Record<string, unknown>): Reclamo => ({
  id: txt(o.id), fecha: txt(o.fecha), estado: txt(o.estado) || 'pendiente', tipo: txt(o.tipo),
  nombre: txt(o.nombre), tipoDocumento: txt(o.tipoDocumento), numeroDocumento: txt(o.numeroDocumento),
  domicilio: txt(o.domicilio), telefono: txt(o.telefono), email: txt(o.email), menorEdad: txt(o.menorEdad),
  apoderado: txt(o.apoderado), bien: txt(o.bien), descripcionBien: txt(o.descripcionBien), monto: txt(o.monto),
  detalle: txt(o.detalle), pedido: txt(o.pedido), fechaLimite: txt(o.fechaLimite), respuesta: txt(o.respuesta),
  fechaRespuesta: txt(o.fechaRespuesta), constanciaEnviada: txt(o.constanciaEnviada),
})

const fecha = (iso: string) => (iso ? new Date(iso).toLocaleDateString('es-PE') : '—')

// Días calendario que faltan para el vencimiento (orientativo; el plazo real
// está en días hábiles y ya viene calculado en fechaLimite).
const diasRestantes = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)

function Plazo({ r }: { r: Reclamo }) {
  if (r.estado === 'respondido') {
    return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Respondido {fecha(r.fechaRespuesta)}</span>
  }
  const d = diasRestantes(r.fechaLimite)
  const estilo = d < 0 ? 'bg-red-500/20 text-red-400' : d <= 3 ? 'bg-amber-500/20 text-amber-300' : 'bg-yellow-500/15 text-yellow-300'
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${estilo}`}>
      {d < 0 ? `Vencido hace ${-d} d` : `Vence ${fecha(r.fechaLimite)}`}
    </span>
  )
}

export default function ReclamacionesPage() {
  const toast = useToast()
  const [lista, setLista] = useState<Reclamo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [sel, setSel] = useState<Reclamo | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = async () => {
    setCargando(true)
    setError('')
    const r = await api.getReclamos()
    setCargando(false)
    if (r.success && r.data) setLista(r.data.map(normalizar))
    else setError(r.error || 'Error desconocido')
  }

  useEffect(() => { cargar() }, [])

  const responder = async () => {
    if (!sel) return
    if (respuesta.trim().length < 10) return toast.error('Escribe la respuesta al consumidor')
    if (!confirm(`Se enviará la respuesta por correo a ${sel.email}. ¿Continuar?`)) return
    setEnviando(true)
    const r = await api.responderReclamo(sel.id, respuesta.trim())
    setEnviando(false)
    if (r.success) {
      const ahora = new Date().toISOString()
      setLista((prev) => prev.map((x) => (x.id === sel.id ? { ...x, estado: 'respondido', respuesta: respuesta.trim(), fechaRespuesta: ahora } : x)))
      setSel((prev) => (prev ? { ...prev, estado: 'respondido', respuesta: respuesta.trim(), fechaRespuesta: ahora } : prev))
      setRespuesta('')
      if (r.data?.correoEnviado) toast.success('Respuesta registrada y enviada al consumidor')
      else toast.error('Respuesta registrada, pero el correo no salió: comunícate con el consumidor')
    } else {
      toast.error(r.error || 'No se pudo registrar la respuesta')
    }
  }

  const pendientes = lista.filter((r) => r.estado !== 'respondido').length
  const vencidos = lista.filter((r) => r.estado !== 'respondido' && diasRestantes(r.fechaLimite) < 0).length

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex flex-wrap items-center gap-3">
            <FaBook className="text-accent-energy" />
            Libro de Reclamaciones
            {pendientes > 0 && <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">{pendientes} por responder</span>}
            {vencidos > 0 && <span className="px-2 py-1 bg-red-500/20 text-red-400 text-sm rounded-full">{vencidos} vencidos</span>}
          </h1>
          <p className="text-primary-400">
            Plazo legal de respuesta: 15 días hábiles improrrogables. Las hojas se conservan al menos 2 años.
          </p>
        </div>

        {cargando ? (
          <TableSkeleton rows={4} />
        ) : error ? (
          <ErrorCarga que="las hojas de reclamación" error={error} onReintentar={cargar} />
        ) : lista.length === 0 ? (
          <div className="text-center py-14 border border-primary-800 rounded-2xl text-primary-400">
            <FaCheckCircle className="text-3xl text-green-400 mx-auto mb-3" />
            No hay reclamos ni quejas registrados.
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
            <ul className="space-y-2">
              {lista.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => { setSel(r); setRespuesta('') }}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${sel?.id === r.id ? 'border-accent-electric bg-accent-electric/5' : 'border-primary-800 bg-primary-900/40 hover:border-primary-600'}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-sm text-white">{r.id}</span>
                      <Plazo r={r} />
                    </div>
                    <p className="text-sm text-primary-200 truncate">
                      <b className="uppercase text-xs text-accent-energy mr-2">{r.tipo}</b>{r.nombre}
                    </p>
                    <p className="text-xs text-primary-500">{fecha(r.fecha)} · {r.descripcionBien}</p>
                  </button>
                </li>
              ))}
            </ul>

            {sel ? (
              <div className="p-5 rounded-xl border border-primary-800 bg-primary-900/40 space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-lg text-white">Hoja {sel.id}</h2>
                  <Plazo r={sel} />
                </div>
                <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-primary-200">
                  <div><dt className="text-primary-500 text-xs">Tipo</dt><dd className="uppercase">{sel.tipo}</dd></div>
                  <div><dt className="text-primary-500 text-xs">Fecha</dt><dd>{fecha(sel.fecha)}</dd></div>
                  <div><dt className="text-primary-500 text-xs">Consumidor</dt><dd>{sel.nombre}</dd></div>
                  <div><dt className="text-primary-500 text-xs">Documento</dt><dd>{sel.tipoDocumento} {sel.numeroDocumento}</dd></div>
                  <div><dt className="text-primary-500 text-xs">Correo</dt><dd>{sel.email}</dd></div>
                  <div><dt className="text-primary-500 text-xs">Teléfono</dt><dd>{sel.telefono || '—'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-primary-500 text-xs">Domicilio</dt><dd>{sel.domicilio}</dd></div>
                  {sel.menorEdad === 'si' && <div className="sm:col-span-2"><dt className="text-primary-500 text-xs">Apoderado</dt><dd>{sel.apoderado}</dd></div>}
                  <div className="sm:col-span-2"><dt className="text-primary-500 text-xs">Bien ({sel.bien})</dt><dd>{sel.descripcionBien}{sel.monto ? ` · S/ ${sel.monto}` : ''}</dd></div>
                </dl>
                <div>
                  <p className="text-primary-500 text-xs mb-1">Detalle</p>
                  <p className="text-primary-100 whitespace-pre-wrap">{sel.detalle}</p>
                </div>
                <div>
                  <p className="text-primary-500 text-xs mb-1">Pedido del consumidor</p>
                  <p className="text-primary-100 whitespace-pre-wrap">{sel.pedido}</p>
                </div>
                {sel.constanciaEnviada !== 'si' && (
                  <p className="flex items-center gap-2 text-amber-300 text-xs">
                    <FaExclamationTriangle /> La constancia no se pudo enviar al correo del consumidor: envíasela manualmente.
                  </p>
                )}

                {sel.estado === 'respondido' ? (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-green-400 text-xs mb-1">Respuesta enviada el {fecha(sel.fechaRespuesta)}</p>
                    <p className="text-primary-100 whitespace-pre-wrap">{sel.respuesta}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="resp" className="text-primary-500 text-xs">Respuesta al consumidor (se envía por correo)</label>
                    <textarea
                      id="resp"
                      rows={6}
                      value={respuesta}
                      onChange={(e) => setRespuesta(e.target.value)}
                      className="w-full p-3 rounded-lg bg-primary-950 border border-primary-700 text-white focus:outline-none focus:border-accent-electric"
                      placeholder="Indica las acciones adoptadas y la solución ofrecida…"
                    />
                    <button onClick={responder} disabled={enviando} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
                      <FaReply /> {enviando ? 'Enviando…' : 'Registrar y enviar respuesta'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex items-center justify-center rounded-xl border border-dashed border-primary-800 text-primary-500">
                Selecciona una hoja para ver el detalle y responder
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
