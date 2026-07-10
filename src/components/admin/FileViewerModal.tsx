import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaSpinner, FaTimes, FaDownload, FaExclamationTriangle, FaRedo } from 'react-icons/fa'
import { api } from '../../api/appScriptApi'

interface FileViewerModalProps {
  fileUrl: string
  title: string
  onClose: () => void
}

// Visor de archivos privados de Drive (fotos de asistencia/proctoring,
// justificaciones). Descarga el binario via getArchivo (nivel auth) en vez
// de enlazar directo a Drive — los archivos ya no son ANYONE_WITH_LINK (C6).
export default function FileViewerModal({ fileUrl, title, onClose }: FileViewerModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dataUri, setDataUri] = useState('')
  const [blobUrl, setBlobUrl] = useState('')
  const [mimeType, setMimeType] = useState('')
  const [fileName, setFileName] = useState('')
  const blobUrlRef = useRef('')

  const cargar = async () => {
    setLoading(true)
    setError('')
    const res = await api.getArchivo(fileUrl)
    if (!res.success || !res.data) {
      setError(res.error || 'No se pudo cargar el archivo')
      setLoading(false)
      return
    }

    const { base64, mimeType: mt, fileName: fn } = res.data
    setMimeType(mt)
    setFileName(fn)

    if (mt === 'application/pdf') {
      // Blob URL: mas eficiente que un data: URI gigante dentro de un iframe
      const bytes = atob(base64)
      const arr = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
      const blob = new Blob([arr], { type: mt })
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      setBlobUrl(url)
    } else {
      setDataUri(`data:${mt};base64,${base64}`)
    }
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl])

  const descargar = () => {
    const href = blobUrl || dataUri
    if (!href) return
    const a = document.createElement('a')
    a.href = href
    a.download = fileName || 'archivo'
    a.click()
  }

  const esImagen = mimeType.startsWith('image/')
  const esPdf = mimeType === 'application/pdf'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-primary-900 border border-primary-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-primary-800 shrink-0">
            <p className="font-semibold text-white text-sm truncate pr-3">{title}</p>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-primary-800 rounded-lg transition-colors shrink-0"
            >
              <FaTimes />
            </button>
          </div>

          <div className="bg-black flex-1 min-h-[300px] flex items-center justify-center overflow-auto">
            {loading && (
              <FaSpinner className="animate-spin text-3xl text-accent-electric" />
            )}

            {!loading && error && (
              <div className="text-center py-10 px-6">
                <FaExclamationTriangle className="text-3xl text-amber-400 mx-auto mb-3" />
                <p className="text-gray-300 text-sm mb-4">{error}</p>
                <button
                  onClick={cargar}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent-electric/20 border border-accent-electric/40 text-accent-electric rounded-lg text-sm font-medium hover:bg-accent-electric/30 transition-colors"
                >
                  <FaRedo className="text-xs" />
                  Reintentar
                </button>
              </div>
            )}

            {!loading && !error && esImagen && dataUri && (
              <img
                src={dataUri}
                alt={title}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}

            {!loading && !error && esPdf && blobUrl && (
              <iframe
                src={blobUrl}
                title={title}
                className="w-full h-[70vh] bg-white"
              />
            )}

            {!loading && !error && !esImagen && !esPdf && (
              <div className="text-center py-10 px-6">
                <p className="text-gray-400 text-sm">Tipo de archivo no soportado para vista previa ({mimeType || 'desconocido'})</p>
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-primary-800 flex items-center justify-end shrink-0">
            <button
              onClick={descargar}
              disabled={loading || !!error || (!dataUri && !blobUrl)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-800 border border-primary-700 text-gray-200 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FaDownload className="text-xs" />
              Descargar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
