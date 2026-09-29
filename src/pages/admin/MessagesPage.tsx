import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FaEnvelope,
  FaPhone,
  FaSearch,
  FaCheck,
  FaClock,
  FaReply,
  FaArchive,
  FaBoxOpen,
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'
import TableSkeleton from '../../components/common/TableSkeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorCarga from '../../components/admin/ErrorCarga'
import { useToast } from '../../context/ToastContext'

interface ContactMessage {
  id: string
  nombre: string
  email: string
  telefono: string
  asunto: string
  mensaje: string
  fecha: string
  estado: string
}

// La hoja usó distintos valores de estado según la época (nuevo, en_proceso,
// pendiente, leido, respondido); la pantalla trabaja con tres + archivado.
const normalizarEstado = (e: unknown): string => {
  const v = String(e || '').toLowerCase().trim()
  if (v === 'archivado') return 'archivado'
  if (v === 'respondido') return 'respondido'
  if (v === 'leido' || v === 'leído' || v === 'en_proceso') return 'leido'
  return 'pendiente' // nuevo, pendiente o vacío
}

// La fecha real está en `createdAt` (antes se leía `fecha`, inexistente →
// "Invalid Date" en todos los mensajes).
const normalizarMensaje = (m: Record<string, unknown>): ContactMessage => ({
  id: String(m.id || ''),
  nombre: String(m.nombre || m.name || ''),
  email: String(m.email || ''),
  telefono: String(m.telefono || m.phone || ''),
  asunto: String(m.asunto || m.subject || ''),
  mensaje: String(m.mensaje || m.message || ''),
  fecha: String(m.createdAt || m.fecha || ''),
  estado: normalizarEstado(m.estado),
})

