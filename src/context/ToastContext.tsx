import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FaCheck,
  FaExclamationCircle,
  FaInfoCircle,
  FaTimes,
  FaExclamationTriangle,
} from 'react-icons/fa'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  visible: boolean
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const AUTO_DISMISS_MS = 4000
const MAX_TOASTS = 5

const TYPE_CONFIG: Record<
  ToastType,
  { borderColor: string; iconColor: string; icon: React.ReactNode }
> = {
  success: {
    borderColor: 'border-l-green-500',
    iconColor: 'text-green-400',
    icon: <FaCheck />,
  },
  error: {
    borderColor: 'border-l-red-500',
    iconColor: 'text-red-400',
    icon: <FaExclamationCircle />,
  },
  info: {
    borderColor: 'border-l-blue-500',
    iconColor: 'text-blue-400',
    icon: <FaInfoCircle />,
  },
  warning: {
    borderColor: 'border-l-yellow-500',
    iconColor: 'text-yellow-400',
    icon: <FaExclamationTriangle />,
  },
}

const PROGRESS_COLOR: Record<ToastType, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null)

// ---------------------------------------------------------------------------
// Individual Toast
// ---------------------------------------------------------------------------

function Toast({
  toast,
  onRemove,
}: {
  toast: ToastItem
  onRemove: (id: string) => void
}) {
  const config = TYPE_CONFIG[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className={`
        relative overflow-hidden
        bg-gray-800 border border-gray-700 border-l-4 ${config.borderColor}
        rounded-lg shadow-xl
        min-w-[280px] max-w-[360px]
        flex items-start gap-3 p-4
      `}
      role="alert"
    >
      {/* Left icon */}
      <span className={`mt-0.5 shrink-0 text-base ${config.iconColor}`}>
        {config.icon}
      </span>

      {/* Message */}
      <p className="flex-1 text-sm text-white leading-snug">{toast.message}</p>

      {/* Close button */}
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-gray-400 hover:text-white transition-colors mt-0.5"
        aria-label="Cerrar notificacion"
      >
        <FaTimes className="text-sm" />
      </button>

      {/* Auto-dismiss progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-[3px] ${PROGRESS_COLOR[toast.type]}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
      />
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    // Clear any pending timer
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

      setToasts((prev) => {
        const next = [...prev, { id, message, type, visible: true }]
        // Keep only the last MAX_TOASTS
        return next.slice(-MAX_TOASTS)
      })

      // Auto-dismiss
      const timer = setTimeout(() => removeToast(id), AUTO_DISMISS_MS)
      timersRef.current.set(id, timer)
    },
    [removeToast]
  )

  const ctx: ToastContextValue = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast container — fixed bottom-right */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false} mode="sync">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onRemove={removeToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  return ctx
}
