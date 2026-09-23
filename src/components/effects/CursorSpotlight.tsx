import { useEffect, useRef } from 'react'
import { useFinePointer } from '../../hooks/useFinePointer'

// Halo cian que sigue al cursor por toda la landing, como el foco de un
// escáner. Mueve una sola capa por transform (sin re-render de React) y solo
// existe con mouse; en táctil no se monta.
export default function CursorSpotlight() {
  const activo = useFinePointer()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activo) return
    const el = ref.current
    if (!el) return
    let raf = 0
    let x = window.innerWidth / 2
    let y = window.innerHeight / 3
    let tx = x
    let ty = y

    const onMove = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      el.style.opacity = '1'
    }
    const onLeave = () => { el.style.opacity = '0' }
    const bucle = () => {
      // Interpolación: el halo "persigue" al cursor con algo de inercia
      x += (tx - x) * 0.15
      y += (ty - y) * 0.15
      el.style.transform = `translate3d(${x - 300}px, ${y - 300}px, 0)`
      raf = requestAnimationFrame(bucle)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(bucle)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [activo])

  if (!activo) return null
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[5] w-[600px] h-[600px] rounded-full opacity-0 transition-opacity duration-500 mix-blend-screen"
      style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.10) 0%, rgba(0,212,255,0.04) 35%, transparent 70%)' }}
    />
  )
}
