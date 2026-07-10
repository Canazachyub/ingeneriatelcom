import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}

/**
 * Estado vacío con guía para el panel admin.
 * Uso: cuando una lista/tabla no tiene resultados (sin datos o sin coincidencias de filtro).
 */
export default function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-primary-700 rounded-2xl bg-primary-900/40">
      {icon && (
        <div className="text-5xl text-primary-600 mb-4">
          {icon}
        </div>
      )}
      <p className="text-white font-semibold text-lg">{title}</p>
      {hint && (
        <p className="text-primary-400 text-sm mt-2 max-w-sm">{hint}</p>
      )}
      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  )
}
