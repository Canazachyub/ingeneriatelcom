import { ReactNode } from 'react'

// Marco táctico estilo consola de mando: esquinas en L, sin cerrar el borde.
// Envuelve cualquier bloque; las esquinas se iluminan con el hover del padre
// si éste tiene la clase `group`.
export default function HudFrame({
  children,
  className = '',
  color = 'border-accent-electric/60',
  size = 'w-4 h-4',
}: {
  children: ReactNode
  className?: string
  color?: string
  size?: string
}) {
  const base = `pointer-events-none absolute ${size} ${color} transition-all duration-300 group-hover:border-accent-electric`
  return (
    <div className={`relative ${className}`}>
      <span aria-hidden="true" className={`${base} top-0 left-0 border-t-2 border-l-2`} />
      <span aria-hidden="true" className={`${base} top-0 right-0 border-t-2 border-r-2`} />
      <span aria-hidden="true" className={`${base} bottom-0 left-0 border-b-2 border-l-2`} />
      <span aria-hidden="true" className={`${base} bottom-0 right-0 border-b-2 border-r-2`} />
      {children}
    </div>
  )
}
