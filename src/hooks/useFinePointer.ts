import { useEffect, useState } from 'react'

// true solo con mouse/trackpad (pointer: fine) y sin prefers-reduced-motion.
// Los efectos que siguen al cursor se apagan en táctil: allí no hay cursor que
// seguir y solo gastarían batería en los teléfonos de los trabajadores.
const QUERY = '(pointer: fine) and (prefers-reduced-motion: no-preference)'

export function useFinePointer(): boolean {
  const [activo, setActivo] = useState(() =>
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches
  )

  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia(QUERY)
    const onChange = () => setActivo(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  return activo
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
