import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FaEnvelope,
  FaPhone,
  FaSearch,
  FaSpinner,
  FaCheck,
  FaClock,
  FaReply,
  FaTrash,
} from 'react-icons/fa'
import { api } from '../../api/appScriptApi'
import AdminLayout from '../../components/admin/AdminLayout'

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

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    setIsLoading(true)
    const result = await api.getContacts()
    setIsLoading(false)

    if (result.success && result.data) {
      setMessages(result.data as ContactMessage[])
    } else {
      // Mock data
      setMessages([
        {
          id: '1',
          nombre: 'Carlos Rodriguez',
          email: 'carlos.rodriguez@empresa.com',
          telefono: '+51 987 654 321',
          asunto: 'Consulta sobre servicios de software',
          mensaje: 'Buenas tardes, estoy interesado en conocer mas sobre sus servicios de desarrollo de software. Tenemos un proyecto de gestion de inventarios que nos gustaria implementar. Podrian enviarme informacion sobre costos y tiempos de desarrollo?',
          fecha: '2024-01-11T10:30:00',
          estado: 'pendiente',
        },
        {
          id: '2',
          nombre: 'Ana Maria Torres',
          email: 'ana.torres@minera.pe',
          telefono: '+51 956 123 456',
          asunto: 'Cotizacion proyecto minero',
          mensaje: 'Estimados, somos una empresa minera ubicada en Puno y necesitamos supervision de obras electricas. Quisiera agendar una reunion para discutir los detalles del proyecto.',
          fecha: '2024-01-10T15:45:00',
          estado: 'respondido',
        },
        {
          id: '3',
          nombre: 'Luis Fernandez',
          email: 'lfernandez@gmail.com',
          telefono: '',
          asunto: 'Consulta general',
          mensaje: 'Hola, vi su pagina web y me gustaria saber si realizan trabajos en la ciudad de Arequipa. Gracias.',
          fecha: '2024-01-09T09:15:00',
          estado: 'pendiente',
        },
      ])
    }
  }

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.asunto.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || msg.estado === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleMarkAsRead = async (messageId: string) => {
    const result = await api.updateContactStatus(messageId, 'leido')
    if (result.success) {
      setMessages(messages.map(m => m.id === messageId ? { ...m, estado: 'leido' } : m))
      setMessage({ type: 'success', text: 'Mensaje marcado como leido' })
    }
  }

  const handleMarkAsAnswered = async (messageId: string) => {
    const result = await api.updateContactStatus(messageId, 'respondido')
    if (result.success) {
      setMessages(messages.map(m => m.id === messageId ? { ...m, estado: 'respondido' } : m))
      setMessage({ type: 'success', text: 'Mensaje marcado como respondido' })
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!confirm('Eliminar este mensaje?')) return

    const result = await api.deleteContact(messageId)
    if (result.success) {
      setMessages(messages.filter(m => m.id !== messageId))
      setSelectedMessage(null)
      setMessage({ type: 'success', text: 'Mensaje eliminado' })
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pendiente: 'bg-yellow-500/20 text-yellow-400',
      leido: 'bg-blue-500/20 text-blue-400',
      respondido: 'bg-green-500/20 text-green-400',
    }
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      leido: 'Leido',
      respondido: 'Respondido',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
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
        </div>

        {/* Messages List and Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <FaSpinner className="animate-spin text-3xl text-accent-electric" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-primary-400">
                No se encontraron mensajes
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedMessage(msg)}
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
                  {selectedMessage.estado === 'pendiente' && (
                    <button
                      onClick={() => handleMarkAsRead(selectedMessage.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <FaClock />
                      Marcar Leido
                    </button>
                  )}
                  {selectedMessage.estado !== 'respondido' && (
                    <button
                      onClick={() => handleMarkAsAnswered(selectedMessage.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <FaCheck />
                      Respondido
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selectedMessage.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <FaTrash />
                  </button>
                </div>
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
