import { ReactNode, useRef } from 'react'
import { useFinePointer } from '../../hooks/useFinePointer'

// Tarjeta con tilt 3D y reflejo de luz que sigue al mouse (CSS puro).
// En táctil o con prefers-reduced-motion no se registra ningún listener.
export default function TiltCard({
  children,
  max = 7,
  className = 'h-full',
}: {
  children: ReactNode
  max?: number
  className?: string
}) {
  const activo = useFinePointer()
  const ref = useRef<HTMLDivElement | null>(null)
  const brilloRef = useRef<HTMLDivElement | null>(null)

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateY(${(px * max).toFixed(2)}deg) rotateX(${(-py * max).toFixed(2)}deg) translateY(-3px)`
    if (brilloRef.current) {
      brilloRef.current.style.opacity = '1'
      brilloRef.current.style.background =
        `radial-gradient(circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, rgba(0,212,255,0.18), transparent 55%)`
    }
  }
  const onMouseLeave = () => {
    if (ref.current) ref.current.style.transform = ''
    if (brilloRef.current) brilloRef.current.style.opacity = '0'
  }

  return (
    <div
      ref={ref}
      onMouseMove={activo ? onMouseMove : undefined}
      onMouseLeave={activo ? onMouseLeave : undefined}
      className={`relative transition-transform duration-200 ease-out will-change-transform ${className}`}
    >
      {children}
      {activo && (
        <div
          ref={brilloRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 mix-blend-screen"
        />
      )}
    </div>
  )
}