export default function MessagesPage() {
  const toast = useToast()
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Falló la carga ≠ no hay datos (ver ErrorCarga)
  const [errorCarga, setErrorCarga] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  // Archivar en vez de borrar: el mensaje se oculta y se recupera cuando quieras
  const [verArchivados, setVerArchivados] = useState(false)
  const [confirmarArchivo, setConfirmarArchivo] = useState(false)

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    setIsLoading(true)
    setErrorCarga('')
    const result = await api.getContacts()
    setIsLoading(false)

    if (result.success && result.data) {
      setMessages((result.data as unknown as Record<string, unknown>[]).map(normalizarMensaje))
    } else {
      // Antes aquí se cargaban 3 mensajes de EJEMPLO (2024) como si fueran
      // reales. Ahora se muestra el error con Reintentar.
      setMessages([])
      setErrorCarga(result.error || 'Error desconocido')
    }
  }

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.asunto.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || msg.estado === filterStatus
    const matchesArchivo = verArchivados ? msg.estado === 'archivado' : msg.estado !== 'archivado'
    return matchesSearch && matchesStatus && matchesArchivo
  })

  // Cambios de estado: antes un fallo no mostraba nada y el admin creía que
  // se había guardado. Ahora cada error se avisa con el motivo del servidor.
  const cambiarEstado = async (messageId: string, estado: 'leido' | 'respondido' | 'archivado', ok: string) => {
    const result = await api.updateContactStatus(messageId, estado)
    if (result.success) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, estado } : m)))
      setSelectedMessage((prev) => (prev && prev.id === messageId ? { ...prev, estado } : prev))
      setMessage({ type: 'success', text: ok })
    } else {
      toast.error(`No se pudo actualizar el mensaje: ${result.error || 'error desconocido'}`)
    }
  }

  const handleMarkAsRead = (messageId: string) =>
    cambiarEstado(messageId, 'leido', 'Mensaje marcado como leído')

  const handleMarkAsAnswered = (messageId: string) =>
    cambiarEstado(messageId, 'respondido', 'Mensaje marcado como respondido')

  // "Archivar" (antes Eliminar): no se borra, se recupera en "Ver archivados"
  const handleArchivar = async (messageId: string) => {
    setConfirmarArchivo(false)
    const result = await api.deleteContact(messageId) // el backend ahora archiva
    if (result.success) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, estado: 'archivado' } : m)))
      setSelectedMessage(null)
      setMessage({ type: 'success', text: 'Mensaje archivado. Lo recuperas en "Ver archivados".' })
    } else {
      toast.error(`No se pudo archivar el mensaje: ${result.error || 'error desconocido'}`)
    }
  }

  const handleRecuperar = (messageId: string) =>
    cambiarEstado(messageId, 'leido', 'Mensaje recuperado')

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pendiente: 'bg-yellow-500/20 text-yellow-400',
      leido: 'bg-blue-500/20 text-blue-400',
      respondido: 'bg-green-500/20 text-green-400',
      archivado: 'bg-slate-600/40 text-slate-300',
    }
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      leido: 'Leído',
      respondido: 'Respondido',
      archivado: 'Archivado',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (!dateStr || isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const pendingCount = messages.filter(m => m.estado === 'pendiente').length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              Mensajes de Contacto
              {pendingCount > 0 && (
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">
                  {pendingCount} pendientes
                </span>
              )}
            </h1>
            <p className="text-primary-400">Mensajes recibidos desde el formulario de contacto</p>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email o asunto..."
              className="w-full pl-10 pr-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white placeholder-primary-500 focus:outline-none focus:border-accent-electric"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-primary-800 border border-primary-700 rounded-lg text-white focus:outline-none focus:border-accent-electric"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="leido">Leido</option>
            <option value="respondido">Respondido</option>
          </select>
          <button
            onClick={() => { setVerArchivados(!verArchivados); setSelectedMessage(null) }}
            className={`px-4 py-2 rounded-lg border text-sm inline-flex items-center gap-2 ${verArchivados ? 'bg-slate-700 border-slate-400 text-white' : 'border-primary-700 text-primary-300 hover:text-white'}`}
          >
            <FaArchive /> {verArchivados ? 'Ocultar archivados' : 'Ver archivados'}
          </button>
        </div>

        {/* Messages List and Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="space-y-3">
            {isLoading ? (
              <TableSkeleton rows={4} cols={2} />
            ) : errorCarga ? (
              <ErrorCarga que="los mensajes" error={errorCarga} onReintentar={loadMessages} />
            ) : filteredMessages.length === 0 ? (
              messages.length === 0 ? (
                <EmptyState
                  icon={<FaEnvelope />}
                  title="Sin mensajes de contacto"
                  hint="Los mensajes del formulario publico apareceran aqui"
                />
              ) : (
                <EmptyState
                  icon={<FaSearch />}
                  title="No se encontraron mensajes"
                  hint="Intenta limpiar los filtros o modificar el termino de busqueda"
                />
              )
            ) : (
              filteredMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => { setSelectedMessage(msg); setConfirmarArchivo(false) }}
                  className={`bg-primary-900/50 backdrop-blur-sm rounded-xl border p-4 cursor-pointer transition-all ${
                    selectedMessage?.id === msg.id
                      ? 'border-accent-electric'
                      : 'border-primary-800 hover:border-primary-700'
                  } ${msg.estado === 'pendiente' ? 'border-l-4 border-l-yellow-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">{msg.nombre}</h3>
                        {getStatusBadge(msg.estado)}
                      </div>
                      <p className="text-accent-electric text-sm truncate">{msg.asunto}</p>
                      <p className="text-primary-400 text-sm mt-1 line-clamp-2">{msg.mensaje}</p>
                      <p className="text-primary-500 text-xs mt-2">{formatDate(msg.fecha)}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Message Detail */}
          <div className="lg:sticky lg:top-20">
            {selectedMessage ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedMessage.nombre}</h2>
                    <p className="text-primary-400 text-sm">{formatDate(selectedMessage.fecha)}</p>
                  </div>
                  {getStatusBadge(selectedMessage.estado)}
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 text-sm">
                    <FaEnvelope className="text-accent-electric" />
                    <a
                      href={`mailto:${selectedMessage.email}`}
                      className="text-primary-200 hover:text-accent-electric transition-colors"
                    >
                      {selectedMessage.email}
                    </a>
                  </div>
                  {selectedMessage.telefono && (
                    <div className="flex items-center gap-3 text-sm">
                      <FaPhone className="text-accent-electric" />
                      <a
                        href={`tel:${selectedMessage.telefono}`}
                        className="text-primary-200 hover:text-accent-electric transition-colors"
                      >
                        {selectedMessage.telefono}
                      </a>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-primary-300 mb-2">Asunto</h3>
                  <p className="text-white">{selectedMessage.asunto}</p>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-primary-300 mb-2">Mensaje</h3>
                  <p className="text-primary-200 whitespace-pre-wrap">{selectedMessage.mensaje}</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-primary-800">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.asunto}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent-electric text-white rounded-lg hover:bg-accent-electric/90 transition-colors"
                  >
                    <FaReply />
                    Responder
                  </a>
                  {selectedMessage.estado === 'archivado' && (
                    <button
                      onClick={() => handleRecuperar(selectedMessage.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <FaBoxOpen />
                      Recuperar
                    </button>
                  )}
                  {selectedMessage.estado === 'pendiente' && (
                    <button
                      onClick={() => handleMarkAsRead(selectedMessage.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <FaClock />
                      Marcar Leido
                    </button>
                  )}
                  {selectedMessage.estado !== 'respondido' && selectedMessage.estado !== 'archivado' && (
                    <button
                      onClick={() => handleMarkAsAnswered(selectedMessage.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <FaCheck />
                      Respondido
                    </button>
                  )}
                  {selectedMessage.estado !== 'archivado' && (
                    <button
                      onClick={() => setConfirmarArchivo(!confirmarArchivo)}
                      title="Archivar"
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-600/30 text-slate-200 rounded-lg hover:bg-slate-600/50 transition-colors"
                    >
                      <FaArchive />
                    </button>
                  )}
                </div>
                {confirmarArchivo && selectedMessage.estado !== 'archivado' && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-800 border border-slate-500 text-sm text-slate-200 flex flex-wrap items-center gap-3">
                    <span className="flex-1">¿Archivar el mensaje de {selectedMessage.nombre}? Se oculta de la lista; no se borra y lo recuperas en "Ver archivados".</span>
                    <button onClick={() => setConfirmarArchivo(false)} className="px-3 py-1.5 rounded border border-primary-600 text-primary-200">Cancelar</button>
                    <button onClick={() => handleArchivar(selectedMessage.id)} className="px-3 py-1.5 rounded bg-accent-electric text-white font-semibold">Sí, archivar</button>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-primary-900/50 backdrop-blur-sm rounded-xl border border-primary-800 p-12 text-center">
                <FaEnvelope className="text-4xl text-primary-600 mx-auto mb-4" />
                <p className="text-primary-400">Selecciona un mensaje para ver los detalles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
